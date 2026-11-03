import mongoose from 'mongoose';

const JourneyTemplateSchema = new mongoose.Schema({
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
  scheduledDepartureTime: {
    type: String, // format HH:MM
    required: true,
  },
  scheduledArrivalTime: {
    type: String, // format HH:MM
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

// Index for template retrieval by authenticated user
JourneyTemplateSchema.index({ userId: 1 });

export default mongoose.model('JourneyTemplate', JourneyTemplateSchema);

