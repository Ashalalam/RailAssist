import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import readline from 'readline';

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

// ============================================================================
// SEED DATA
// ============================================================================

const testUsers = [
  {
    email: 'test.staff@railassist.test',
    password: 'TestPass123!',
    name: 'Test Staff User',
    role: 'TTE',
    division: 'South Central Railway',
    headquartersStation: 'SC',
    zone: 'South Central Railway',
    branch: 'Commercial',
    payLevel: 7,
    billUnit: 'TEST-001',
    myStations: ['SC', 'BZA', 'HYB']
  },
  {
    email: 'test.admin@railassist.test',
    password: 'TestPass123!',
    name: 'Test Admin User',
    role: 'Chief Ticket Inspector',
    division: 'Headquarters',
    headquartersStation: 'NDLS',
    zone: 'Northern Railway',
    branch: 'Administration',
    payLevel: 10,
    billUnit: 'TEST-002',
    isAdmin: true,
    myStations: ['NDLS', 'SC', 'MAS']
  }
];

const divisions = [
  { code: 'SCR', name: 'South Central Railway', headquarters: 'Secunderabad' },
  { code: 'CR', name: 'Central Railway', headquarters: 'Mumbai CSMT' },
  { code: 'WR', name: 'Western Railway', headquarters: 'Mumbai Churchgate' },
  { code: 'NR', name: 'Northern Railway', headquarters: 'New Delhi' },
  { code: 'SR', name: 'Southern Railway', headquarters: 'Chennai Central' }
];

const stations = [
  // Major junctions
  { code: 'BZA', name: 'Vijayawada Junction', state: 'Andhra Pradesh', zone: 'SCR', division: 'Vijayawada', stationType: 'JUNCTION' },
  { code: 'SC', name: 'Secunderabad Junction', state: 'Telangana', zone: 'SCR', division: 'Secunderabad', stationType: 'JUNCTION' },
  { code: 'HYB', name: 'Hyderabad Deccan', state: 'Telangana', zone: 'SCR', division: 'Hyderabad', stationType: 'CENTRAL' },
  { code: 'NDLS', name: 'New Delhi', state: 'Delhi', zone: 'NR', division: 'Delhi', stationType: 'CENTRAL' },
  { code: 'CSMT', name: 'Mumbai Chhatrapati Shivaji Maharaj Terminus', state: 'Maharashtra', zone: 'CR', division: 'Mumbai', stationType: 'TERMINUS' },
  { code: 'MAS', name: 'Chennai Central', state: 'Tamil Nadu', zone: 'SR', division: 'Chennai', stationType: 'CENTRAL' },
  { code: 'HWH', name: 'Howrah Junction', state: 'West Bengal', zone: 'ER', division: 'Howrah', stationType: 'JUNCTION' },
  { code: 'SBC', name: 'Bangalore City Junction', state: 'Karnataka', zone: 'SWR', division: 'Bangalore', stationType: 'JUNCTION' },
  { code: 'PUNE', name: 'Pune Junction', state: 'Maharashtra', zone: 'CR', division: 'Pune', stationType: 'JUNCTION' },
  { code: 'ADI', name: 'Ahmedabad Junction', state: 'Gujarat', zone: 'WR', division: 'Ahmedabad', stationType: 'JUNCTION' },
  
  // Additional important stations
  { code: 'VSKP', name: 'Visakhapatnam Junction', state: 'Andhra Pradesh', zone: 'ECoR', division: 'Waltair', stationType: 'JUNCTION' },
  { code: 'RJY', name: 'Rajahmundry Junction', state: 'Andhra Pradesh', zone: 'ECoR', division: 'Vijayawada', stationType: 'JUNCTION' },
  { code: 'TPTY', name: 'Tirupati', state: 'Andhra Pradesh', zone: 'SCR', division: 'Guntakal', stationType: 'REGULAR' },
  { code: 'GTL', name: 'Guntakal Junction', state: 'Andhra Pradesh', zone: 'SCR', division: 'Guntakal', stationType: 'JUNCTION' },
  { code: 'KCG', name: 'Kacheguda', state: 'Telangana', zone: 'SCR', division: 'Hyderabad', stationType: 'TERMINUS' },
  { code: 'LTT', name: 'Lokmanya Tilak Terminus', state: 'Maharashtra', zone: 'CR', division: 'Mumbai', stationType: 'TERMINUS' },
  { code: 'PNBE', name: 'Patna Junction', state: 'Bihar', zone: 'ECR', division: 'Danapur', stationType: 'JUNCTION' },
  { code: 'AGC', name: 'Agra Cantt', state: 'Uttar Pradesh', zone: 'NCR', division: 'Agra', stationType: 'REGULAR' },
  { code: 'JP', name: 'Jaipur Junction', state: 'Rajasthan', zone: 'NWR', division: 'Jaipur', stationType: 'JUNCTION' },
  { code: 'MAQ', name: 'Mangalore Central', state: 'Karnataka', zone: 'SR', division: 'Palakkad', stationType: 'CENTRAL' }
];

