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
  userSnapshot: {
    type: String, // Preserves name/email/role snapshot in case of account deletion
    required: false,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
});

// Index for user audit trail queries sorted descending
AuditLogSchema.index({ userId: 1, timestamp: -1 });

// Global administrator audit log index sorted descending
AuditLogSchema.index({ timestamp: -1 });

export default mongoose.model('AuditLog', AuditLogSchema);

