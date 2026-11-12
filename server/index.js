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

// Feature Routes
import stationsRouter from './routes/stations.js';

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
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        division: user.division,
        model: user.model,
        zone: user.zone,
        branch: user.branch,
        headquartersStation: user.headquartersStation,
        payLevel: user.payLevel,
        basicPay: user.basicPay,
        payScale: user.payScale,
        gradePay: user.gradePay,
        billUnit: user.billUnit,
        dateOfAppointment: user.dateOfAppointment,
        myStations: user.myStations,
        isAdmin: user.isAdmin,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus
      }
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
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        division: user.division,
        model: user.model,
        zone: user.zone,
        branch: user.branch,
        headquartersStation: user.headquartersStation,
        payLevel: user.payLevel,
        basicPay: user.basicPay,
        payScale: user.payScale,
        gradePay: user.gradePay,
        billUnit: user.billUnit,
        dateOfAppointment: user.dateOfAppointment,
        myStations: user.myStations,
        isAdmin: user.isAdmin,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus
      }
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

    // Basic fields
    user.name = req.body.name || user.name;
    user.division = req.body.division || user.division;

    // Extended profile fields - Feature 01
    if (req.body.model !== undefined) user.model = req.body.model;
    if (req.body.zone !== undefined) user.zone = req.body.zone;
    if (req.body.branch !== undefined) user.branch = req.body.branch;
    if (req.body.headquartersStation !== undefined) user.headquartersStation = req.body.headquartersStation;
    if (req.body.payLevel !== undefined) user.payLevel = req.body.payLevel;
    if (req.body.basicPay !== undefined) user.basicPay = req.body.basicPay;
    if (req.body.payScale !== undefined) user.payScale = req.body.payScale;
    if (req.body.gradePay !== undefined) user.gradePay = req.body.gradePay;
    if (req.body.billUnit !== undefined) user.billUnit = req.body.billUnit;
    if (req.body.dateOfAppointment !== undefined) user.dateOfAppointment = req.body.dateOfAppointment;
    if (req.body.myStations !== undefined) user.myStations = req.body.myStations;

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
      model: user.model,
      zone: user.zone,
      branch: user.branch,
      headquartersStation: user.headquartersStation,
      payLevel: user.payLevel,
      basicPay: user.basicPay,
      payScale: user.payScale,
      gradePay: user.gradePay,
      billUnit: user.billUnit,
      dateOfAppointment: user.dateOfAppointment,
      myStations: user.myStations,
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

