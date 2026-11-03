/**
 * RailAssist Railway Allowance & Timezone Calculation Engine (Client-side)
 * 
 * Enforces Indian Standard Time (IST: Asia/Kolkata, UTC+05:30) for all railway
 * duty allowance and night duty calculations, independent of client or browser
 * local timezone.
 */

// Indian Standard Time is strictly UTC+05:30 (330 minutes, no Daylight Saving Time)
export const IST_OFFSET_MINUTES = 330;
export const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60 * 1000; // 19,800,000 ms

/**
 * Safely parses any date input into a JavaScript Date object representing the
 * exact instant in time. If a date string without timezone offset is provided
 * (e.g. from an HTML datetime-local input "2026-11-03T22:00"), it is deterministically
 * interpreted as Indian Standard Time (IST, +05:30).
 * 
 * Prevents double timezone conversion and guarantees identical parsing across
 * client local timezones.
 * 
 * @param {Date|string|number} input 
 * @returns {Date}
 */
export function parseAsIST(input) {
  if (!input) return new Date(NaN);
  if (input instanceof Date) return new Date(input.getTime());
  if (typeof input === 'number') return new Date(input);
  
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return new Date(NaN);

    // Matches standard ISO timezone indicators: 'Z' or '+05:30' or '-05:00' or '+0530'
    const hasTimezone = /Z$/i.test(trimmed) || /[+-]\d{2}:?\d{2}$/.test(trimmed);
    if (!hasTimezone) {
      // Replaces space with 'T' if format is "YYYY-MM-DD HH:mm:ss"
      const isoStandard = trimmed.replace(' ', 'T');
      return new Date(`${isoStandard}+05:30`);
    }
    return new Date(trimmed);
  }

  return new Date(NaN);
}

/**
 * Calculates Night Duty Hours in Indian Standard Time (22:00 to 06:00 IST).
 * 
 * Rules:
 * - Night duty window is 22:00 IST to 06:00 IST every day.
 * - Accurately handles shifts crossing midnight.
 * - Accurately handles multi-day shifts spanning multiple nights.
 * - Accurately calculates partial-hour and sub-hour overlaps with zero stepping errors.
 * - Guaranteed zero double-counting (disjoint window summation).
 * - Timezone-agnostic: Output is identical whether executed on UTC, EST, or IST host systems.
 * 
 * @param {Date|string|number} start Shift departure / commencement
 * @param {Date|string|number} end Shift arrival / completion
 * @returns {number} Night duty hours rounded to 2 decimal places
 */
export function calculateNightDutyHours(start, end) {
  const startDate = parseAsIST(start);
  const endDate = parseAsIST(end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate >= endDate) {
    return 0;
  }

  const startMs = startDate.getTime();
  const endMs = endDate.getTime();

  // Project UTC milliseconds into IST wall-clock representation
  const startIst = new Date(startMs + IST_OFFSET_MS);
  const endIst = new Date(endMs + IST_OFFSET_MS);

  // We iterate through every IST calendar day touched by the interval.
  const currentDay = new Date(Date.UTC(
    startIst.getUTCFullYear(),
    startIst.getUTCMonth(),
    startIst.getUTCDate() - 1
  ));

  const lastDay = new Date(Date.UTC(
    endIst.getUTCFullYear(),
    endIst.getUTCMonth(),
    endIst.getUTCDate()
  ));

  let totalNightMs = 0;

  while (currentDay <= lastDay) {
    const y = currentDay.getUTCFullYear();
    const m = currentDay.getUTCMonth();
    const d = currentDay.getUTCDate();

    // Night window start: 22:00 IST on day d
    const windowStartMs = Date.UTC(y, m, d, 22, 0, 0, 0) - IST_OFFSET_MS;
    // Night window end: 06:00 IST on day d+1
    const windowEndMs = Date.UTC(y, m, d + 1, 6, 0, 0, 0) - IST_OFFSET_MS;

    // Interval intersection: [startMs, endMs] ∩ [windowStartMs, windowEndMs]
    const overlapStart = Math.max(startMs, windowStartMs);
    const overlapEnd = Math.min(endMs, windowEndMs);

    if (overlapEnd > overlapStart) {
      totalNightMs += (overlapEnd - overlapStart);
    }

    currentDay.setUTCDate(currentDay.getUTCDate() + 1);
  }

  const hours = totalNightMs / (1000 * 60 * 60);
  return parseFloat(hours.toFixed(2));
}

/**
 * Calculates Traveling Allowance (TA) based on hours of absence from headquarters.
 * Preserves Indian Railways 7th Pay Commission allowance slabs:
 * - <= 6 hours absence: 30% of daily rate
 * - > 6 and <= 12 hours absence: 70% of daily rate
 * - > 12 hours absence: 100% of daily rate
 * - For each complete 24-hour block: 100% of daily rate
 * 
 * @param {Date|string|number} start Absence start from HQ
 * @param {Date|string|number} end Absence arrival at HQ
 * @param {number} dailyRate Role TA daily rate (default 800)
 * @returns {number} TA amount rounded to 2 decimal places
 */
export function calculateTA(start, end, dailyRate = 800) {
  const startDate = parseAsIST(start);
  const endDate = parseAsIST(end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate >= endDate) {
    return 0;
  }

  const diffMs = endDate.getTime() - startDate.getTime();
  const hours = diffMs / (1000 * 60 * 60);

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  let remainderTA = 0;
  if (remainingHours > 0) {
    if (remainingHours <= 6) {
      remainderTA = 0.3 * dailyRate;
    } else if (remainingHours <= 12) {
      remainderTA = 0.7 * dailyRate;
    } else {
      remainderTA = 1.0 * dailyRate;
    }
  }

  return parseFloat(((days * dailyRate) + remainderTA).toFixed(2));
}

/**
 * Calculates Night Duty Allowance (NDA) amount from night duty hours and hourly rate.
 * 
 * @param {number} nightDutyHours 
 * @param {number} hourlyRate 
 * @returns {number}
 */
export function calculateNDA(nightDutyHours, hourlyRate = 180) {
  const hours = typeof nightDutyHours === 'number' ? nightDutyHours : parseFloat(nightDutyHours) || 0;
  const rate = typeof hourlyRate === 'number' ? hourlyRate : parseFloat(hourlyRate) || 0;
  return parseFloat((hours * rate).toFixed(2));
}

// Client backward-compatibility aliases
export const calculateLocalNightDutyHours = calculateNightDutyHours;
export const calculateLocalTA = calculateTA;
export const calculateLocalNDA = calculateNDA;
