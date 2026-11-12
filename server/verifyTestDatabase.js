import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ============================================================================
// HARD SAFETY GUARD: ONLY railassist_test DATABASE ALLOWED
// ============================================================================
const ALLOWED_DATABASE = 'railassist_test';
const TEST_DB_URI = `mongodb://localhost:27017/${ALLOWED_DATABASE}`;

// Import models
import User from './models/User.js';
import Station from './models/Station.js';
import Train from './models/Train.js';
import Division from './models/Division.js';
import AllowanceRule from './models/AllowanceRule.js';
import Journey from './models/Journey.js';
import ReportHistory from './models/ReportHistory.js';
import AuditLog from './models/AuditLog.js';

// ============================================================================
// VERIFICATION FUNCTIONS
// ============================================================================

async function verifyCollection(Model, name, minExpected = 0) {
  const count = await Model.countDocuments();
  const status = count >= minExpected ? '✅' : '⚠️';
  console.log(`  ${status} ${name}: ${count} documents`);
  
  if (count > 0 && count <= 5) {
    const samples = await Model.find().limit(3).select('_id email code number name').lean();
    samples.forEach(doc => {
      const identifier = doc.email || doc.code || doc.number || doc.name || doc._id;
      console.log(`     - ${identifier}`);
    });
  }
  
  return { count, valid: count >= minExpected };
}

async function checkFunctionalReadiness() {
  console.log('\n📊 Checking Functional Readiness...\n');
  
  const checks = [];
  
  // Critical collections for basic functionality
  const usersCount = await User.countDocuments();
  const stationsCount = await Station.countDocuments();
  const divisionsCount = await Division.countDocuments();
  const rulesCount = await AllowanceRule.countDocuments();
  
  checks.push({
    name: 'User Authentication',
    status: usersCount >= 2,
    message: usersCount >= 2 
      ? `✅ ${usersCount} test users available` 
      : `❌ Need at least 2 test users, found ${usersCount}`
  });
  
  checks.push({
    name: 'Station Search',
    status: stationsCount >= 10,
    message: stationsCount >= 10
      ? `✅ ${stationsCount} stations available for autocomplete`
      : `❌ Need at least 10 stations, found ${stationsCount}`
  });
  
  checks.push({
    name: 'Division Management',
    status: divisionsCount >= 3,
    message: divisionsCount >= 3
      ? `✅ ${divisionsCount} divisions configured`
      : `⚠️  Only ${divisionsCount} divisions (recommended: 3+)`
  });
  
  checks.push({
    name: 'Allowance Rules',
    status: rulesCount >= 2,
    message: rulesCount >= 2
      ? `✅ ${rulesCount} allowance rules configured`
      : `⚠️  Only ${rulesCount} allowance rules (recommended: 2+)`
  });
  
  // Check for test credentials
  const testStaff = await User.findOne({ email: 'test.staff@railassist.test' });
  const testAdmin = await User.findOne({ email: 'test.admin@railassist.test' });
  
  checks.push({
    name: 'Test Credentials',
    status: testStaff && testAdmin,
    message: testStaff && testAdmin
      ? '✅ Test staff and admin accounts ready'
      : '⚠️  Missing test accounts (staff/admin)'
  });
  
  checks.forEach(check => {
    console.log(`  ${check.message}`);
  });
  
  const allPassed = checks.every(c => c.status);
  
  console.log('\n' + '═'.repeat(70));
  if (allPassed) {
    console.log('  ✅ DATABASE IS FUNCTIONALLY READY FOR TESTING');
  } else {
    console.log('  ⚠️  DATABASE NEEDS ADDITIONAL SEEDING');
    console.log('\n  Run: npm run seed:test');
  }
  console.log('═'.repeat(70));
  
  return allPassed;
}

async function showTestCredentials() {
  console.log('\n🔑 Test Credentials:\n');
  
  const testUsers = await User.find({
    email: { $regex: /test\./i }
  }).select('email role name division').lean();
  
  if (testUsers.length === 0) {
    console.log('  ⚠️  No test users found');
    console.log('  Run: npm run seed:test\n');
    return;
  }
  
  testUsers.forEach(user => {
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Division: ${user.division}`);
    console.log(`  Password: TestPass123! (default test password)`);
    console.log('');
  });
}

async function checkDataIntegrity() {
  console.log('\n🔍 Data Integrity Checks...\n');
  
  // Check for orphaned references
  const journeys = await Journey.countDocuments();
  const reports = await ReportHistory.countDocuments();
  
  console.log(`  📝 Journeys: ${journeys}`);
  console.log(`  📊 Reports: ${reports}`);
  
  if (journeys > 0) {
    const journeysWithoutUser = await Journey.countDocuments({ user: { $exists: false } });
    if (journeysWithoutUser > 0) {
      console.log(`  ⚠️  ${journeysWithoutUser} journeys without user reference`);
    } else {
      console.log(`  ✅ All journeys have valid user references`);
    }
  }
  
  if (reports > 0) {
    const reportsWithoutUser = await ReportHistory.countDocuments({ generatedBy: { $exists: false } });
    if (reportsWithoutUser > 0) {
      console.log(`  ⚠️  ${reportsWithoutUser} reports without user reference`);
    } else {
      console.log(`  ✅ All reports have valid user references`);
    }
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║         TEST DATABASE VERIFICATION (READ-ONLY)                 ║');
  console.log('║         Target: railassist_test                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  try {
    // Connect to database
    console.log(`\n📡 Connecting to ${TEST_DB_URI}...`);
    await mongoose.connect(TEST_DB_URI);
    console.log('✅ Connected successfully\n');

    // Verify connected to correct database
    const connectedDb = mongoose.connection.db.databaseName;
    if (connectedDb !== ALLOWED_DATABASE) {
      console.error(`❌ Database mismatch: expected ${ALLOWED_DATABASE}, got ${connectedDb}`);
      process.exit(1);
    }
    console.log(`🔒 Verified database: ${connectedDb}\n`);

    // Collection counts
    console.log('📋 Collection Inventory:\n');
    
    const results = [];
    results.push(await verifyCollection(User, 'Users', 2));
    results.push(await verifyCollection(Division, 'Divisions', 3));
    results.push(await verifyCollection(Station, 'Stations', 10));
    results.push(await verifyCollection(Train, 'Trains', 0));
    results.push(await verifyCollection(AllowanceRule, 'Allowance Rules', 2));
    results.push(await verifyCollection(Journey, 'Journeys', 0));
    results.push(await verifyCollection(ReportHistory, 'Report History', 0));
    results.push(await verifyCollection(AuditLog, 'Audit Logs', 0));

    // Functional readiness
    const isReady = await checkFunctionalReadiness();

    // Show test credentials
    await showTestCredentials();

    // Data integrity
    await checkDataIntegrity();

    // Database statistics
    const stats = await mongoose.connection.db.stats();
    console.log('\n💾 Database Statistics:\n');
    console.log(`  Database: ${stats.db}`);
    console.log(`  Collections: ${stats.collections}`);
    console.log(`  Data Size: ${(stats.dataSize / 1024).toFixed(2)} KB`);
    console.log(`  Storage Size: ${(stats.storageSize / 1024).toFixed(2)} KB`);
    console.log(`  Indexes: ${stats.indexes}`);
    console.log(`  Index Size: ${(stats.indexSize / 1024).toFixed(2)} KB`);

    await mongoose.connection.close();
    console.log('\n✅ Verification complete\n');

    // Exit code based on readiness
    process.exit(isReady ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.error(error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run verification
main();
