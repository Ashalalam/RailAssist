import mongoose from 'mongoose';

const SubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  tier: {
    type: String,
    enum: ['Free', 'Premium', 'Enterprise'],
    required: true,
    default: 'Free',
  },
  status: {
    type: String,
    enum: ['Active', 'Canceled', 'Expired', 'None'],
    required: true,
    default: 'None',
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
    required: true,
  }
});

export default mongoose.model('Subscription', SubscriptionSchema);
