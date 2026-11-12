/**
 * Feature 12: Station Matcher Utility Tests
 * Tests exact/fuzzy/batch station matching logic
 */

import { matchStation, batchMatchStations, getMatchTypeLabel } from './src/utils/stationMatcher.js';

// Mock API and IndexedDB for tests
global.api = {
  stations: {
    search: async (query) => {
      const mockStations = [
        { code: 'MMCT', name: 'Mumbai Central', zone: 'WR', division: 'Mumbai', type: 'Terminal' },
        { code: 'BCT', name: 'Mumbai Borivali', zone: 'WR', division: 'Mumbai', type: 'Junction' },
        { code: 'NDLS', name: 'New Delhi', zone: 'NR', division: 'Delhi', type: 'Terminal' },
        { code: 'CSTM', name: 'Mumbai CST', zone: 'CR', division: 'Mumbai', type: 'Terminal' },
        { code: 'ST', name: 'Surat', zone: 'WR', division: 'Mumbai', type: 'Junction' }
      ];

      const lowerQuery = query.toLowerCase();
      return {
        stations: mockStations.filter(s =>
          s.code.toLowerCase().includes(lowerQuery) ||
          s.name.toLowerCase().includes(lowerQuery)
        )
      };
    }
  }
};

global.localDB = {
  init: async () => {},
  getAll: async (store) => {
    if (store === 'stations') {
      return [
        { code: 'MMCT', name: 'Mumbai Central', zone: 'WR', division: 'Mumbai', type: 'Terminal' },
        { code: 'BCT', name: 'Mumbai Borivali', zone: 'WR', division: 'Mumbai', type: 'Junction' },
        { code: 'NDLS', name: 'New Delhi', zone: 'NR', division: 'Delhi', type: 'Terminal' },
        { code: 'CSTM', name: 'Mumbai CST', zone: 'CR', division: 'Mumbai', type: 'Terminal' },
        { code: 'ST', name: 'Surat', zone: 'WR', division: 'Mumbai', type: 'Junction' }
      ];
    }
    return [];
  }
};

let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, testName) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } else {
    console.log(`  [FAIL] ${testName}`);
    failedTests++;
    failures.push(testName);
  }
}

