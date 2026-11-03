import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'railassist_secret_key_12345';

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
connectDB();

// Helper: Calculate Night Duty Hours (22:00 to 06:00)
function calculateNightDutyHours(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate) || isNaN(endDate) || startDate >= endDate) return 0;

  let nightMinutes = 0;
  const stepMinutes = 5;
  let current = new Date(startDate);

  while (current < endDate) {
    const hour = current.getHours();
    if (hour >= 22 || hour < 6) {
      nightMinutes += stepMinutes;
    }
    current.setMinutes(current.getMinutes() + stepMinutes);
  }

  return parseFloat((nightMinutes / 60).toFixed(2));
}

// Helper: Calculate Traveling Allowance (TA) based on hours away from HQ
function calculateTA(start, end, dailyRate) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate) || isNaN(endDate) || startDate >= endDate) return 0;

  const diffMs = endDate - startDate;
  const hours = diffMs / (1000 * 60 * 60);

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  let remainderTA = 0;
  if (remainingHours > 0) {
    if (remainingHours <= 6) {
      remainderTA = 0.3 * dailyRate;
    } else if (remainingHours <= 12) {
      remainderTA = 0.7 * dailyRate;
    } else {
      remainderTA = 1.0 * dailyRate;
    }
  }

  return parseFloat(((days * dailyRate) + remainderTA).toFixed(2));
}

// Middleware: Authenticate JWT Token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token invalid or expired' });
    req.user = user;
    next();
  });
};

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

// Forgot Password
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email, newPassword } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password = newPassword;
    await user.save();

    await logAction(user._id, 'PASSWORD_RESET', 'Reset password', req.ip);
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

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
    
    const nightDutyHours = calculateNightDutyHours(actualDeparture, actualArrival);
    const ndaAmount = nightDutyHours * rule.ndaHourlyRate;

    // Calculate TA. Use departureFromHq/arrivalAtHq if provided; otherwise, fall back to actual travel times
    const taStart = departureFromHq || actualDeparture;
    const taEnd = arrivalAtHq || actualArrival;
    const taAmount = calculateTA(taStart, taEnd, rule.taDailyRate);

    const journey = await Journey.create({
      ...req.body,
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
    await JourneyTemplate.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
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
      // Re-calculate allowances for synced items to ensure server-side compliance
      const nightDutyHours = calculateNightDutyHours(item.actualDeparture, item.actualArrival);
      const ndaAmount = nightDutyHours * rule.ndaHourlyRate;

      const taStart = item.departureFromHq || item.actualDeparture;
      const taEnd = item.arrivalAtHq || item.actualArrival;
      const taAmount = calculateTA(taStart, taEnd, rule.taDailyRate);

      // Check if this journey already exists in DB (sync update or recreate)
      let journey = await Journey.findOne({ localId: item.localId, userId: req.user.id });
      
      const payload = {
        ...item,
        userId: req.user.id,
        nightDutyHours,
        ndaAmount,
        taAmount
      };

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
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await logAction(req.user.id, 'ADMIN_USER_DELETE', `Deleted user account ${user.email}`, req.ip);
    res.json({ message: 'User account removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/admin/audit-logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const logs = await AuditLog.find({}).populate('userId', 'name email role').sort({ timestamp: -1 }).limit(100);
    res.json(logs);
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
