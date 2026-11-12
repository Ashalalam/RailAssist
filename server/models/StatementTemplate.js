import mongoose from 'mongoose';

const StatementTemplateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  templateName: {
    type: String,
    required: true,
    trim: true,
  },
  statementType: {
    type: String,
    enum: ['TA', 'NDA', 'DIARY', 'COMBINED', 'MR'],
    required: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  // Column configuration
  selectedColumns: {
    type: [String],
    default: []
  },
  columnOrder: {
    type: [String],
    default: []
  },
  // Grouping and filtering
  groupByCategory: {
    type: Boolean,
    default: false
  },
  groupByTrain: {
    type: Boolean,
    default: false
  },
  // Display options
  showEmployeeInfo: {
    type: Boolean,
    default: true
  },
  showSignatureSection: {
    type: Boolean,
    default: true
  },
  showSummaryTotals: {
    type: Boolean,
    default: true
  },
  showRemarks: {
    type: Boolean,
    default: true
  },
  // Page layout
  pageOrientation: {
    type: String,
    enum: ['portrait', 'landscape'],
    default: 'portrait'
  },
  fontSize: {
    type: String,
    enum: ['small', 'medium', 'large'],
    default: 'medium'
  },
  // Additional settings
  customHeader: {
    type: String,
    default: ''
  },
  customFooter: {
    type: String,
    default: ''
  },
  localId: {
    type: String,
    unique: true,
    sparse: true
  },
  syncStatus: {
    type: String,
    enum: ['synced', 'pending'],
    default: 'synced'
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
StatementTemplateSchema.index({ userId: 1 });
StatementTemplateSchema.index({ userId: 1, isDefault: 1 });
StatementTemplateSchema.index({ userId: 1, statementType: 1 });

// Ensure only one default template per statement type per user
StatementTemplateSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    await this.constructor.updateMany(
      { 
        userId: this.userId, 
        statementType: this.statementType,
        _id: { $ne: this._id }
      },
      { $set: { isDefault: false } }
    );
  }
  next();
});

export default mongoose.model('StatementTemplate', StatementTemplateSchema);
