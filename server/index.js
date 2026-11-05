import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import fs from 'fs';

// AI Routers
import aiOcrRouter from './routes/aiOcr.js';
import aiVoiceRouter from './routes/aiVoice.js';
import aiChatRouter from './routes/aiChat.js';
import aiAuditRouter from './routes/aiAudit.js';

// Models
import User from './models/User.js';
import Journey from './models/Journey.js';
import Train from './models/Train.js';
import Division from './models/Division.js';
import AllowanceRule from './models/AllowanceRule.js';
import Subscription from './models/Subscription.js';
import AuditLog from './models/AuditLog.js';
import ReportHistory from './models/ReportHistory.js';
import JourneyTemplate from './models/JourneyTemplate.js';

import crypto from 'crypto';
import { JWT_SECRET } from './config/jwt.js';
import { authenticateToken } from './middleware/auth.js';
import emailService from './services/emailService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
connectDB();

import {
  calculateNightDutyHours,
  calculateTA,
  calculateNDA,
  parseAsIST
} from './utils/calculations.js';



// Middleware: Require Admin
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Access denied: Administrators only' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper: Log Action
const logAction = async (userId, action, details, ip) => {
  try {
    await AuditLog.create({
      userId,
      action,
      details,
      ipAddress: ip || 'internal'
    });
  } catch (err) {
    console.error('Audit logging failed:', err);
  }
};

// ======================== AUTH ROUTES ========================

// Register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role, division } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    // Validate role
    const validRoles = ['TTE', 'TC', 'Guard', 'Loco Pilot', 'Assistant Loco Pilot', 'Station Master', 'Commercial Inspector', 'Chief Ticket Inspector', 'Railway Supervisor'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid employee role specified' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      division,
      subscriptionTier: 'Free',
      subscriptionStatus: 'None'
    });

    const token = jwt.sign({ id: user._id, role: user.role, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '30d' });
    await logAction(user._id, 'USER_REGISTER', `Created user account with role ${role}`, req.ip);

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, division: user.division, isAdmin: user.isAdmin, subscriptionTier: user.subscriptionTier, subscriptionStatus: user.subscriptionStatus }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '30d' });
    await logAction(user._id, 'USER_LOGIN', 'Logged into RailAssist', req.ip);

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, division: user.division, isAdmin: user.isAdmin, subscriptionTier: user.subscriptionTier, subscriptionStatus: user.subscriptionStatus }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Profile & Password Update
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.name = req.body.name || user.name;
    user.division = req.body.division || user.division;

    if (req.body.password) {
      user.password = req.body.password;
    }

    await user.save();
    await logAction(user._id, 'USER_PROFILE_UPDATE', 'Updated profile details', req.ip);

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      division: user.division,
      isAdmin: user.isAdmin,
      subscriptionTier: user.subscriptionTier,
      subscriptionStatus: user.subscriptionStatus
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ======================== SECURE PASSWORD RECOVERY FLOW ========================

// Step 1: Request Password Recovery Link
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ message: 'A valid email address is required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const genericSuccessMessage = 'If an account associated with that email exists, password reset instructions have been dispatched.';

  try {
    const user = await User.findOne({ email: normalizedEmail });

    // Defensive: Return generic response if user not found to prevent user enumeration
    if (!user) {
      return res.json({
        message: genericSuccessMessage,
        emailDeliveryConfigured: emailService.isConfigured()
      });
    }

    // Generate cryptographically random 32-byte token and hash for DB
    const resetToken = user.getResetPasswordToken();
    await user.save();

    // Determine client URL origin
    const clientOrigin = req.headers.origin || req.headers.referer || 'http://localhost:5173';
    const cleanOrigin = clientOrigin.replace(/\/$/, '');
    const resetUrl = `${cleanOrigin}/forgot-password?token=${resetToken}`;

    const sendResult = await emailService.sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
      resetToken
    });

    await logAction(
      user._id,
      'PASSWORD_RESET_REQUESTED',
      `Password reset token issued for ${user.email} (valid 15m) from IP: ${req.ip}`,
      req.ip
    );

    const responsePayload = {
      message: genericSuccessMessage,
      emailDeliveryConfigured: sendResult.delivered
    };

    // If email delivery is not configured, supply devResetUrl in non-production for local verification
    if (!sendResult.delivered && process.env.NODE_ENV !== 'production') {
      responsePayload.devResetUrl = resetUrl;
      responsePayload.devToken = resetToken;
    }

    res.json(responsePayload);
  } catch (error) {
    console.error('[AUTH ERROR] Forgot password processing failed:', error);
    res.status(500).json({ message: 'Internal error processing password recovery request.' });
  }
});

