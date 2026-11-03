/**
 * RailAssist Phase 2.2 Timezone & Calculation Verification Suite
 * 
 * Deterministically verifies:
 * 1. 21:59 IST: Before night-duty window.
 * 2. 22:00 IST: Night-duty window starts.
 * 3. 23:59 IST: Night-duty period (119 minutes).
 * 4. 00:00 IST: Midnight crossing.
 * 5. 05:59 IST: Night-duty period (119 minutes).
 * 6. 06:00 IST: Night-duty window ends.
 * 7. Shift spanning 22:00 to 06:00 (Full 8h night window).
 * 8. Shift spanning multiple days (Multi-night accumulation).
 * 9. Shift with no overlap with night-duty hours (Daytime shift).
 * 10. Multi-timezone invariance under different server runtime settings
 *     (UTC, America/New_York, Europe/London, Asia/Tokyo, Asia/Kolkata).
 * 11. Traveling Allowance (TA) 7th Pay Commission slab thresholds.
 */

import {
  calculateNightDutyHours,
  calculateTA,
  calculateNDA,
  parseAsIST
} from './utils/calculations.js';

let passedTotal = 0;
let failedTotal = 0;

function formatRow(name, start, end, expected, actual, passed) {
  const status = passed ? 'PASS' : 'FAIL';
  console.log(
    `| ${name.padEnd(30)} | ${start.padEnd(25)} | ${end.padEnd(25)} | ${expected.toString().padEnd(10)} | ${actual.toString().padEnd(10)} | [${status}] |`
  );
  if (passed) passedTotal++;
  else failedTotal++;
}

console.log('========================================================================================================');
console.log('                      RAILASSIST PHASE 2.2 TIMEZONE & ALLOWANCE VERIFICATION SUITE                      ');
console.log('========================================================================================================\n');

console.log('[SECTION 1] Night Duty Hours (22:00 - 06:00 IST Window Tests)\n');
console.log(`| ${'Test Case Description'.padEnd(30)} | ${'Start Timestamp (IST)'.padEnd(25)} | ${'End Timestamp (IST)'.padEnd(25)} | ${'Expected'.padEnd(10)} | ${'Actual'.padEnd(10)} | Status |`);
console.log('|--------------------------------|---------------------------|---------------------------|------------|------------|--------|');

const testCases = [
  {
    name: '1. 21:59 IST (Before window)',
    start: '2026-11-03T20:00:00+05:30',
    end: '2026-11-03T21:59:00+05:30',
    expected: 0.00
  },
  {
    name: '2a. Window start boundary',
    start: '2026-11-03T20:00:00+05:30',
    end: '2026-11-03T22:00:00+05:30',
    expected: 0.00
  },
  {
    name: '2b. 22:00 IST (Window begins)',
    start: '2026-11-03T22:00:00+05:30',
    end: '2026-11-03T23:00:00+05:30',
    expected: 1.00
  },
  {
    name: '3. 23:59 IST (Night period)',
    start: '2026-11-03T22:00:00+05:30',
    end: '2026-11-03T23:59:00+05:30',
    expected: 1.98 // 119 mins / 60 = 1.98333... -> 1.98
  },
  {
    name: '4. 00:00 IST (Midnight cross)',
    start: '2026-11-03T23:00:00+05:30',
    end: '2026-11-04T01:00:00+05:30',
    expected: 2.00
  },
  {
    name: '5. 05:59 IST (Night period)',
    start: '2026-11-04T04:00:00+05:30',
    end: '2026-11-04T05:59:00+05:30',
    expected: 1.98 // 119 mins / 60 = 1.98333... -> 1.98
  },
  {
    name: '6a. 06:00 IST (Window end)',
    start: '2026-11-04T05:00:00+05:30',
    end: '2026-11-04T06:00:00+05:30',
    expected: 1.00
  },
  {
    name: '6b. Post-06:00 IST (Daytime)',
    start: '2026-11-04T06:00:00+05:30',
    end: '2026-11-04T08:00:00+05:30',
    expected: 0.00
  },
  {
    name: '7. Full Night Shift (22-06)',
    start: '2026-11-03T22:00:00+05:30',
    end: '2026-11-04T06:00:00+05:30',
    expected: 8.00
  },
  {
    name: '8. Multi-day Shift (48h)',
    start: '2026-11-03T10:00:00+05:30',
    end: '2026-11-05T10:00:00+05:30',
    expected: 16.00 // 2 nights x 8h = 16h
  },
  {
    name: '9. Zero Overlap (Day Shift)',
    start: '2026-11-03T08:00:00+05:30',
    end: '2026-11-03T17:00:00+05:30',
    expected: 0.00
  },
  {
    name: 'Shift with pre/post overlap',
    start: '2026-11-03T21:30:00+05:30',
    end: '2026-11-04T06:30:00+05:30',
    expected: 8.00 // Capped strictly at 22:00 to 06:00
  },
  {
    name: 'Early morning shift (01-04)',
    start: '2026-11-04T01:00:00+05:30',
    end: '2026-11-04T04:00:00+05:30',
    expected: 3.00
  }
];