// Get all allowance rules (for Allowances Matrix page - Feature 04)
app.get('/api/rules/all', authenticateToken, async (req, res) => {
  try {
    const rules = await AllowanceRule.find({}).sort({ role: 1 });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ======================== TRAIN ROUTING ========================

// Search trains (existing autocomplete endpoint)
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

// Feature 06: Get all trains for directory (with pagination and filters)
app.get('/api/trains/directory', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      trainType = '', 
      fromStation = '', 
      toStation = '', 
      isActive = '' 
    } = req.query;

    const query = {};
    
    // Search filter
    if (search) {
      query.$or = [
        { number: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Type filter
    if (trainType) {
      query.trainType = trainType;
    }
    
    // Station filters
    if (fromStation) {
      query.fromStation = { $regex: fromStation, $options: 'i' };
    }
    if (toStation) {
      query.toStation = { $regex: toStation, $options: 'i' };
    }
    
    // Active status filter
    if (isActive !== '') {
      query.isActive = isActive === 'true';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Train.countDocuments(query);
    const trains = await Train.find(query)
      .sort({ number: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      trains,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Feature 06: Get single train details
app.get('/api/trains/:id', authenticateToken, async (req, res) => {
  try {
    const train = await Train.findById(req.params.id);
    if (!train) return res.status(404).json({ message: 'Train not found' });
    res.json(train);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Feature 06: Create train (admin only)
app.post('/api/trains/directory', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const train = await Train.create({
      ...req.body,
      createdBy: req.user.id,
      updatedBy: req.user.id
    });

    await logAction(req.user.id, 'TRAIN_CREATE', `Created train ${train.number} - ${train.name}`, req.ip);
    res.status(201).json(train);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Train number already exists' });
    }
    res.status(400).json({ message: error.message });
  }
});

// Feature 06: Update train (admin only)
app.put('/api/trains/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const train = await Train.findById(req.params.id);
    if (!train) return res.status(404).json({ message: 'Train not found' });

    // Don't allow changing train number (unique constraint)
    const { number, ...updates } = req.body;
    
    Object.assign(train, updates);
    train.updatedBy = req.user.id;
    await train.save();

    await logAction(req.user.id, 'TRAIN_UPDATE', `Updated train ${train.number} - ${train.name}`, req.ip);
    res.json(train);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Feature 06: Deactivate train (admin only)
app.patch('/api/trains/:id/deactivate', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const train = await Train.findById(req.params.id);
    if (!train) return res.status(404).json({ message: 'Train not found' });

    train.isActive = !train.isActive;
    train.updatedBy = req.user.id;
    await train.save();

    await logAction(
      req.user.id, 
      'TRAIN_STATUS_CHANGE', 
      `${train.isActive ? 'Activated' : 'Deactivated'} train ${train.number} - ${train.name}`, 
      req.ip
    );
    res.json(train);
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

// Feature 13: Get Financial Summary for date range
app.get('/api/journeys/summary', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, dutyCategory, claimStatus } = req.query;
    
    // Build query
    const query = { userId: req.user.id };
    
    if (startDate && endDate) {
      query.scheduledDeparture = {
        $gte: parseAsIST(startDate),
        $lte: parseAsIST(endDate)
      };
    }
    
    if (dutyCategory && dutyCategory !== 'ALL') {
      query.dutyCategory = dutyCategory;
    }
    
    if (claimStatus === 'ELIGIBLE') {
      query.$or = [
        { hasClaim: true },
        { hasClaim: { $exists: false } }
      ];
      query.$or.push({ noClaimReason: 'NONE' });
    } else if (claimStatus === 'NO_CLAIM') {
      query.hasClaim = false;
    }
    
    const journeys = await Journey.find(query).sort({ scheduledDeparture: 1 });
    
    // Calculate totals
    const claimEligible = journeys.filter(j => 
      j.hasClaim !== false && (!j.noClaimReason || j.noClaimReason === 'NONE')
    );
    
    const totalTA = claimEligible.reduce((sum, j) => sum + (j.taAmount || 0), 0);
    const totalNDA = claimEligible.reduce((sum, j) => sum + (j.ndaAmount || 0), 0);
    const totalNightHours = claimEligible.reduce((sum, j) => sum + (j.nightDutyHours || 0), 0);
    const totalMR = journeys.reduce((sum, j) => sum + (j.mrAmount || 0), 0);
    const totalDistance = journeys.reduce((sum, j) => sum + (j.distanceKm || 0), 0);
    const mrCount = journeys.filter(j => j.mrNumber && j.mrNumber.trim() !== '').length;
    
    const eligibleCount = claimEligible.length;
    const noClaimCount = journeys.filter(j => j.hasClaim === false || (j.noClaimReason && j.noClaimReason !== 'NONE')).length;
    
    res.json({
      journeys,
      summary: {
        totalJourneys: journeys.length,
        eligibleCount,
        noClaimCount,
        totalTA: parseFloat(totalTA.toFixed(2)),
        totalNDA: parseFloat(totalNDA.toFixed(2)),
        totalNightHours: parseFloat(totalNightHours.toFixed(2)),
        totalMR: parseFloat(totalMR.toFixed(2)),
        totalAllowance: parseFloat((totalTA + totalNDA).toFixed(2)),
        totalDistance: parseFloat(totalDistance.toFixed(2)),
        mrCount
      }
    });
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
    // Feature 03: Respect ndaEligible flag
    const ndaEligible = req.body.ndaEligible !== undefined ? req.body.ndaEligible : true;
    const ndaAmount = ndaEligible ? (nightDutyHours * rule.ndaHourlyRate) : 0;

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
    // Feature 03: Respect ndaEligible flag
    const ndaEligible = req.body.ndaEligible !== undefined ? req.body.ndaEligible : (journey.ndaEligible !== undefined ? journey.ndaEligible : true);
    const ndaAmount = ndaEligible ? (nightDutyHours * rule.ndaHourlyRate) : 0;

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
      // Feature 03: Respect ndaEligible flag from client
      const ndaEligible = safeItem.ndaEligible !== undefined ? safeItem.ndaEligible : true;
      const ndaAmount = ndaEligible ? calculateNDA(nightDutyHours, rule.ndaHourlyRate) : 0;

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

// ======================== DUTY ROSTER ROUTES (Feature 05) ========================

// Get all roster entries for current user
app.get('/api/rosters', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    let query = { userId: req.user.id };
    
    // Filter by month/year if provided
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      query.dutyDate = { $gte: startDate, $lte: endDate };
    }
    
    const rosters = await Roster.find(query).sort({ dutyDate: 1 });
    res.json(rosters);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new roster entry
app.post('/api/rosters', authenticateToken, async (req, res) => {
  try {
    const roster = await Roster.create({
      ...req.body,
      localId: req.body.localId || `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: req.user.id,
      syncStatus: 'synced'
    });
    
    await logAction(req.user.id, 'ROSTER_CREATE', `Created roster entry for ${roster.dutyDate.toISOString().substring(0, 10)}`, req.ip);
    res.status(201).json(roster);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update roster entry
app.put('/api/rosters/:id', authenticateToken, async (req, res) => {
  try {
    let roster = await Roster.findOne({ _id: req.params.id, userId: req.user.id });
    if (!roster) return res.status(404).json({ message: 'Roster entry not found' });
    
    Object.assign(roster, req.body);
    await roster.save();
    
    await logAction(req.user.id, 'ROSTER_UPDATE', `Updated roster entry ${roster._id}`, req.ip);
    res.json(roster);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete roster entry
app.delete('/api/rosters/:id', authenticateToken, async (req, res) => {
  try {
    const roster = await Roster.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!roster) return res.status(404).json({ message: 'Roster entry not found' });
    
    await logAction(req.user.id, 'ROSTER_DELETE', `Deleted roster entry ${roster._id}`, req.ip);
    res.json({ message: 'Roster entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Bulk sync roster entries from offline
app.post('/api/rosters/sync', authenticateToken, async (req, res) => {
  try {
    const { rosters } = req.body;
    const syncedRosters = [];
    
    for (const item of rosters) {
      const { _id, userId: clientUserId, ...safeItem } = item;
      
      const payload = {
        ...safeItem,
        userId: req.user.id
      };
      
      let roster = await Roster.findOne({ localId: safeItem.localId, userId: req.user.id });
      
      if (roster) {
        Object.assign(roster, payload);
        await roster.save();
      } else {
        roster = await Roster.create(payload);
      }
      syncedRosters.push(roster);
    }
    
    await logAction(req.user.id, 'ROSTER_SYNC', `Synchronized ${syncedRosters.length} roster entries from offline cache`, req.ip);
    res.json({ success: true, syncedRosters });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Convert roster to duty log
app.post('/api/rosters/:id/convert', authenticateToken, async (req, res) => {
  try {
    const roster = await Roster.findOne({ _id: req.params.id, userId: req.user.id });
    if (!roster) return res.status(404).json({ message: 'Roster entry not found' });
    
    // Check if already converted
    if (roster.journeyId) {
      return res.status(400).json({ message: 'Roster entry already converted to duty log' });
    }
    
    const rule = await AllowanceRule.findOne({ role: req.user.role }) || { taDailyRate: 800, ndaHourlyRate: 180 };
    
    // Create journey from roster data
    const journey = await Journey.create({
      userId: req.user.id,
      trainNumber: roster.trainNumber || 'TBD',
      trainName: roster.trainName || 'To Be Determined',
      departureStation: roster.departureStation || 'TBD',
      arrivalStation: roster.arrivalStation || 'TBD',
      scheduledDeparture: roster.expectedDeparture || roster.dutyDate,
      scheduledArrival: roster.expectedArrival || roster.dutyDate,
      actualDeparture: roster.expectedDeparture || roster.dutyDate,
      actualArrival: roster.expectedArrival || roster.dutyDate,
      departureFromHq: roster.reportingTime || roster.expectedDeparture || roster.dutyDate,
      arrivalAtHq: roster.expectedArrival || roster.dutyDate,
      distanceKm: 0,
      delayMinutes: 0,
      taAmount: 0,
      ndaAmount: 0,
      nightDutyHours: 0,
      dutyCategory: roster.dutyCategory || 'TICKET_CHECKING',
      notes: `Converted from roster entry. ${roster.remarks || ''}`,
      localId: `converted-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });
    
    // Link roster to journey
    roster.journeyId = journey._id;
    await roster.save();
    
    await logAction(req.user.id, 'ROSTER_CONVERT', `Converted roster ${roster._id} to journey ${journey._id}`, req.ip);
    res.status(201).json({ roster, journey });
  } catch (error) {
    res.status(400).json({ message: error.message });
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

// ======================== STATEMENT TEMPLATES (Feature 07) ========================

// Get all statement templates for authenticated user
app.get('/api/statement-templates', authenticateToken, async (req, res) => {
  try {
    const templates = await StatementTemplate.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single statement template
app.get('/api/statement-templates/:id', authenticateToken, async (req, res) => {
  try {
    const template = await StatementTemplate.findOne({ _id: req.params.id, userId: req.user.id });
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json(template);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new statement template
app.post('/api/statement-templates', authenticateToken, async (req, res) => {
  try {
    const template = await StatementTemplate.create({
      ...req.body,
      userId: req.user.id,
      localId: req.body.localId || `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      syncStatus: 'synced'
    });
    
    await logAction(req.user.id, 'TEMPLATE_CREATE', `Created statement template: ${template.templateName}`, req.ip);
    res.status(201).json(template);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update statement template
app.put('/api/statement-templates/:id', authenticateToken, async (req, res) => {
  try {
    let template = await StatementTemplate.findOne({ _id: req.params.id, userId: req.user.id });
    if (!template) return res.status(404).json({ message: 'Template not found' });
    
    Object.assign(template, req.body);
    await template.save();
    
    await logAction(req.user.id, 'TEMPLATE_UPDATE', `Updated template: ${template.templateName}`, req.ip);
    res.json(template);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete statement template
app.delete('/api/statement-templates/:id', authenticateToken, async (req, res) => {
  try {
    const template = await StatementTemplate.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!template) return res.status(404).json({ message: 'Template not found' });
    
    await logAction(req.user.id, 'TEMPLATE_DELETE', `Deleted template: ${template.templateName}`, req.ip);
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Bulk sync statement templates from offline
app.post('/api/statement-templates/sync', authenticateToken, async (req, res) => {
  try {
    const { templates } = req.body;
    const syncedTemplates = [];
    
    for (const item of templates) {
      const { _id, userId: clientUserId, ...safeItem } = item;
      
      const payload = {
        ...safeItem,
        userId: req.user.id
      };
      
      let template = await StatementTemplate.findOne({ localId: safeItem.localId, userId: req.user.id });
      
      if (template) {
        Object.assign(template, payload);
        await template.save();
      } else {
        template = await StatementTemplate.create(payload);
      }
      syncedTemplates.push(template);
    }
    
    await logAction(req.user.id, 'TEMPLATE_SYNC', `Synchronized ${syncedTemplates.length} templates from offline cache`, req.ip);
    res.json({ success: true, syncedTemplates });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Duplicate statement template
app.post('/api/statement-templates/:id/duplicate', authenticateToken, async (req, res) => {
  try {
    const original = await StatementTemplate.findOne({ _id: req.params.id, userId: req.user.id });
    if (!original) return res.status(404).json({ message: 'Template not found' });
    
    const duplicate = await StatementTemplate.create({
      ...original.toObject(),
      _id: undefined,
      templateName: `${original.templateName} (Copy)`,
      isDefault: false,
      localId: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: req.user.id,
      createdAt: undefined,
      updatedAt: undefined
    });
    
    await logAction(req.user.id, 'TEMPLATE_DUPLICATE', `Duplicated template: ${original.templateName}`, req.ip);
    res.status(201).json(duplicate);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ======================== ADMIN PANEL API ========================

// Feature 13: Reports History API
app.get('/api/reports', authenticateToken, async (req, res) => {
  try {
    const reports = await ReportHistory.find({ userId: req.user.id })
      .sort({ generatedAt: -1 })
      .limit(50);
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/reports', authenticateToken, async (req, res) => {
  try {
    const report = await ReportHistory.create({
      ...req.body,
      userId: req.user.id,
      generatedAt: new Date()
    });
    
    await logAction(req.user.id, 'REPORT_GENERATE', `Generated ${report.reportType} report for ${report.month}`, req.ip);
    res.status(201).json(report);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

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

// Mount Feature Routers
app.use('/api/stations', stationsRouter);

// Default Root Route
app.get('/', (req, res) => {
  res.send('RailAssist Enterprise Backend API Running...');
});

app.listen(PORT, () => {
  console.log(`Server running in production mode on port ${PORT}`);
});
