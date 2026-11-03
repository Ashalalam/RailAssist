import mongoose from 'mongoose';

const ReportHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reportType: {
    type: String,
    enum: ['TA', 'NDA', 'DIARY'],
    required: true,
  },
  month: {
    type: String, // e.g., "2026-06"
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  totalAmount: {
    type: Number,
    default: 0, // Calculated TA or NDA amount
  },
  journeyCount: {
    type: Number,
    required: true,
    default: 0,
  },
  generatedAt: {
    type: Date,
    default: Date.now,
  },
  summaryData: {
    type: mongoose.Schema.Types.Mixed, // Stores calculation breakdowns for offline redraws
    required: true,
  }
});

// Index for filtering generated statements by user and month
ReportHistorySchema.index({ userId: 1, month: 1 });

// Index for user statement history ordered by generation date descending
ReportHistorySchema.index({ userId: 1, generatedAt: -1 });

export default mongoose.model('ReportHistory', ReportHistorySchema);

