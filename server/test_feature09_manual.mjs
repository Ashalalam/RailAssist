/**
 * RAILASSIST FEATURE 09: AI VOICE DUTY LOGGING — MANUAL TEST SCRIPT
 * 
 * Prerequisites: 
 * - Development server must be running on port 5000
 * - User account must exist (create one via signup if needed)
 * 
 * Usage: node test_feature09_manual.mjs
 */

const BASE_URL = 'http://localhost:5000';

// Test credentials - update these with your actual test account
const TEST_USER = {
  email: 'test@example.com',
  password: 'test123'
};

let counters = { passed: 0, failed: 0 };
let authToken = null;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    counters.passed++;
  } else {
    console.log(`  ✗ ${message}`);
    counters.failed++;
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('  RAILASSIST FEATURE 09: AI VOICE DUTY LOGGING — MANUAL TESTS');
  console.log('='.repeat(80));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test User: ${TEST_USER.email}\n`);

  // Test 1: Health check
  console.log('[TEST 1] Server health check');
  try {
    const healthRes = await fetch(`${BASE_URL}/health`);
    assert(healthRes.ok, 'Server is running and responsive');
  } catch (err) {
    console.log(`  ✗ Server not accessible: ${err.message}`);
    console.log(`\n⚠️  Please start the development server first: cd server && npm run dev\n`);
    process.exit(1);
  }

  // Test 2: Login
  console.log('\n[TEST 2] User authentication');
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });
    const loginData = await loginRes.json();
    
    if (loginRes.status === 200 && loginData.token) {
      authToken = loginData.token;
      assert(true, 'Login successful, token obtained');
    } else {
      console.log(`  ✗ Login failed: ${loginData.message || 'Unknown error'}`);
      console.log(`\n⚠️  Please update TEST_USER credentials in the script or create account via signup\n`);
      process.exit(1);
    }
  } catch (err) {
    console.log(`  ✗ Login request failed: ${err.message}`);
    process.exit(1);
  }

  // Test 3: Simple train number extraction
  console.log('\n[TEST 3] Simple train number extraction');
  try {
    const transcript = "I worked train 12951";
    const res = await fetch(`${BASE_URL}/api/ai/voice/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ transcript })
    });
    const data = await res.json();
    
    assert(res.status === 200, 'API returns 200 OK');
    assert(Array.isArray(data.updates), 'Response has updates array');
    
    const trainField = data.updates.find(u => u.field === 'trainNumber');
    assert(trainField !== undefined, 'trainNumber field extracted');
    if (trainField) {
      assert(trainField.value === '12951', `trainNumber value correct (got "${trainField.value}")`);
    }
    
    console.log(`  ℹ️  Extracted ${data.updates.length} fields:`, data.updates.map(u => u.field).join(', '));
  } catch (err) {
    console.log(`  ✗ Test failed: ${err.message}`);
  }

  // Test 4: Full journey extraction
  console.log('\n[TEST 4] Full journey with stations and train name');
  try {
    const transcript = "I worked train 12951 Mumbai Rajdhani Express from Mumbai Central to New Delhi on November 10";
    const res = await fetch(`${BASE_URL}/api/ai/voice/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ transcript })
    });
    const data = await res.json();
    
    assert(res.status === 200, 'API returns 200 OK');
    
    const trainName = data.updates.find(u => u.field === 'trainName');
    const depStation = data.updates.find(u => u.field === 'departureStation');
    const arrStation = data.updates.find(u => u.field === 'arrivalStation');
    
    assert(trainName !== undefined, 'trainName extracted');
    assert(depStation !== undefined, 'departureStation extracted');
    assert(arrStation !== undefined, 'arrivalStation extracted');
    
    console.log(`  ℹ️  Extracted ${data.updates.length} fields:`, data.updates.map(u => `${u.field}="${u.value}"`).join(', '));
  } catch (err) {
    console.log(`  ✗ Test failed: ${err.message}`);
  }

  // Test 5: Duty category extraction
  console.log('\n[TEST 5] Duty category keyword extraction');
  try {
    const transcript = "Ticket checking duty on train 12626";
    const res = await fetch(`${BASE_URL}/api/ai/voice/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ transcript })
    });
    const data = await res.json();
    
    assert(res.status === 200, 'API returns 200 OK');
    
    const dutyCategory = data.updates.find(u => u.field === 'dutyCategory');
    assert(dutyCategory !== undefined, 'dutyCategory extracted');
    if (dutyCategory) {
      assert(dutyCategory.value === 'TICKET_CHECKING', `dutyCategory correct (got "${dutyCategory.value}")`);
    }
  } catch (err) {
    console.log(`  ✗ Test failed: ${err.message}`);
  }

  // Test 6: Distance extraction
  console.log('\n[TEST 6] Distance in kilometers extraction');
  try {
    const transcript = "Distance was 1384 kilometers";
    const res = await fetch(`${BASE_URL}/api/ai/voice/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ transcript })
    });
    const data = await res.json();
    
    assert(res.status === 200, 'API returns 200 OK');
    
    const distanceField = data.updates.find(u => u.field === 'distanceKm');
    assert(distanceField !== undefined, 'distanceKm extracted');
    if (distanceField) {
      assert(Number(distanceField.value) === 1384, `distanceKm value correct (got ${distanceField.value})`);
    }
  } catch (err) {
    console.log(`  ✗ Test failed: ${err.message}`);
  }

  // Test 7: Complex multi-field extraction
  console.log('\n[TEST 7] Complex transcript with multiple fields');
  try {
    const transcript = "I worked train 12951 from Mumbai Central to New Delhi on November 10, departed at 5:30 PM, ticket checking duty, distance 1384 km, delayed 30 minutes";
    const res = await fetch(`${BASE_URL}/api/ai/voice/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ transcript })
    });
    const data = await res.json();
    
    assert(res.status === 200, 'API returns 200 OK');
    assert(data.updates.length >= 4, `Extracted multiple fields (got ${data.updates.length})`);
    
    const hasTrainNumber = data.updates.some(u => u.field === 'trainNumber');
    const hasStations = data.updates.some(u => u.field === 'departureStation' || u.field === 'arrivalStation');
    const hasDutyCategory = data.updates.some(u => u.field === 'dutyCategory');
    
    assert(hasTrainNumber, 'trainNumber present');
    assert(hasStations, 'Station fields present');
    assert(hasDutyCategory, 'dutyCategory present');
    
    console.log(`  ℹ️  Extracted fields:`, data.updates.map(u => u.field).join(', '));
    console.log(`  ℹ️  AI latency: ${data.latencyMs}ms`);
  } catch (err) {
    console.log(`  ✗ Test failed: ${err.message}`);
  }

  // Test 8: Empty transcript error handling
  console.log('\n[TEST 8] Empty transcript error handling');
  try {
    const res = await fetch(`${BASE_URL}/api/ai/voice/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ transcript: '' })
    });
    
    assert(res.status === 400, `Empty transcript returns 400 (got ${res.status})`);
  } catch (err) {
    console.log(`  ✗ Test failed: ${err.message}`);
  }

  // Test 9: Unauthenticated access
  console.log('\n[TEST 9] Unauthenticated access protection');
  try {
    const res = await fetch(`${BASE_URL}/api/ai/voice/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: 'test' })
    });
    
    assert(res.status === 401 || res.status === 403, `No auth returns 401/403 (got ${res.status})`);
  } catch (err) {
    console.log(`  ✗ Test failed: ${err.message}`);
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log(`  Total  : ${counters.passed + counters.failed}`);
  console.log(`  Passed : ${counters.passed}`);
  console.log(`  Failed : ${counters.failed}`);
  console.log('='.repeat(80));
  
  if (counters.failed === 0) {
    console.log('\n✅ All tests passed!\n');
  } else {
    console.log(`\n⚠️  ${counters.failed} test(s) failed\n`);
  }
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
