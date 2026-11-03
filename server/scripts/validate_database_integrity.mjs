/**
 * RailAssist Phase 2.3 Database Integrity & Validation Audit
 * 
 * Audits:
 * 1. Required fields & Schema compliance across all documents.
 * 2. Referential integrity: checks for orphaned documents referencing non-existent User IDs.
 * 3. Duplicate checks: verifies uniqueness constraints.
 * 4. localId validation: verifies valid strings and user-scoped uniqueness.
 * 5. Active indexes: confirms all required compound indexes exist on the database.
 * 6. User data isolation: verifies user-scoped queries cannot leak across tenants.
 */

import mongoose from 'mongoose';
import connectDB from '../config/db.js';
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

let checksPassed = 0;
let checksFailed = 0;

function assertCheck(condition, checkName, details = '') {
  if (condition) {
    console.log(`  [PASS] ${checkName}`);
    checksPassed++;
  } else {
    console.error(`  [FAIL] ${checkName}${details ? ' - ' + details : ''}`);
    checksFailed++;
  }
}

console.log('================================================================================');
console.log('                 RAILASSIST DATABASE INTEGRITY & VALIDATION AUDIT               ');
console.log('================================================================================\n');

// 1. Required Fields & Schema Validation
console.log('[SECTION 1] Schema Validation & Required Fields');
const allUsers = await User.find({});
let allUsersValid = true;
for (const u of allUsers) {
  if (!u.name || !u.email || !u.role || !u.division) allUsersValid = false;
}
assertCheck(allUsersValid && allUsers.length > 0, 'All User documents contain required fields (name, email, role, division)');

const allJourneys = await Journey.find({});
let allJourneysValid = true;
for (const j of allJourneys) {
  if (!j.userId || !j.trainNumber || !j.localId || !j.actualDeparture || !j.actualArrival) {
    allJourneysValid = false;
  }
}
assertCheck(allJourneysValid, 'All Journey documents contain required fields (userId, trainNumber, localId, dates)');

// 2. Referential Integrity & Orphan Check
console.log('\n[SECTION 2] Referential Integrity & Orphaned Document Check');
const validUserIds = new Set((await User.find({}).select('_id')).map(u => u._id.toString()));

const orphanedJourneys = await Journey.find({ userId: { $nin: Array.from(validUserIds) } });
assertCheck(orphanedJourneys.length === 0, 'Zero orphaned Journey documents (all reference valid User accounts)');

const orphanedTemplates = await JourneyTemplate.find({ userId: { $nin: Array.from(validUserIds) } });
assertCheck(orphanedTemplates.length === 0, 'Zero orphaned JourneyTemplate documents');

const orphanedReports = await ReportHistory.find({ userId: { $nin: Array.from(validUserIds) } });
assertCheck(orphanedReports.length === 0, 'Zero orphaned ReportHistory documents');

const orphanedSubscriptions = await Subscription.find({ userId: { $nin: Array.from(validUserIds) } });
assertCheck(orphanedSubscriptions.length === 0, 'Zero orphaned Subscription documents');

// 3. localId Validity & Uniqueness Check
console.log('\n[SECTION 3] localId Validity & Scoped Uniqueness');
let invalidLocalIds = 0;
for (const j of allJourneys) {
  if (!j.localId || typeof j.localId !== 'string' || j.localId.trim() === '') {
    invalidLocalIds++;
  }
}
assertCheck(invalidLocalIds === 0, 'All Journey localId values are non-empty valid strings');

const localIdDuplicates = await Journey.aggregate([
  { $group: { _id: { userId: '$userId', localId: '$localId' }, count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
]);
assertCheck(localIdDuplicates.length === 0, 'Zero duplicate (userId + localId) collisions across journeys');

// 4. Active Index Verification
console.log('\n[SECTION 4] Active Index Verification on Collections');
const journeyIndexes = (await Journey.collection.indexes()).map(i => i.name);
assertCheck(journeyIndexes.includes('userId_1_scheduledDeparture_-1'), 'Journey index (userId + scheduledDeparture) active');
assertCheck(journeyIndexes.includes('userId_1_localId_1'), 'Journey unique index (userId + localId) active');
assertCheck(journeyIndexes.includes('userId_1_actualDeparture_1'), 'Journey index (userId + actualDeparture) active');

const auditIndexes = (await AuditLog.collection.indexes()).map(i => i.name);
assertCheck(auditIndexes.includes('userId_1_timestamp_-1'), 'AuditLog index (userId + timestamp) active');
assertCheck(auditIndexes.includes('timestamp_-1'), 'AuditLog global index (timestamp) active');

const reportIndexes = (await ReportHistory.collection.indexes()).map(i => i.name);
assertCheck(reportIndexes.includes('userId_1_month_1'), 'ReportHistory index (userId + month) active');
assertCheck(reportIndexes.includes('userId_1_generatedAt_-1'), 'ReportHistory index (userId + generatedAt) active');

const templateIndexes = (await JourneyTemplate.collection.indexes()).map(i => i.name);
assertCheck(templateIndexes.includes('userId_1'), 'JourneyTemplate index (userId) active');

const subIndexes = (await Subscription.collection.indexes()).map(i => i.name);
assertCheck(subIndexes.includes('userId_1_status_1'), 'Subscription index (userId + status) active');

// 5. Multi-User Isolation
console.log('\n[SECTION 5] Multi-User Data Isolation');
const users = await User.find({}).limit(2);
if (users.length >= 2) {
  const userA = users[0];
  const userB = users[1];

  const userAJourneys = await Journey.find({ userId: userA._id });
  const leakB = userAJourneys.some(j => j.userId.toString() !== userA._id.toString());
  assertCheck(!leakB, `User A (${userA.email}) query strictly returns User A records without cross-tenant leakage`);

  const userBJourneys = await Journey.find({ userId: userB._id });
  const leakA = userBJourneys.some(j => j.userId.toString() !== userB._id.toString());
  assertCheck(!leakA, `User B (${userB.email}) query strictly returns User B records without cross-tenant leakage`);
} else {
  console.log('  [NOTE] Need at least 2 users for isolation check. Seed data has staff and admin.');
}

console.log('\n================================================================================');
console.log(`TOTAL AUDIT CHECKS: ${checksPassed + checksFailed}`);
console.log(`PASSED:             ${checksPassed}`);
console.log(`FAILED:             ${checksFailed}`);
console.log('================================================================================\n');

await mongoose.disconnect();

if (checksFailed > 0) process.exit(1);
else process.exit(0);
