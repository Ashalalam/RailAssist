import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: [
      'TTE',
      'TC',
      'Guard',
      'Loco Pilot',
      'Assistant Loco Pilot',
      'Station Master',
      'Commercial Inspector',
      'Chief Ticket Inspector',
      'Railway Supervisor'
    ],
    required: true,
  },
  division: {
    type: String,
    required: true,
  },
  // Extended Profile Fields - Feature 01
  model: {
    type: String,
    trim: true,
    // Conditional: For running staff (Loco Pilot, ALP), stores locomotive/traction type
    // For other staff, stores appropriate cadre/squad information
  },
  zone: {
    type: String,
    trim: true,
    // Railway zone (e.g., Western Railway, Central Railway)
  },
  branch: {
    type: String,
    trim: true,
    // Department/branch within division
  },
  headquartersStation: {
    type: String,
    trim: true,
    // HQ station code
  },
  payLevel: {
    type: Number,
    min: 1,
    max: 14,
    // Pay level from 1-14
  },
  basicPay: {
    type: Number,
    min: 0,
    // Monthly basic pay amount
  },
  payScale: {
    type: String,
    trim: true,
    // Pay scale information
  },
  gradePay: {
    type: Number,
    min: 0,
    // Grade pay amount if applicable
  },
  billUnit: {
    type: String,
    trim: true,
    // Bill unit number for payroll
  },
  dateOfAppointment: {
    type: Date,
    // Date of joining railway service
  },
  myStations: [{
    type: String,
    trim: true,
    // Array of frequently used station codes
  }],
  // End Extended Profile Fields
  isAdmin: {
    type: Boolean,
    default: false,
  },
  subscriptionTier: {
    type: String,
    enum: ['Free', 'Premium', 'Enterprise'],
    default: 'Free',
  },
  subscriptionStatus: {
    type: String,
    enum: ['Active', 'Canceled', 'Expired', 'None'],
    default: 'None',
  },
  resetPasswordToken: {
    type: String,
    select: false,
    index: true,
  },
  resetPasswordExpire: {
    type: Date,
    select: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password reset token (valid for 15 minutes)
UserSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000);

  return resetToken;
};

export default mongoose.model('User', UserSchema);
