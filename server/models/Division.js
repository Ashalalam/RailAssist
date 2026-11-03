import mongoose from 'mongoose';

const DivisionSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  }
});

export default mongoose.model('Division', DivisionSchema);