for (const tc of testCases) {
  const actual = calculateNightDutyHours(tc.start, tc.end);
  const passed = Math.abs(actual - tc.expected) < 0.001;
  formatRow(tc.name, tc.start, tc.end, tc.expected, actual, passed);
}

console.log('\n[SECTION 2] Timezone-Agnostic Invariance Tests');
console.log('Verifying identical calculation results under simulated runtime timezones...\n');

const tzEnvironments = [
  'UTC',
  'America/New_York',
  'Europe/London',
  'Asia/Tokyo',
  'Asia/Kolkata'
];

let tzAllPassed = true;
const targetStart = '2026-11-03T22:00:00+05:30';
const targetEnd = '2026-11-04T06:00:00+05:30';
const targetExpected = 8.00;

for (const tz of tzEnvironments) {
  process.env.TZ = tz;
  const result = calculateNightDutyHours(targetStart, targetEnd);
  const ok = Math.abs(result - targetExpected) < 0.001;
  console.log(`  TZ=${tz.padEnd(18)} -> Result: ${result} hrs (Expected: ${targetExpected} hrs) [${ok ? 'PASS' : 'FAIL'}]`);
  if (!ok) tzAllPassed = false;
}
if (tzAllPassed) passedTotal++;
else failedTotal++;

console.log('\n[SECTION 3] Timestamp Format Flexibility & Double-Conversion Prevention\n');

// 1. UTC ISO string vs IST ISO string vs Local input string without timezone
const utcIso = '2026-11-03T16:30:00.000Z'; // 22:00 IST
const istIso = '2026-11-03T22:00:00+05:30';
const localInput = '2026-11-03T22:00'; // Form input without offset

const parsedUtc = parseAsIST(utcIso);
const parsedIst = parseAsIST(istIso);
const parsedLocal = parseAsIST(localInput);

const timesMatch = (parsedUtc.getTime() === parsedIst.getTime()) && (parsedIst.getTime() === parsedLocal.getTime());
console.log(`  UTC ISO ("...16:30:00Z") Epoch ms:     ${parsedUtc.getTime()}`);
console.log(`  IST ISO ("...22:00:00+05:30") Epoch ms: ${parsedIst.getTime()}`);
console.log(`  Form Input ("...22:00") Epoch ms:       ${parsedLocal.getTime()}`);
console.log(`  All 3 parse to identical point in time: [${timesMatch ? 'PASS' : 'FAIL'}]\n`);
if (timesMatch) passedTotal++;
else failedTotal++;

console.log('[SECTION 4] Traveling Allowance (TA) 7th Pay Commission Slab Tests\n');
console.log(`| ${'Absence Duration / Slab'.padEnd(30)} | ${'Departure from HQ'.padEnd(25)} | ${'Arrival at HQ'.padEnd(25)} | ${'Expected TA'.padEnd(11)} | ${'Actual TA'.padEnd(11)} | Status |`);
console.log('|--------------------------------|---------------------------|---------------------------|-------------|-------------|--------|');

const taTestCases = [
  {
    name: 'Slab 1: <= 6h (4h absence @ 30%)',
    start: '2026-11-03T08:00:00+05:30',
    end: '2026-11-03T12:00:00+05:30',
    rate: 800,
    expected: 240.00 // 0.3 * 800
  },
  {
    name: 'Slab 1 boundary: exactly 6h (30%)',
    start: '2026-11-03T08:00:00+05:30',
    end: '2026-11-03T14:00:00+05:30',
    rate: 800,
    expected: 240.00 // 0.3 * 800
  },
  {
    name: 'Slab 2: 6h-12h (9h absence @ 70%)',
    start: '2026-11-03T08:00:00+05:30',
    end: '2026-11-03T17:00:00+05:30',
    rate: 800,
    expected: 560.00 // 0.7 * 800
  },
  {
    name: 'Slab 2 boundary: exactly 12h (70%)',
    start: '2026-11-03T08:00:00+05:30',
    end: '2026-11-03T20:00:00+05:30',
    rate: 800,
    expected: 560.00 // 0.7 * 800
  },
  {
    name: 'Slab 3: > 12h (16h absence @ 100%)',
    start: '2026-11-03T08:00:00+05:30',
    end: '2026-11-04T00:00:00+05:30',
    rate: 800,
    expected: 800.00 // 1.0 * 800
  },
  {
    name: 'Multi-day: 24h block + 4h (130%)',
    start: '2026-11-03T08:00:00+05:30',
    end: '2026-11-04T12:00:00+05:30',
    rate: 800,
    expected: 1040.00 // 1 * 800 + 0.3 * 800 = 1040
  }
];

for (const tc of taTestCases) {
  const actual = calculateTA(tc.start, tc.end, tc.rate);
  const passed = Math.abs(actual - tc.expected) < 0.01;
  formatRow(tc.name, tc.start, tc.end, tc.expected, actual, passed);
}

console.log('\n========================================================================================================');
console.log(`TOTAL TEST SUITES/ASSERTIONS: ${passedTotal + failedTotal}`);
console.log(`PASSED:                       ${passedTotal}`);
console.log(`FAILED:                       ${failedTotal}`);
console.log('========================================================================================================\n');

if (failedTotal > 0) process.exit(1);
else process.exit(0);
