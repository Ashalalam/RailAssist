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

export default mongoose.model('ReportHistory', ReportHistorySchema);
