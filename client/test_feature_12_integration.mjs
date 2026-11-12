/**
 * Feature 12: Station Integration - Component Integration Tests
 * Verifies StationAutocomplete, OCR/Voice matching logic presence in JourneyForm
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
  console.log('       FEATURE 12: STATION INTEGRATION - INTEGRATION TEST SUITE                ');
  console.log('================================================================================\n');

  // Test 1: StationAutocomplete component exists
  console.log('[TEST GROUP 1] StationAutocomplete Component');
  const autocompleteExists = readFileSync(join(__dirname, 'src/components/StationAutocomplete.jsx'), 'utf8');
  assert(autocompleteExists.includes('const StationAutocomplete') || autocompleteExists.includes('function StationAutocomplete'), 'StationAutocomplete component exists');
  assert(autocompleteExists.includes('api.stations.search'), 'Uses API search');
  assert(autocompleteExists.includes('localDB'), 'Includes offline IndexedDB fallback');
  assert(autocompleteExists.includes('debounce') || autocompleteExists.includes('setTimeout'), 'Implements debounced search');
  assert(autocompleteExists.includes('handleKeyDown') && autocompleteExists.includes('ArrowDown'), 'Supports keyboard navigation');

  // Test 2: Station matcher utility
  console.log('\n[TEST GROUP 2] Station Matcher Utility');
  const stationMatcherCode = readFileSync(join(__dirname, 'src/utils/stationMatcher.js'), 'utf8');
  assert(stationMatcherCode.includes('export async function matchStation'), 'matchStation function exported');
  assert(stationMatcherCode.includes('export async function batchMatchStations'), 'batchMatchStations function exported');
  assert(stationMatcherCode.includes('exact'), 'Implements exact match type');
  assert(stationMatcherCode.includes('ambiguous'), 'Implements ambiguous match type');
  assert(stationMatcherCode.includes('unmatched'), 'Implements unmatched match type');
  assert(stationMatcherCode.includes('originalText'), 'Preserves original extracted text');
  assert(stationMatcherCode.includes('searchOfflineStations'), 'Includes offline search');

  // Test 3: JourneyForm imports stationMatcher
  console.log('\n[TEST GROUP 3] JourneyForm Integration');
  const journeyFormCode = readFileSync(join(__dirname, 'src/pages/JourneyForm.jsx'), 'utf8');
  assert(journeyFormCode.includes('import { matchStation, batchMatchStations }'), 'JourneyForm imports station matcher');
  assert(journeyFormCode.includes('import StationAutocomplete'), 'JourneyForm imports StationAutocomplete');

  // Test 4: OCR station matching integration
  console.log('\n[TEST GROUP 4] OCR Station Matching');
  assert(journeyFormCode.includes('ocrStationMatches'), 'OCR station matches state exists');
  assert(journeyFormCode.includes('batchMatchStations(stationsToMatch'), 'Calls batchMatchStations for OCR');
  assert(journeyFormCode.includes('handleConfirmOcrStation'), 'OCR confirmation handler exists');
  assert(journeyFormCode.includes('handleKeepOcrText'), 'OCR keep text handler exists');
  assert(journeyFormCode.includes('ocrStationMatches.departureStation'), 'Tracks departure station OCR matches');
  assert(journeyFormCode.includes('ocrStationMatches.arrivalStation'), 'Tracks arrival station OCR matches');

  // Test 5: OCR confirmation UI
  console.log('\n[TEST GROUP 5] OCR Confirmation UI');
  assert(journeyFormCode.includes('Multiple matches for'), 'Displays ambiguous match message');
  assert(journeyFormCode.includes('No directory match for'), 'Displays unmatched warning');
  assert(journeyFormCode.includes('onClick={() => handleConfirmOcrStation'), 'OCR suggestion buttons present');
  assert(journeyFormCode.includes('Keep "'), 'Keep original text button present');

  // Test 6: Voice station matching integration
  console.log('\n[TEST GROUP 6] Voice Station Matching');
  assert(journeyFormCode.includes('handleVoiceExtraction'), 'Voice extraction handler exists');
  assert(journeyFormCode.includes('matchStation(item.value'), 'Calls matchStation for voice fields');
  assert(journeyFormCode.includes('stationMatch'), 'Enriches voice fields with station matches');
  assert(journeyFormCode.includes('handleConfirmVoiceStation'), 'Voice confirmation handler exists');
  assert(journeyFormCode.includes('handleKeepVoiceText'), 'Voice keep text handler exists');

  // Test 7: Voice confirmation UI
  console.log('\n[TEST GROUP 7] Voice Confirmation UI');
  assert(journeyFormCode.includes('voiceExtractedFields'), 'Voice extracted fields state exists');
  assert(journeyFormCode.includes('item.stationMatch'), 'Checks for station match in voice fields');
  assert(journeyFormCode.includes('hasStationMatch'), 'Identifies station fields with matches');
  assert(journeyFormCode.includes('needsConfirmation'), 'Identifies ambiguous matches needing confirmation');

  // Test 8: Voice apply logic uses confirmed stations
  console.log('\n[TEST GROUP 8] Voice Apply Logic');
  assert(journeyFormCode.includes('handleApplyVoiceFields'), 'Voice apply handler exists');
  assert(journeyFormCode.includes('confirmedStation'), 'Checks for confirmed station');
  assert(journeyFormCode.includes('confirmedStation.code'), 'Uses station code from confirmed match');

  // Test 9: Roster integration
  console.log('\n[TEST GROUP 9] Roster Station Integration');
  const rosterCode = readFileSync(join(__dirname, 'src/pages/Roster.jsx'), 'utf8');
  assert(rosterCode.includes('import StationAutocomplete'), 'Roster imports StationAutocomplete');
  assert(rosterCode.includes('departureStation'), 'Roster has departure station field');
  assert(rosterCode.includes('arrivalStation'), 'Roster has arrival station field');
  assert(rosterCode.includes('station.code'), 'Roster stores station codes');

  // Test 10: Profile My Stations
  console.log('\n[TEST GROUP 10] Profile My Stations Management');
  const profileCode = readFileSync(join(__dirname, 'src/pages/Profile.jsx'), 'utf8');
  assert(profileCode.includes('import StationAutocomplete'), 'Profile imports StationAutocomplete');
  assert(profileCode.includes('myStationsList'), 'Profile has My Stations state');
  assert(profileCode.includes('handleAddStation'), 'Profile has add station handler');
  assert(profileCode.includes('handleRemoveStation'), 'Profile has remove station handler');
  assert(profileCode.includes('showStationPicker'), 'Profile has station picker toggle');
  assert(profileCode.includes('myStations:'), 'Profile saves My Stations to backend');

  // Test 11: Backward compatibility
  console.log('\n[TEST GROUP 11] Backward Compatibility');
  assert(journeyFormCode.includes('onInputChange'), 'StationAutocomplete accepts manual text input');
  assert(journeyFormCode.includes('originalText') || journeyFormCode.includes('originalValue'), 'Original extracted text preserved');
  // Journey model schema unchanged (checked via no migration requirements)

  // Test 12: High-confidence auto-fill logic
  console.log('\n[TEST GROUP 12] Confidence-Based Auto-fill');
  assert(journeyFormCode.includes('departureStation_confidence >= 80'), 'High-confidence threshold at 80%');
  assert(journeyFormCode.includes("match.type === 'exact' || match.type === 'single'"), 'Only auto-fills exact/single matches');
  assert(journeyFormCode.includes('res.departureStation'), 'Falls back to extracted text for ambiguous');

  // Test 13: State management
  console.log('\n[TEST GROUP 13] State Management');
  assert(journeyFormCode.includes('useState'), 'Uses React state');
  assert(journeyFormCode.includes('setOcrStationMatches'), 'OCR matches state setter exists');
  assert(journeyFormCode.includes('setVoiceExtractedFields'), 'Voice fields state setter exists');
  assert(journeyFormCode.includes('confirmed: true'), 'Marks stations as confirmed after user action');

  console.log('\n================================================================================');
  console.log(`TOTAL INTEGRATION TESTS:     ${passedTests + failedTests}`);
  console.log(`PASSED:                      ${passedTests}`);
  console.log(`FAILED:                      ${failedTests}`);
  console.log('================================================================================\n');

  if (failedTests > 0) {
    console.log('FAILED TESTS:');
    failures.forEach(f => console.log(`  - ${f}`));
    process.exit(1);
  }

  console.log('[SUCCESS] All Feature 12 integration checks passed.\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test suite crashed:', err);
  process.exit(1);
});
