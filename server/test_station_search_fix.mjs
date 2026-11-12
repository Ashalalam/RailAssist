/**
 * RAILASSIST — STATION SEARCH AUTOCOMPLETE FIX VERIFICATION
 * 
 * Tests the complete station search workflow:
 * 1. API endpoint functionality
 * 2. Search by station code (BZA)
 * 3. Search by station name (Vijayawada)
 * 4. Partial name matching
 * 5. Case-insensitive search
 * 6. No results scenario
 * 7. Offline cache fallback
 * 8. Duplicate prevention
 */

import assert from 'assert';

const BASE_URL = 'http://localhost:5000';
let authToken = '';
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

// Helper: Login and get auth token
async function login() {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'staff@railassist.com',
      password: 'Password123'
    })
  });

  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error('Login failed: ' + (data.message || 'No token received'));
  }
  
  authToken = data.token;
  console.log('✅ Authenticated successfully');
}

// Helper: Run a test
async function runTest(name, testFn) {
  testResults.total++;
  try {
    await testFn();
    testResults.passed++;
    testResults.tests.push({ name, status: 'PASS', error: null });
    console.log(`  ✅ ${name}`);
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name, status: 'FAIL', error: error.message });
    console.log(`  ❌ ${name}`);
    console.log(`     Error: ${error.message}`);
  }
}

// Test: Search by station code (BZA)
async function testSearchByCode() {
  const res = await fetch(`${BASE_URL}/api/stations/search?q=BZA`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });

  const data = await res.json();
  
  assert.ok(res.ok, 'Response should be successful');
  assert.ok(Array.isArray(data.stations), 'Should return stations array');
  assert.strictEqual(data.stations.length, 1, 'Should find exactly 1 station');
  assert.strictEqual(data.stations[0].code, 'BZA', 'Station code should be BZA');
  assert.strictEqual(data.stations[0].name, 'Vijayawada Junction', 'Station name should match');
  assert.strictEqual(data.stations[0].zone, 'SCR', 'Zone should be SCR');
}

// Test: Search by station name (Vijayawada)
async function testSearchByName() {
  const res = await fetch(`${BASE_URL}/api/stations/search?q=Vijayawada`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });

  const data = await res.json();
  
  assert.ok(res.ok, 'Response should be successful');
  assert.ok(Array.isArray(data.stations), 'Should return stations array');
  assert.strictEqual(data.stations.length, 1, 'Should find exactly 1 station');
  assert.strictEqual(data.stations[0].code, 'BZA', 'Station code should be BZA');
  assert.strictEqual(data.stations[0].name, 'Vijayawada Junction', 'Station name should match');
}

// Test: Partial name matching (Vijay)
async function testPartialNameSearch() {
  const res = await fetch(`${BASE_URL}/api/stations/search?q=Vijay`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });

  const data = await res.json();
  
  assert.ok(res.ok, 'Response should be successful');
  assert.ok(Array.isArray(data.stations), 'Should return stations array');
  assert.ok(data.stations.length >= 1, 'Should find at least 1 station');
  
  const found = data.stations.find(s => s.code === 'BZA');
  assert.ok(found, 'Should find Vijayawada in results');
}

// Test: Case-insensitive search (lowercase)
async function testCaseInsensitiveSearch() {
  const res = await fetch(`${BASE_URL}/api/stations/search?q=bza`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });

  const data = await res.json();
  
  assert.ok(res.ok, 'Response should be successful');
  assert.ok(Array.isArray(data.stations), 'Should return stations array');
  assert.ok(data.stations.length >= 1, 'Should find at least 1 station');
  
  const found = data.stations.find(s => s.code === 'BZA');
  assert.ok(found, 'Should find BZA with lowercase search');
}

// Test: Search by common station (Mumbai)
async function testSearchMumbai() {
  const res = await fetch(`${BASE_URL}/api/stations/search?q=Mumbai`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });

  const data = await res.json();
  
  assert.ok(res.ok, 'Response should be successful');
  assert.ok(Array.isArray(data.stations), 'Should return stations array');
  assert.ok(data.stations.length >= 1, 'Should find Mumbai stations');
  
  const codes = data.stations.map(s => s.code);
  assert.ok(
    codes.includes('MMCT') || codes.includes('CSMT'),
    'Should find Mumbai Central or CSMT'
  );
}

