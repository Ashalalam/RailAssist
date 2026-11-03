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
  }
});

export default mongoose.model('Train', TrainSchema);
