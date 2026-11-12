import mongoose from 'mongoose';

const StationSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    // Station code (e.g., "NDLS", "MMCT", "BZA")
  },
  name: {
    type: String,
    required: true,
    trim: true,
    // Full station name (e.g., "New Delhi", "Mumbai Central")
  },
  zone: {
    type: String,
    enum: ['CR', 'ER', 'ECR', 'ECoR', 'NR', 'NCR', 'NFR', 'NER', 'NWR', 'SR', 'SCR', 'SER', 'SECR', 'SWR', 'WR', 'WCR', 'OTHER'],
    default: 'OTHER',
    // Railway zone abbreviation
  },
  division: {
    type: String,
    trim: true,
    // Division name (e.g., "Mumbai", "Delhi", "Vijayawada")
  },
  state: {
    type: String,
    trim: true,
    // State name (e.g., "Maharashtra", "Delhi", "Andhra Pradesh")
  },
  stationType: {
    type: String,
    enum: ['TERMINUS', 'JUNCTION', 'CENTRAL', 'HALT', 'REGULAR', 'OTHER'],
    default: 'REGULAR',
    // Station category
  },
  isActive: {
    type: Boolean,
    default: true,
    // Whether station is currently operational
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Admin who created this station record
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Admin who last updated this station record
  }
}, {
  timestamps: true
});

// Indexes for efficient searching
StationSchema.index({ code: 1 }, { unique: true });
StationSchema.index({ name: 1 });
StationSchema.index({ zone: 1 });
StationSchema.index({ division: 1 });
StationSchema.index({ isActive: 1 });
StationSchema.index({ name: 'text', code: 'text' }); // Text search index

export default mongoose.model('Station', StationSchema);
