import mongoose from 'mongoose';
import connectDB from '../config/db.js';

await connectDB();

const userId = new mongoose.Types.ObjectId('6a3e97cdb7bab60c272f98ac'); // staff user ID

async function measureQuery(name, collectionName, query, sort = null, limit = null) {
  const col = mongoose.connection.db.collection(collectionName);
  let cursor = col.find(query);
  if (sort) cursor = cursor.sort(sort);
  if (limit) cursor = cursor.limit(limit);

  const exp = await cursor.explain('executionStats');
  const stats = exp.executionStats;
  
  console.log(`\n=== [QUERY PLAN] ${name} ===`);
  console.log(`  Collection:            ${collectionName}`);
  console.log(`  Query Filter:          ${JSON.stringify(query)}`);
  console.log(`  Sort:                  ${sort ? JSON.stringify(sort) : 'none'}`);
  console.log(`  Winning Stage:         ${exp.queryPlanner.winningPlan.stage}`);
  console.log(`  Total Docs Examined:   ${stats.totalDocsExamined}`);
  console.log(`  Total Keys Examined:   ${stats.totalKeysExamined}`);
  console.log(`  Docs Returned:         ${stats.nReturned}`);
  console.log(`  Execution Time (ms):   ${stats.executionTimeMillis}`);
  console.log(`  Index Used:            ${exp.queryPlanner.winningPlan.inputStage ? (exp.queryPlanner.winningPlan.inputStage.indexName || exp.queryPlanner.winningPlan.inputStage.stage) : 'NONE (COLLSCAN)'}`);
  
  return {
    name,
    stage: exp.queryPlanner.winningPlan.stage,
    totalDocsExamined: stats.totalDocsExamined,
    totalKeysExamined: stats.totalKeysExamined,
    nReturned: stats.nReturned,
    executionTimeMillis: stats.executionTimeMillis,
    indexName: exp.queryPlanner.winningPlan.inputStage?.indexName || 'COLLSCAN'
  };
}

console.log('--- CURRENT QUERY EXECUTION PLANS (BEFORE INDEXING) ---');

await measureQuery(
  'User Journeys Sorted by Scheduled Departure',
  'journeys',
  { userId },
  { scheduledDeparture: -1 }
);

await measureQuery(
  'User Journey Lookup by localId (Offline Sync)',
  'journeys',
  { userId, localId: 'local-1' }
);

await measureQuery(
  'User Journeys Range Filter by Actual Departure',
  'journeys',
  { userId, actualDeparture: { $gte: new Date('2026-06-01') } }
);

await measureQuery(
  'Admin Audit Logs Sorted Descending',
  'auditlogs',
  {},
  { timestamp: -1 },
  100
);

await measureQuery(
  'User Reports History Sorted Descending',
  'reporthistories',
  { userId },
  { generatedAt: -1 }
);

await mongoose.disconnect();