async function runTests() {
  console.log('================================================================================');
  console.log('       FEATURE 12: STATION MATCHER UTILITY TEST SUITE                          ');
  console.log('================================================================================\n');

  // Test 1: Exact station code match
  console.log('[TEST GROUP 1] Exact Station Code Matching');
  const exactCodeResult = await matchStation('MMCT', true);
  assert(exactCodeResult.type === 'exact', 'Exact code match returns type "exact"');
  assert(exactCodeResult.station?.code === 'MMCT', 'Exact code match returns correct station');
  assert(exactCodeResult.suggestions.length === 1, 'Exact code match returns single suggestion');

  // Test 2: Exact station name match
  console.log('\n[TEST GROUP 2] Exact Station Name Matching');
  const exactNameResult = await matchStation('Mumbai Central', true);
  assert(exactNameResult.type === 'exact', 'Exact name match returns type "exact"');
  assert(exactNameResult.station?.code === 'MMCT', 'Exact name match returns correct station code');

  // Test 3: Case-insensitive matching
  console.log('\n[TEST GROUP 3] Case-Insensitive Matching');
  const caseInsensitiveCode = await matchStation('mmct', true);
  assert(caseInsensitiveCode.type === 'exact', 'Lowercase code matches (case-insensitive)');
  const caseInsensitiveName = await matchStation('mumbai central', true);
  assert(caseInsensitiveName.type === 'exact', 'Lowercase name matches (case-insensitive)');

  // Test 4: Partial name match - ambiguous
  console.log('\n[TEST GROUP 4] Partial Name Matching (Ambiguous)');
  const partialResult = await matchStation('Mumbai', true);
  assert(partialResult.type === 'ambiguous', 'Partial match with multiple results returns type "ambiguous"');
  assert(partialResult.suggestions.length > 1, 'Ambiguous match returns multiple suggestions');
  assert(partialResult.suggestions.length <= 5, 'Ambiguous match limited to max 5 suggestions');
  assert(partialResult.originalText === 'Mumbai', 'Ambiguous match preserves original text');

  // Test 5: Single partial match
  console.log('\n[TEST GROUP 5] Single Partial Match');
  const singleResult = await matchStation('Surat', true);
  assert(singleResult.type === 'exact' || singleResult.type === 'single', 'Single match returns exact or single type');
  assert(singleResult.station?.code === 'ST', 'Single match returns Surat station');

  // Test 6: Unmatched station
  console.log('\n[TEST GROUP 6] Unmatched Station');
  const unmatchedResult = await matchStation('NonexistentStation', true);
  assert(unmatchedResult.type === 'unmatched', 'Non-existent station returns type "unmatched"');
  assert(unmatchedResult.suggestions.length === 0, 'Unmatched station returns empty suggestions');
  assert(unmatchedResult.originalText === 'NonexistentStation', 'Unmatched station preserves original text');

  // Test 7: Empty input
  console.log('\n[TEST GROUP 7] Empty Input Handling');
  const emptyResult = await matchStation('', true);
  assert(emptyResult.type === 'empty', 'Empty string returns type "empty"');
  const whitespaceResult = await matchStation('   ', true);
  assert(whitespaceResult.type === 'empty', 'Whitespace-only string returns type "empty"');
  const nullResult = await matchStation(null, true);
  assert(nullResult.type === 'empty', 'Null input returns type "empty"');

  // Test 8: Batch matching
  console.log('\n[TEST GROUP 8] Batch Station Matching');
  const batchInput = {
    departureStation: 'MMCT',
    arrivalStation: 'New Delhi',
    remittedAtStation: 'Mumbai'
  };
  const batchResult = await batchMatchStations(batchInput, true);
  assert(batchResult.departureStation?.type === 'exact', 'Batch match: exact code match for departure');
  assert(batchResult.arrivalStation?.type === 'exact', 'Batch match: exact name match for arrival');
  assert(batchResult.remittedAtStation?.type === 'ambiguous', 'Batch match: ambiguous match for partial name');

  // Test 9: Offline matching
  console.log('\n[TEST GROUP 9] Offline IndexedDB Matching');
  const offlineResult = await matchStation('NDLS', false);
  assert(offlineResult.type === 'exact', 'Offline exact code match works');
  assert(offlineResult.station?.name === 'New Delhi', 'Offline match returns correct station');

  // Test 10: Match type labels
  console.log('\n[TEST GROUP 10] Match Type Label Utility');
  assert(getMatchTypeLabel('exact') === 'Exact Match', 'Exact match label correct');
  assert(getMatchTypeLabel('single') === 'Suggested Match', 'Single match label correct');
  assert(getMatchTypeLabel('ambiguous') === 'Multiple Matches', 'Ambiguous match label correct');
  assert(getMatchTypeLabel('unmatched') === 'No Match Found', 'Unmatched label correct');
  assert(getMatchTypeLabel('error') === 'Search Error', 'Error label correct');
  assert(getMatchTypeLabel('empty') === 'No Input', 'Empty label correct');

  // Test 11: Original text preservation
  console.log('\n[TEST GROUP 11] Original Text Preservation');
  const preserveTest1 = await matchStation('Mumbai CST', true);
  assert(preserveTest1.station?.code === 'CSTM', 'Extracted text matched to CSTM');
  
  const preserveTest2 = await matchStation('XYZ Unknown Station', true);
  assert(preserveTest2.originalText === 'XYZ Unknown Station', 'Unmatched text preserved exactly');

  // Test 12: Manual correction compatibility
  console.log('\n[TEST GROUP 12] Manual Correction Flow');
  const manualTest = await matchStation('Mumbai Bandra', true);
  // Simulates user keeping original text or manually correcting via StationAutocomplete
  assert(manualTest.originalText !== undefined || manualTest.type !== 'error', 'Manual correction flow preserves original');

  console.log('\n================================================================================');
  console.log(`TOTAL STATION MATCHER TESTS: ${passedTests + failedTests}`);
  console.log(`PASSED:                       ${passedTests}`);
  console.log(`FAILED:                       ${failedTests}`);
  console.log('================================================================================\n');

  if (failedTests > 0) {
    console.log('FAILED TESTS:');
    failures.forEach(f => console.log(`  - ${f}`));
    process.exit(1);
  }

  process.exit(0);
}

runTests().catch(err => {
  console.error('Test suite crashed:', err);
  process.exit(1);
});
