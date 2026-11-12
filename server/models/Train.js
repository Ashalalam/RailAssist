import mongoose from 'mongoose';

const TrainSchema = new mongoose.Schema({
  number: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  fromStation: {
    type: String,
    required: true,
    trim: true,
  },
  toStation: {
    type: String,
    required: true,
    trim: true,
  },
  distanceKm: {
    type: Number,
    required: true,
    default: 0
  },
  // Feature 06: Extended train directory fields
  trainType: {
    type: String,
    enum: ['RAJDHANI', 'SHATABDI', 'DURONTO', 'EXPRESS', 'SUPERFAST', 'MAIL', 'PASSENGER', 'LOCAL', 'SPECIAL', 'OTHER'],
    default: 'EXPRESS'
  },
  intermediateStations: {
    type: [String],
    default: []
  },
  operatingDays: {
    type: [String],
    enum: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
    default: []
  },
  route: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for efficient searching (number already has unique index from schema)
TrainSchema.index({ name: 1 });
TrainSchema.index({ trainType: 1 });
TrainSchema.index({ isActive: 1 });

export default mongoose.model('Train', TrainSchema);
