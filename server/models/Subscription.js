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

// Index for active user subscription status checks
SubscriptionSchema.index({ userId: 1, status: 1 });

export default mongoose.model('Subscription', SubscriptionSchema);