// Step 2: Verify Token and Set New Password
const handlePasswordReset = async (req, res) => {
  const token = req.params.token || req.body.token;
  const { newPassword } = req.body;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ message: 'Password reset token is missing or invalid.' });
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
  }

  try {
    // Hash incoming token with SHA-256 to compare against database
    const hashedToken = crypto
      .createHash('sha256')
      .update(token.trim())
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    }).select('+password +resetPasswordToken +resetPasswordExpire');

    if (!user) {
      return res.status(400).json({
        message: 'Password reset token is invalid, expired, or has already been used.'
      });
    }

    // Set new password (pre-save hook will hash it with bcrypt)
    user.password = newPassword;

    // Invalidate reset token immediately to prevent replay attacks
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    await logAction(
      user._id,
      'PASSWORD_RESET_SUCCESS',
      `Password successfully reset using verified token from IP: ${req.ip}`,
      req.ip
    );

    res.json({
      success: true,
      message: 'Password updated successfully! Please sign in with your new credentials.'
    });
  } catch (error) {
    console.error('[AUTH ERROR] Reset password completion failed:', error);
    res.status(500).json({ message: 'Internal error completing password reset.' });
  }
};

app.post('/api/auth/reset-password/:token', handlePasswordReset);
app.post('/api/auth/reset-password', handlePasswordReset);

// ======================== ALLOWANCE RULES & DIVISIONS ========================

