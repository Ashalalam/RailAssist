import mongoose from 'mongoose';

const RosterSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  dutyDate: {
    type: Date,
    required: true,
    // Date for which this roster entry is scheduled
  },
  trainNumber: {
    type: String,
    trim: true,
    // Optional: Some roster entries may not have specific train assignments
  },
  trainName: {
    type: String,
    trim: true,
  },
  reportingTime: {
    type: Date,
    // Time when staff should report for duty
  },
  departureStation: {
    type: String,
    trim: true,
  },
  arrivalStation: {
    type: String,
    trim: true,
  },
  expectedDeparture: {
    type: Date,
    // Scheduled departure time
  },
  expectedArrival: {
    type: Date,
    // Scheduled arrival time
  },
  dutyCategory: {
    type: String,
    enum: ['TICKET_CHECKING', 'ON_DUTY', 'STATION_DUTY', 'PF_CHECK', 'OTHER'],
    default: 'TICKET_CHECKING',
  },
  assignedDesignation: {
    type: String,
    // For admin-assigned rosters: designation of assigned staff
  },
  remarks: {
    type: String,
    trim: true,
  },
  journeyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Journey',
    // Link to actual duty log if converted
  },
  localId: {
    type: String,
    required: true,
    // Client-side unique ID for offline sync
  },
  syncStatus: {
    type: String,
    enum: ['synced', 'pending', 'conflict'],
    default: 'synced',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

// Index for efficient user-based queries
RosterSchema.index({ userId: 1, dutyDate: 1 });

// Unique constraint: one roster entry per user per localId (offline sync idempotency)
RosterSchema.index({ userId: 1, localId: 1 }, { unique: true });

// Update timestamp on save
RosterSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Roster', RosterSchema);