const trains = [
  {
    number: '12345',
    name: 'Test Superfast Express',
    trainType: 'SUPERFAST',
    fromStation: 'SC',
    toStation: 'MAS',
    distanceKm: 700,
    route: 'SC-BZA-MAS',
    intermediateStations: ['BZA'],
    operatingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
  },
  {
    number: '12346',
    name: 'Test Mail Express',
    trainType: 'MAIL',
    fromStation: 'NDLS',
    toStation: 'BZA',
    distanceKm: 1700,
    route: 'NDLS-AGC-BZA',
    intermediateStations: ['AGC'],
    operatingDays: ['MON', 'WED', 'FRI', 'SAT']
  },
  {
    number: '12347',
    name: 'Test Rajdhani Express',
    trainType: 'RAJDHANI',
    fromStation: 'NDLS',
    toStation: 'SC',
    distanceKm: 1580,
    route: 'NDLS-BZA-HYB-SC',
    intermediateStations: ['BZA', 'HYB'],
    operatingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
  }
];

const allowanceRules = [
  {
    role: 'TTE',
    taDailyRate: 800,
    ndaHourlyRate: 200
  },
  {
    role: 'Guard',
    taDailyRate: 900,
    ndaHourlyRate: 220
  },
  {
    role: 'Chief Ticket Inspector',
    taDailyRate: 1200,
    ndaHourlyRate: 300
  }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function validateDatabaseName(uri) {
  const dbName = uri.split('/').pop().split('?')[0];
  if (dbName !== ALLOWED_DATABASE) {
    console.error('\n❌ SAFETY ABORT: Database name mismatch!');
    console.error(`   Expected: ${ALLOWED_DATABASE}`);
    console.error(`   Got: ${dbName}`);
    console.error('\n   This script ONLY operates on railassist_test database.');
    console.error('   Aborting to prevent accidental data modification.\n');
    process.exit(1);
  }
}

async function getUserConfirmation(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

// ============================================================================
// SEEDING FUNCTIONS (IDEMPOTENT UPSERTS ONLY)
// ============================================================================

async function seedUsers(dryRun = true) {
  console.log('\n📋 Seeding Users...');
  let created = 0;
  let skipped = 0;

  for (const userData of testUsers) {
    const existing = await User.findOne({ email: userData.email });
    
    if (existing) {
      console.log(`   ⏭️  User ${userData.email} already exists (skipping)`);
      skipped++;
    } else {
      if (dryRun) {
        console.log(`   [DRY-RUN] Would create user: ${userData.email} (${userData.role})`);
      } else {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        await User.create({ ...userData, password: hashedPassword });
        console.log(`   ✅ Created user: ${userData.email} (${userData.role})`);
      }
      created++;
    }
  }

  return { created, skipped };
}

async function seedDivisions(dryRun = true) {
  console.log('\n📋 Seeding Divisions...');
  let created = 0;
  let skipped = 0;

  for (const divisionData of divisions) {
    const existing = await Division.findOne({ code: divisionData.code });
    
    if (existing) {
      console.log(`   ⏭️  Division ${divisionData.code} already exists (skipping)`);
      skipped++;
    } else {
      if (dryRun) {
        console.log(`   [DRY-RUN] Would create division: ${divisionData.code} - ${divisionData.name}`);
      } else {
        await Division.create(divisionData);
        console.log(`   ✅ Created division: ${divisionData.code} - ${divisionData.name}`);
      }
      created++;
    }
  }

  return { created, skipped };
}

async function seedStations(dryRun = true) {
  console.log('\n📋 Seeding Stations...');
  let created = 0;
  let skipped = 0;

  for (const stationData of stations) {
    const existing = await Station.findOne({ code: stationData.code });
    
    if (existing) {
      console.log(`   ⏭️  Station ${stationData.code} already exists (skipping)`);
      skipped++;
    } else {
      if (dryRun) {
        console.log(`   [DRY-RUN] Would create station: ${stationData.code} - ${stationData.name}`);
      } else {
        await Station.create(stationData);
        console.log(`   ✅ Created station: ${stationData.code} - ${stationData.name}`);
      }
      created++;
    }
  }

  return { created, skipped };
}

async function seedTrains(dryRun = true) {
  console.log('\n📋 Seeding Trains...');
  let created = 0;
  let skipped = 0;

  for (const trainData of trains) {
    const existing = await Train.findOne({ number: trainData.number });
    
    if (existing) {
      console.log(`   ⏭️  Train ${trainData.number} already exists (skipping)`);
      skipped++;
    } else {
      if (dryRun) {
        console.log(`   [DRY-RUN] Would create train: ${trainData.number} - ${trainData.name}`);
      } else {
        await Train.create(trainData);
        console.log(`   ✅ Created train: ${trainData.number} - ${trainData.name}`);
      }
      created++;
    }
  }

  return { created, skipped };
}

async function seedAllowanceRules(dryRun = true) {
  console.log('\n📋 Seeding Allowance Rules...');
  let created = 0;
  let skipped = 0;

  for (const ruleData of allowanceRules) {
    const existing = await AllowanceRule.findOne({
      role: ruleData.role
    });
    
    if (existing) {
      console.log(`   ⏭️  Rule for ${ruleData.role} already exists (skipping)`);
      skipped++;
    } else {
      if (dryRun) {
        console.log(`   [DRY-RUN] Would create rule: ${ruleData.role} (TA: ₹${ruleData.taDailyRate}/day, NDA: ₹${ruleData.ndaHourlyRate}/hr)`);
      } else {
        await AllowanceRule.create(ruleData);
        console.log(`   ✅ Created rule: ${ruleData.role} (TA: ₹${ruleData.taDailyRate}/day, NDA: ₹${ruleData.ndaHourlyRate}/hr)`);
      }
      created++;
    }
  }

  return { created, skipped };
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const isDryRun = !process.argv.includes('--execute');
  
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║         SAFE ISOLATED TEST DATABASE SEEDER                     ║');
  console.log('║         Target: railassist_test ONLY                           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  if (isDryRun) {
    console.log('\n🔍 DRY-RUN MODE: No data will be modified');
    console.log('   Use --execute flag to apply changes\n');
  } else {
    console.log('\n⚠️  EXECUTE MODE: Changes will be written to database');
  }

  // HARD SAFETY CHECK
  console.log(`\n🔒 Validating database target...`);
  validateDatabaseName(TEST_DB_URI);
  console.log(`✅ Database validation passed: ${ALLOWED_DATABASE}\n`);

  try {
    // Connect to database
    console.log(`📡 Connecting to ${TEST_DB_URI}...`);
    await mongoose.connect(TEST_DB_URI);
    console.log('✅ Connected successfully');

    // Double-check connection database name
    const connectedDb = mongoose.connection.db.databaseName;
    if (connectedDb !== ALLOWED_DATABASE) {
      throw new Error(`Connection database mismatch: expected ${ALLOWED_DATABASE}, got ${connectedDb}`);
    }

    // Get confirmation in execute mode
    if (!isDryRun) {
      console.log('\n⚠️  You are about to modify the railassist_test database.');
      console.log('   This will ADD data using idempotent upserts.');
      console.log('   Existing data will be PRESERVED.\n');
      
      const confirmed = await getUserConfirmation('Proceed with seeding?');
      if (!confirmed) {
        console.log('\n❌ Seeding cancelled by user.\n');
        await mongoose.connection.close();
        process.exit(0);
      }
    }

    // Run seeding operations
    const results = {
      users: await seedUsers(isDryRun),
      divisions: await seedDivisions(isDryRun),
      stations: await seedStations(isDryRun),
      trains: await seedTrains(isDryRun),
      allowanceRules: await seedAllowanceRules(isDryRun)
    };

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    SEEDING SUMMARY                             ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    
    Object.entries(results).forEach(([collection, stats]) => {
      const label = collection.charAt(0).toUpperCase() + collection.slice(1);
      console.log(`\n${label}:`);
      if (isDryRun) {
        console.log(`  Would create: ${stats.created}`);
      } else {
        console.log(`  Created: ${stats.created}`);
      }
      console.log(`  Already exists: ${stats.skipped}`);
    });

    if (isDryRun) {
      console.log('\n💡 To apply these changes, run:');
      console.log('   npm run seed:test\n');
      console.log('   or: node server/seedTestDatabase.js --execute\n');
    } else {
      console.log('\n✅ Test database seeding completed successfully!');
      console.log('\n🔍 Verify the database with:');
      console.log('   npm run verify:test\n');
      console.log('   or: node server/verifyTestDatabase.js\n');
      console.log('📝 Test Credentials:');
      console.log('   Staff: test.staff@railassist.test / TestPass123!');
      console.log('   Admin: test.admin@railassist.test / TestPass123!\n');
    }

    await mongoose.connection.close();
    console.log('✅ Database connection closed\n');

  } catch (error) {
    console.error('\n❌ Error during seeding:', error.message);
    console.error(error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the seeder
main();
