import mongoose from 'mongoose';

const AllowanceRuleSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    unique: true,
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
    ]
  },
  taDailyRate: {
    type: Number,
    required: true,
    default: 800 // Rs per day
  },
  ndaHourlyRate: {
    type: Number,
    required: true,
    default: 200 // Rs per hour
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('AllowanceRule', AllowanceRuleSchema);