app.get('/api/rules', authenticateToken, async (req, res) => {
  try {
    const rule = await AllowanceRule.findOne({ role: req.user.role });
    if (!rule) {
      // Return standard default if rule doesn't exist for some reason
      return res.json({ role: req.user.role, taDailyRate: 800, ndaHourlyRate: 180 });
    }
    res.json(rule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/divisions', async (req, res) => {
  try {
    const divisions = await Division.find({});
    res.json(divisions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ======================== TRAIN ROUTING ========================

// Search trains
app.get('/api/trains', authenticateToken, async (req, res) => {
  const { q } = req.query;
  try {
    if (!q) {
      const allTrains = await Train.find({}).limit(20);
      return res.json(allTrains);
    }
    // Search by number or name
    const results = await Train.find({
      $or: [
        { number: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } }
      ]
    }).limit(10);
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ======================== JOURNEY ROUTES ========================

// Get Journeys
app.get('/api/journeys', authenticateToken, async (req, res) => {
  try {
    const journeys = await Journey.find({ userId: req.user.id }).sort({ scheduledDeparture: -1 });
    res.json(journeys);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create Journey
app.post('/api/journeys', authenticateToken, async (req, res) => {
  try {
    const rule = await AllowanceRule.findOne({ role: req.user.role }) || { taDailyRate: 800, ndaHourlyRate: 180 };
    
    // Auto-calculate TA, NDA and night duty hours
    const { actualDeparture, actualArrival, departureFromHq, arrivalAtHq } = req.body;

    if (actualDeparture && actualArrival && new Date(actualArrival) <= new Date(actualDeparture)) {
      return res.status(400).json({ message: 'Arrival time must be after departure time' });
    }
    
    const nightDutyHours = calculateNightDutyHours(actualDeparture, actualArrival);
    const ndaAmount = nightDutyHours * rule.ndaHourlyRate;

    // Calculate TA. Use departureFromHq/arrivalAtHq if provided; otherwise, fall back to actual travel times
    const taStart = departureFromHq || actualDeparture;
    const taEnd = arrivalAtHq || actualArrival;
    const taAmount = calculateTA(taStart, taEnd, rule.taDailyRate);

    const journey = await Journey.create({
      ...req.body,
      localId: req.body.localId || `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: req.user.id,
      nightDutyHours,
      ndaAmount,
      taAmount
    });

    await logAction(req.user.id, 'JOURNEY_CREATE', `Created journey: ${journey.trainNumber} (${journey.departureStation} - ${journey.arrivalStation})`, req.ip);
    res.status(201).json(journey);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update Journey
app.put('/api/journeys/:id', authenticateToken, async (req, res) => {
  try {
    let journey = await Journey.findOne({ _id: req.params.id, userId: req.user.id });
    if (!journey) return res.status(404).json({ message: 'Journey not found' });

    const rule = await AllowanceRule.findOne({ role: req.user.role }) || { taDailyRate: 800, ndaHourlyRate: 180 };
    
    const { actualDeparture, actualArrival, departureFromHq, arrivalAtHq } = req.body;
    const depTime = actualDeparture || journey.actualDeparture;
    const arrTime = actualArrival || journey.actualArrival;
    if (depTime && arrTime && new Date(arrTime) <= new Date(depTime)) {
      return res.status(400).json({ message: 'Arrival time must be after departure time' });
    }
    const nightDutyHours = calculateNightDutyHours(actualDeparture || journey.actualDeparture, actualArrival || journey.actualArrival);
    const ndaAmount = nightDutyHours * rule.ndaHourlyRate;

    const taStart = departureFromHq || actualDeparture || journey.departureFromHq || journey.actualDeparture;
    const taEnd = arrivalAtHq || actualArrival || journey.arrivalAtHq || journey.actualArrival;
    const taAmount = calculateTA(taStart, taEnd, rule.taDailyRate);

    Object.assign(journey, req.body, { nightDutyHours, ndaAmount, taAmount });
    await journey.save();

    await logAction(req.user.id, 'JOURNEY_UPDATE', `Updated journey: ${journey.trainNumber}`, req.ip);
    res.json(journey);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete Journey
app.delete('/api/journeys/:id', authenticateToken, async (req, res) => {
  try {
    const journey = await Journey.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!journey) return res.status(404).json({ message: 'Journey not found' });

    await logAction(req.user.id, 'JOURNEY_DELETE', `Deleted journey: ${journey.trainNumber}`, req.ip);
    res.json({ message: 'Journey deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ======================== JOURNEY TEMPLATE ROUTES ========================

app.get('/api/templates', authenticateToken, async (req, res) => {
  try {
    const templates = await JourneyTemplate.find({ userId: req.user.id });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/templates', authenticateToken, async (req, res) => {
  try {
    const template = await JourneyTemplate.create({
      ...req.body,
      userId: req.user.id
    });
    res.status(201).json(template);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/templates/:id', authenticateToken, async (req, res) => {
  try {
    const deleted = await JourneyTemplate.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!deleted) return res.status(404).json({ message: 'Template not found' });
    res.json({ message: 'Template deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ======================== SYNC ENDPOINT (OFFLINE SYNC) ========================

app.post('/api/journeys/sync', authenticateToken, async (req, res) => {
  const { journeys } = req.body;
  if (!Array.isArray(journeys)) return res.status(400).json({ message: 'Invalid payload structure' });

  try {
    const syncedJourneys = [];
    const rule = await AllowanceRule.findOne({ role: req.user.role }) || { taDailyRate: 800, ndaHourlyRate: 180 };

    for (const item of journeys) {
      if (!item || !item.localId || typeof item.localId !== 'string' || !item.localId.trim()) {
        continue;
      }

      // Strip client-side _id and userId to prevent forged IDs or immutable _id mutation
      const { _id, userId: clientUserId, ...safeItem } = item;

      // Re-calculate allowances authoritatively on server
      const nightDutyHours = calculateNightDutyHours(safeItem.actualDeparture, safeItem.actualArrival);
      const ndaAmount = calculateNDA(nightDutyHours, rule.ndaHourlyRate);

      const taStart = safeItem.departureFromHq || safeItem.actualDeparture;
      const taEnd = safeItem.arrivalAtHq || safeItem.actualArrival;
      const taAmount = calculateTA(taStart, taEnd, rule.taDailyRate);

      const payload = {
        ...safeItem,
        userId: req.user.id,
        nightDutyHours,
        ndaAmount,
        taAmount
      };

      // Check if this journey already exists in DB scoped strictly to user
      let journey = await Journey.findOne({ localId: safeItem.localId, userId: req.user.id });

      if (journey) {
        Object.assign(journey, payload);
        await journey.save();
      } else {
        journey = await Journey.create(payload);
      }
      syncedJourneys.push(journey);
    }

    await logAction(req.user.id, 'JOURNEY_SYNC', `Synchronized ${syncedJourneys.length} journeys from offline cache`, req.ip);
    res.json({ success: true, syncedJourneys });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ======================== REPORT HISTORY ROUTES ========================

app.get('/api/reports', authenticateToken, async (req, res) => {
  try {
    const reports = await ReportHistory.find({ userId: req.user.id }).sort({ generatedAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/reports', authenticateToken, async (req, res) => {
  try {
    const report = await ReportHistory.create({
      ...req.body,
      userId: req.user.id
    });
    await logAction(req.user.id, 'REPORT_GENERATE', `Generated report: ${report.fileName}`, req.ip);
    res.status(201).json(report);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ======================== ADMIN PANEL API ========================

app.get('/api/admin/metrics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const usersCount = await User.countDocuments({});
    const journeysCount = await Journey.countDocuments({});
    const premiumUsersCount = await User.countDocuments({ subscriptionTier: { $in: ['Premium', 'Enterprise'] } });
    
    // Average TA and NDA calculations
    const journeyStats = await Journey.aggregate([
      {
        $group: {
          _id: null,
          totalTA: { $sum: '$taAmount' },
          totalNDA: { $sum: '$ndaAmount' },
          avgDelay: { $avg: '$delayMinutes' }
        }
      }
    ]);

    const activeSubscriptions = await User.countDocuments({ subscriptionStatus: 'Active' });

    res.json({
      usersCount,
      journeysCount,
      premiumUsersCount,
      activeSubscriptions,
      totalTA: journeyStats[0]?.totalTA || 0,
      totalNDA: journeyStats[0]?.totalNDA || 0,
      avgDelay: parseFloat((journeyStats[0]?.avgDelay || 0).toFixed(1))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.role = req.body.role || user.role;
    user.subscriptionTier = req.body.subscriptionTier || user.subscriptionTier;
    user.subscriptionStatus = req.body.subscriptionStatus || user.subscriptionStatus;
    user.isAdmin = req.body.isAdmin !== undefined ? req.body.isAdmin : user.isAdmin;

    await user.save();
    await logAction(req.user.id, 'ADMIN_USER_UPDATE', `Modified user profile for ${user.email}`, req.ip);

    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  const targetUserId = req.params.id;

  // Prevent admin from deleting their own active account
  if (targetUserId === req.user.id) {
    return res.status(400).json({ message: 'Administrative safety constraint: You cannot delete your own account.' });
  }

  try {
    const user = await User.findById(targetUserId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Snapshot user details for audit preservation before deletion
    const userSnapshot = `${user.name} <${user.email}> (${user.role}, Division: ${user.division})`;

    // Check transaction support dynamically (requires replica set or mongos cluster)
    let session = null;
    let useTransaction = false;
    const topologyType = mongoose.connection?.client?.topology?.description?.type;
    const supportsTransactions = ['ReplicaSetWithPrimary', 'Sharded', 'LoadBalanced'].includes(topologyType);

    if (supportsTransactions) {
      try {
        session = await mongoose.startSession();
        session.startTransaction();
        useTransaction = true;
      } catch {
        useTransaction = false;
        if (session) {
          await session.endSession();
          session = null;
        }
      }
    }

    try {
      const opts = session ? { session } : {};

      // 1. Preserve historical audit trail attribution
      await AuditLog.updateMany(
        { userId: user._id },
        { $set: { userSnapshot } },
        opts
      );

      // 2. Cascade delete user operational records
      const [journeysResult, templatesResult, reportsResult, subsResult] = await Promise.all([
        Journey.deleteMany({ userId: user._id }, opts),
        JourneyTemplate.deleteMany({ userId: user._id }, opts),
        ReportHistory.deleteMany({ userId: user._id }, opts),
        Subscription.deleteMany({ userId: user._id }, opts)
      ]);

      // 3. Delete user document
      await User.findByIdAndDelete(user._id, opts);

      if (useTransaction && session) {
        await session.commitTransaction();
      }

      // 4. Log admin audit action with full metadata
      await logAction(
        req.user.id,
        'ADMIN_USER_DELETE',
        `Safely deleted user ${userSnapshot}. Cascaded ${journeysResult.deletedCount} journeys, ${templatesResult.deletedCount} templates, ${reportsResult.deletedCount} reports, ${subsResult.deletedCount} subscriptions. Preserved audit logs.`,
        req.ip
      );

      res.json({
        success: true,
        message: 'User account removed',
        cascaded: {
          journeys: journeysResult.deletedCount,
          templates: templatesResult.deletedCount,
          reports: reportsResult.deletedCount,
          subscriptions: subsResult.deletedCount
        }
      });
    } catch (innerError) {
      if (useTransaction && session) {
        await session.abortTransaction();
      }
      throw innerError;
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  } catch (error) {
    console.error('[ADMIN ERROR] Safe user deletion failed:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/admin/audit-logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const logs = await AuditLog.find({}).populate('userId', 'name email role').sort({ timestamp: -1 }).limit(100);
    // Format logs so that if userId was deleted, the userSnapshot provides historic attribution
    const formattedLogs = logs.map(log => {
      const doc = log.toObject();
      if (!doc.userId && doc.userSnapshot) {
        doc.userId = {
          name: doc.userSnapshot,
          email: 'archived/deleted',
          role: 'Deleted Official'
        };
      }
      return doc;
    });
    res.json(formattedLogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Ensure uploads directory exists
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

// Mount AI Routers
app.use('/api/ai/ocr', aiOcrRouter);
app.use('/api/ai/voice', aiVoiceRouter);
app.use('/api/ai/chat', aiChatRouter);
app.use('/api/ai/audit', aiAuditRouter);

// Default Root Route
app.get('/', (req, res) => {
  res.send('RailAssist Enterprise Backend API Running...');
});

app.listen(PORT, () => {
  console.log(`Server running in production mode on port ${PORT}`);
});
