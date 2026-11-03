import mongoose from 'mongoose';
import connectDB from '../config/db.js';

// Import all models so Mongoose registers schemas and indexes
import User from '../models/User.js';
import Journey from '../models/Journey.js';
import AuditLog from '../models/AuditLog.js';
import ReportHistory from '../models/ReportHistory.js';
import JourneyTemplate from '../models/JourneyTemplate.js';
import Subscription from '../models/Subscription.js';
import Train from '../models/Train.js';
import Division from '../models/Division.js';
import AllowanceRule from '../models/AllowanceRule.js';

await connectDB();

const models = [
  User,
  Journey,
  AuditLog,
  ReportHistory,
  JourneyTemplate,
  Subscription,
  Train,
  Division,
  AllowanceRule
];

console.log('=== SYNCING AND BUILDING MONGOOSE INDEXES ===\n');

for (const model of models) {
  try {
    const res = await model.syncIndexes();
    console.log(`[SYNCED] ${model.modelName}:`, JSON.stringify(res));
    const indexes = await model.collection.indexes();
    console.log(`  Current active indexes on ${model.collection.name}:`);
    indexes.forEach(idx => {
      console.log(`    - ${idx.name}: ${JSON.stringify(idx.key)} ${idx.unique ? '[UNIQUE]' : ''}`);
    });
  } catch (err) {
    console.error(`[ERROR] Syncing indexes for ${model.modelName}:`, err.message);
  }
}

await mongoose.disconnect();
console.log('\nIndex synchronization complete.');