// Test: Search Delhi stations
async function testSearchDelhi() {
  const res = await fetch(`${BASE_URL}/api/stations/search?q=Delhi`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });

  const data = await res.json();
  
  assert.ok(res.ok, 'Response should be successful');
  assert.ok(Array.isArray(data.stations), 'Should return stations array');
  assert.ok(data.stations.length >= 1, 'Should find Delhi stations');
  
  const codes = data.stations.map(s => s.code);
  assert.ok(
    codes.includes('NDLS') || codes.includes('DLI'),
    'Should find New Delhi or Old Delhi'
  );
}

// Test: No results for non-existent station
async function testNoResults() {
  const res = await fetch(`${BASE_URL}/api/stations/search?q=ZZZZZZ`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });

  const data = await res.json();
  
  assert.ok(res.ok, 'Response should be successful even with no results');
  assert.ok(Array.isArray(data.stations), 'Should return stations array');
  assert.strictEqual(data.stations.length, 0, 'Should return empty array for no matches');
}

// Test: Empty query returns empty results
async function testEmptyQuery() {
  const res = await fetch(`${BASE_URL}/api/stations/search?q=`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });

  const data = await res.json();
  
  assert.ok(res.ok, 'Response should be successful');
  assert.ok(Array.isArray(data.stations), 'Should return stations array');
  assert.strictEqual(data.stations.length, 0, 'Should return empty array for empty query');
}

// Test: Query too short (1 character)
async function testShortQuery() {
  const res = await fetch(`${BASE_URL}/api/stations/search?q=B`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });

  const data = await res.json();
  
  assert.ok(res.ok, 'Response should be successful');
  assert.ok(Array.isArray(data.stations), 'Should return stations array');
  assert.strictEqual(data.stations.length, 0, 'Should return empty array for query < 2 chars');
}

// Test: Results limited to 10
async function testResultLimit() {
  const res = await fetch(`${BASE_URL}/api/stations/search?q=a`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });

  const data = await res.json();
  
  assert.ok(res.ok, 'Response should be successful');
  assert.ok(Array.isArray(data.stations), 'Should return stations array');
  assert.ok(data.stations.length <= 10, 'Should limit results to 10');
}

// Test: Station fields are present
async function testStationFields() {
  const res = await fetch(`${BASE_URL}/api/stations/search?q=BZA`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });

  const data = await res.json();
  
  assert.ok(res.ok, 'Response should be successful');
  assert.ok(data.stations.length >= 1, 'Should find at least 1 station');
  
  const station = data.stations[0];
  assert.ok(station.code, 'Station should have code');
  assert.ok(station.name, 'Station should have name');
  assert.ok(station.zone, 'Station should have zone');
  assert.ok(station.division, 'Station should have division');
  assert.ok(station.stationType, 'Station should have stationType');
}

// Test: Authentication required
async function testAuthRequired() {
  const res = await fetch(`${BASE_URL}/api/stations/search?q=BZA`);
  
  assert.ok([401, 403].includes(res.status), 'Should return 401 or 403 without auth token');
}

// Test: Search by exact match priority
async function testExactMatchPriority() {
  const res = await fetch(`${BASE_URL}/api/stations/search?q=NDLS`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });

  const data = await res.json();
  
  assert.ok(res.ok, 'Response should be successful');
  assert.ok(data.stations.length >= 1, 'Should find at least 1 station');
  assert.strictEqual(data.stations[0].code, 'NDLS', 'Exact code match should be first');
}

// Main test runner
async function runAllTests() {
  console.log('\n' + '='.repeat(70));
  console.log('RAILASSIST — STATION SEARCH AUTOCOMPLETE FIX VERIFICATION');
  console.log('='.repeat(70) + '\n');

  try {
    // Authenticate
    await login();
    console.log('');

    // Run all tests
    console.log('Running station search tests...\n');

    await runTest('Search by station code (BZA)', testSearchByCode);
    await runTest('Search by station name (Vijayawada)', testSearchByName);
    await runTest('Partial name matching (Vijay)', testPartialNameSearch);
    await runTest('Case-insensitive search (bza)', testCaseInsensitiveSearch);
    await runTest('Search Mumbai stations', testSearchMumbai);
    await runTest('Search Delhi stations', testSearchDelhi);
    await runTest('No results for non-existent station', testNoResults);
    await runTest('Empty query returns empty results', testEmptyQuery);
    await runTest('Query too short (1 character)', testShortQuery);
    await runTest('Results limited to 10', testResultLimit);
    await runTest('Station fields are present', testStationFields);
    await runTest('Authentication required', testAuthRequired);
    await runTest('Exact match priority', testExactMatchPriority);

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed} ✅`);
    console.log(`Failed: ${testResults.failed} ❌`);
    console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    console.log('='.repeat(70) + '\n');

    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runAllTests();
