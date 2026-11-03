import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Can be null if system action or before login
  },
  action: {
    type: String,
    required: true, // e.g. "USER_LOGIN", "JOURNEY_SYNC", "REPORT_GEN"
  },
  details: {
    type: String,
    required: true,
  },
  ipAddress: {
    type: String,
    default: 'unknown',
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
});

export default mongoose.model('AuditLog', AuditLogSchema);
