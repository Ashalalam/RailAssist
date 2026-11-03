import mongoose from 'mongoose';
import connectDB from '../config/db.js';

await connectDB();

async function checkDuplicates(colName, groupFields) {
  const col = mongoose.connection.db.collection(colName);
  const groupId = {};
  groupFields.forEach(f => { groupId[f] = '$' + f; });
  
  const dupes = await col.aggregate([
    { $group: { _id: groupId, count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();

  console.log(`[CHECK] ${colName} on [${groupFields.join(', ')}] -> Duplicates: ${dupes.length}`);
  if (dupes.length > 0) {
    console.log('  Details:', JSON.stringify(dupes, null, 2));
  }
  return dupes;
}

console.log('=== CHECKING FOR DUPLICATE DATA BEFORE INDEXING ===\n');
await checkDuplicates('journeys', ['userId', 'localId']);
await checkDuplicates('journeys', ['localId']);
await checkDuplicates('journeytemplates', ['userId', 'templateName']);
await checkDuplicates('reporthistories', ['userId', 'reportType', 'month']);
await checkDuplicates('subscriptions', ['userId']);
await checkDuplicates('users', ['email']);
await checkDuplicates('trains', ['number']);
await checkDuplicates('divisions', ['code']);

await mongoose.disconnect();
console.log('\nDuplicate check complete.');
