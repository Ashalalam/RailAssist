import mongoose from 'mongoose';

const JourneySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  trainNumber: {
    type: String,
    required: true,
    trim: true,
  },
  trainName: {
    type: String,
    required: true,
    trim: true,
  },
  departureStation: {
    type: String,
    required: true,
    trim: true,
  },
  arrivalStation: {
    type: String,
    required: true,
    trim: true,
  },
  scheduledDeparture: {
    type: Date,
    required: true,
  },
  scheduledArrival: {
    type: Date,
    required: true,
  },
  actualDeparture: {
    type: Date,
    required: true,
  },
  actualArrival: {
    type: Date,
    required: true,
  },
  departureFromHq: {
    type: Date, // Absence start
  },
  arrivalAtHq: {
    type: Date, // Absence end
  },
  distanceKm: {
    type: Number,
    default: 0,
  },
  delayMinutes: {
    type: Number,
    default: 0,
  },
  taAmount: {
    type: Number,
    default: 0,
  },
  ndaAmount: {
    type: Number,
    default: 0,
  },
  nightDutyHours: {
    type: Number,
    default: 0,
  },
  // MR (Money Remittance) Management - Feature 02
  mrNumber: {
    type: String,
    trim: true,
    // MR tracking number for remittance
  },
  mrAmount: {
    type: Number,
    min: 0,
    // Amount remitted in INR
  },
  remittedAtStation: {
    type: String,
    trim: true,
    // Station code where MR was remitted
  },
  hasClaim: {
    type: Boolean,
    default: true,
    // Whether this duty is eligible for claims (true) or no-claim status (false)
  },
  // End MR Management Fields
  
  // Feature 03: Enhanced Claim Status & Duty Categories
  noClaimReason: {
    type: String,
    enum: ['NONE', 'CL', 'CR', 'HQRS', 'LAP', 'LHAP', 'NH', 'PL', 'REST', 'SCL', 'OTHER'],
    default: 'NONE',
    // CL = Casual Leave, CR = Compensation Rest, HQRS, LAP, LHAP, NH, PL, REST, SCL
  },
  dutyCategory: {
    type: String,
    enum: ['TICKET_CHECKING', 'ON_DUTY', 'STATION_DUTY', 'PF_CHECK', 'OTHER'],
    default: 'TICKET_CHECKING',
    // Railway duty type classification
  },
  ndaEligible: {
    type: Boolean,
    default: true,
    // Whether this duty qualifies for Night Duty Allowance
  },
  // End Feature 03 Fields
  notes: {
    type: String,
    trim: true,
  },
  localId: {
    type: String, // Tracks client IndexedDB ID for syncing mapping
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

// Primary dashboard query index: user journeys ordered by scheduled departure descending
JourneySchema.index({ userId: 1, scheduledDeparture: -1 });

// Scoped unique compound index: guarantees offline sync idempotency per user
JourneySchema.index({ userId: 1, localId: 1 }, { unique: true });

// Timeline & overlap range index: user journeys ordered by actual departure ascending
JourneySchema.index({ userId: 1, actualDeparture: 1 });

export default mongoose.model('Journey', JourneySchema);

