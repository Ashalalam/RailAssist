import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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

export default mongoose.model('User', UserSchema);
