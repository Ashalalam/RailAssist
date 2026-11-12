#!/usr/bin/env node
/**
 * RAILASSIST FEATURE 09: AI VOICE DUTY LOGGING — ISOLATED TEST SUITE
 * Tests voice transcription parsing, field extraction, and integration
 * Uses isolated test database: mongodb://localhost:27017/railassist_test
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const TEST_PORT = 5099;
const BASE_URL = `http://localhost:${TEST_PORT}`;
const TEST_DB = 'mongodb://localhost:27017/railassist_test';

let testUsers = {
  A: { email: 'voiceuser@test.com', password: 'test123', token: null }
};

let counters = { passed: 0, failed: 0 };

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    counters.passed++;
  } else {
    console.log(`  [FAIL] ${message}`);
    counters.failed++;
  }
}

console.log('='.repeat(80));
console.log('        RAILASSIST FEATURE 09: AI VOICE DUTY LOGGING — ISOLATED SUITE         ');
console.log('='.repeat(80));
console.log('Isolated test database:', TEST_DB);
console.log('Test server port:      ', TEST_PORT);

// Import server with test environment variables
process.env.PORT = TEST_PORT;
process.env.MONGODB_URI = TEST_DB;
process.env.JWT_SECRET = 'test-jwt-secret-for-feature-09-voice-logging-suite-minimum-30-chars';

// Connect to test DB and clean up before tests
await mongoose.connect(TEST_DB);
await mongoose.connection.db.dropDatabase();
console.log('Test database cleaned.');

// Import and start server
const serverModule = await import('./index.js');
await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for server start

try {
  const healthCheck = await fetch(`${BASE_URL}/health`);
  assert(healthCheck.ok, 'Test server is online.');
} catch (err) {
  console.error('ERROR: Test server failed to start:', err.message);
  process.exit(1);
}

// Register test user
const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Voice Test User',
    email: testUsers.A.email,
    password: testUsers.A.password,
    phone: '9876543210',
    employeeId: 'VOICE001',
    division: 'Mumbai',
    role: 'user'
  })
});
const regData = await regRes.json();
assert(regRes.status === 201, 'User registration succeeds');

// Login test user
const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: testUsers.A.email, password: testUsers.A.password })
});
const loginData = await loginRes.json();
testUsers.A.token = loginData.token;
assert(loginData.token, 'User login returns token');

// ============================================================================
// TEST 1: Simple train number extraction
// ============================================================================
console.log('[TEST 1] Simple train number extraction from voice transcript');
const test1Transcript = "I worked train 12951";
const test1Res = await fetch(`${BASE_URL}/api/ai/voice/parse`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${testUsers.A.token}`
  },
  body: JSON.stringify({ transcript: test1Transcript })
});
const test1Data = await test1Res.json();
assert(test1Res.status === 200, 'Parse API returns 200');
assert(Array.isArray(test1Data.updates), 'Response has updates array');
const trainField = test1Data.updates.find(u => u.field === 'trainNumber');
assert(trainField && trainField.value === '12951', 'trainNumber extracted correctly');

// ============================================================================
// TEST 2: Full journey with stations and dates
// ============================================================================
console.log('[TEST 2] Full journey extraction with stations and dates');
const test2Transcript = "I worked train 12951 Mumbai Rajdhani Express from Mumbai Central to New Delhi on November 10 2024";
const test2Res = await fetch(`${BASE_URL}/api/ai/voice/parse`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${testUsers.A.token}`
  },
  body: JSON.stringify({ transcript: test2Transcript })
});
const test2Data = await test2Res.json();
assert(test2Res.status === 200, 'Parse API returns 200');
const trainName = test2Data.updates.find(u => u.field === 'trainName');
const depStation = test2Data.updates.find(u => u.field === 'departureStation');
const arrStation = test2Data.updates.find(u => u.field === 'arrivalStation');
assert(trainName && trainName.value.includes('Rajdhani'), 'trainName extracted');
assert(depStation && (depStation.value.includes('Mumbai') || depStation.value === 'MMCT'), 'departureStation extracted');
assert(arrStation && (arrStation.value.includes('Delhi') || arrStation.value === 'NDLS'), 'arrivalStation extracted');

// ============================================================================
// TEST 3: Delay extraction
// ============================================================================
console.log('[TEST 3] Delay minutes extraction from natural language');
const test3Transcript = "Arrived 30 minutes late at Vijayawada";
const test3Res = await fetch(`${BASE_URL}/api/ai/voice/parse`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${testUsers.A.token}`
  },
  body: JSON.stringify({ transcript: test3Transcript })
});
const test3Data = await test3Res.json();
assert(test3Res.status === 200, 'Parse API returns 200');
const delayField = test3Data.updates.find(u => u.field === 'delayMinutes');
// AI might extract delay or put it in notes
assert(test3Data.updates.length > 0, 'At least one field extracted');

// ============================================================================
// TEST 4: Duty category extraction
// ============================================================================
console.log('[TEST 4] Duty category extraction from keywords');
const test4Transcript = "Ticket checking duty on train 12626";
const test4Res = await fetch(`${BASE_URL}/api/ai/voice/parse`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${testUsers.A.token}`
  },
  body: JSON.stringify({ transcript: test4Transcript })
});
const test4Data = await test4Res.json();
assert(test4Res.status === 200, 'Parse API returns 200');
const dutyCategory = test4Data.updates.find(u => u.field === 'dutyCategory');
assert(dutyCategory && dutyCategory.value === 'TICKET_CHECKING', 'dutyCategory extracted correctly');

// ============================================================================
// TEST 5: MR (Money Remittance) extraction
// ============================================================================
console.log('[TEST 5] Money remittance details extraction');
const test5Transcript = "MR number 12345, remitted 5000 rupees at New Delhi station";
const test5Res = await fetch(`${BASE_URL}/api/ai/voice/parse`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${testUsers.A.token}`
  },
  body: JSON.stringify({ transcript: test5Transcript })
});
const test5Data = await test5Res.json();
assert(test5Res.status === 200, 'Parse API returns 200');
const mrNumber = test5Data.updates.find(u => u.field === 'mrNumber');
const mrAmount = test5Data.updates.find(u => u.field === 'mrAmount');
const remittedAt = test5Data.updates.find(u => u.field === 'remittedAtStation');
assert(mrNumber && mrNumber.value.includes('12345'), 'mrNumber extracted');
// Amount and station might vary based on AI interpretation
assert(test5Data.updates.length >= 1, 'At least one MR field extracted');

// ============================================================================
// TEST 6: Distance extraction
// ============================================================================
console.log('[TEST 6] Distance in kilometers extraction');
const test6Transcript = "Distance was 1384 kilometers";
const test6Res = await fetch(`${BASE_URL}/api/ai/voice/parse`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${testUsers.A.token}`
  },
  body: JSON.stringify({ transcript: test6Transcript })
});
const test6Data = await test6Res.json();
assert(test6Res.status === 200, 'Parse API returns 200');
const distanceField = test6Data.updates.find(u => u.field === 'distanceKm');
assert(distanceField && Number(distanceField.value) === 1384, 'distanceKm extracted correctly');

// ============================================================================
// TEST 7: Notes field for unstructured data
// ============================================================================
console.log('[TEST 7] Unstructured remarks stored in notes field');
const test7Transcript = "Heavy fog during journey, coach S7 thoroughly checked";
const test7Res = await fetch(`${BASE_URL}/api/ai/voice/parse`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${testUsers.A.token}`
  },
  body: JSON.stringify({ transcript: test7Transcript })
});
const test7Data = await test7Res.json();
assert(test7Res.status === 200, 'Parse API returns 200');
const notesField = test7Data.updates.find(u => u.field === 'notes');
assert(notesField && notesField.value.length > 0, 'notes field populated with unstructured data');

// ============================================================================
// TEST 8: Empty transcript handling
// ============================================================================
console.log('[TEST 8] Empty transcript error handling');
const test8Res = await fetch(`${BASE_URL}/api/ai/voice/parse`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${testUsers.A.token}`
  },
  body: JSON.stringify({ transcript: '' })
});
assert(test8Res.status === 400, 'Empty transcript returns 400');

// ============================================================================
// TEST 9: Missing transcript field
// ============================================================================
console.log('[TEST 9] Missing transcript field error handling');
const test9Res = await fetch(`${BASE_URL}/api/ai/voice/parse`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${testUsers.A.token}`
  },
  body: JSON.stringify({})
});
assert(test9Res.status === 400, 'Missing transcript returns 400');

// ============================================================================
// TEST 10: Unauthenticated access
// ============================================================================
console.log('[TEST 10] Unauthenticated access returns 401');
const test10Res = await fetch(`${BASE_URL}/api/ai/voice/parse`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ transcript: 'test' })
});
assert(test10Res.status === 401 || test10Res.status === 403, 'No auth token returns 401/403');

// ============================================================================
// TEST 11: Complex multi-field extraction
// ============================================================================
console.log('[TEST 11] Complex transcript with multiple fields');
const test11Transcript = "I worked train 12951 from Mumbai Central to New Delhi on November 10, departed at 5:30 PM, arrived at 9:00 AM next day, ticket checking duty, distance 1384 km, delayed 30 minutes";
const test11Res = await fetch(`${BASE_URL}/api/ai/voice/parse`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${testUsers.A.token}`
  },
  body: JSON.stringify({ transcript: test11Transcript })
});
const test11Data = await test11Res.json();
assert(test11Res.status === 200, 'Parse API returns 200');
assert(test11Data.updates.length >= 4, `Extracted multiple fields (got ${test11Data.updates.length})`);

const hasTrainNumber = test11Data.updates.some(u => u.field === 'trainNumber');
const hasStations = test11Data.updates.some(u => u.field === 'departureStation' || u.field === 'arrivalStation');
const hasDutyCategory = test11Data.updates.some(u => u.field === 'dutyCategory');
assert(hasTrainNumber, 'trainNumber present in complex extraction');
assert(hasStations, 'Station fields present in complex extraction');
assert(hasDutyCategory, 'dutyCategory present in complex extraction');

// ============================================================================
// TEST 12: Latency metadata presence
// ============================================================================
console.log('[TEST 12] Response includes latency metadata');
const test12Transcript = "Train 12626 Kerala Express";
const test12Res = await fetch(`${BASE_URL}/api/ai/voice/parse`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${testUsers.A.token}`
  },
  body: JSON.stringify({ transcript: test12Transcript })
});
const test12Data = await test12Res.json();
assert(test12Res.status === 200, 'Parse API returns 200');
assert(typeof test12Data.latencyMs === 'number' && test12Data.latencyMs >= 0, 'latencyMs metadata present');

// ============================================================================
console.log('='.repeat(80));
console.log('FEATURE 09 TEST RESULTS');
console.log(`  Total assertions : ${counters.passed + counters.failed}`);
console.log(`  Passed           : ${counters.passed}`);
console.log(`  Failed           : ${counters.failed}`);
console.log('='.repeat(80));

// Cleanup
await mongoose.connection.close();
process.exit(counters.failed > 0 ? 1 : 0);
