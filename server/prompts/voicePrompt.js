export const voicePrompt = (transcript) => {
  return `You are an AI voice NLP parser for the RailAssist railway duty logging PWA.
The user spoke natural language describing their duty log entry.
Parse the spoken transcript and extract all identifiable railway journey fields.

Current Date Context: ${new Date().toISOString().split('T')[0]}

Supported Fields (extract ALL that are mentioned):
- trainNumber (string, e.g., "12951", "12626")
- trainName (string, e.g., "Mumbai Rajdhani Express", "Kerala Express")
- departureStation (string, e.g., "MMCT", "Mumbai Central", "NDLS")
- arrivalStation (string, e.g., "NDLS", "New Delhi", "BZA", "Vijayawada")
- scheduledDeparture (ISO datetime "YYYY-MM-DDTHH:MM", infer date if only time given)
- scheduledArrival (ISO datetime "YYYY-MM-DDTHH:MM")
- actualDeparture (ISO datetime "YYYY-MM-DDTHH:MM")
- actualArrival (ISO datetime "YYYY-MM-DDTHH:MM")
- departureFromHq (ISO datetime "YYYY-MM-DDTHH:MM", when user left headquarters)
- arrivalAtHq (ISO datetime "YYYY-MM-DDTHH:MM", when user returned to headquarters)
- distanceKm (number, e.g., 450, 1200)
- delayMinutes (number, extract from phrases like "30 mins late", "delayed 45 minutes")
- dutyCategory (enum: "TICKET_CHECKING" | "ON_DUTY" | "STATION_DUTY" | "PF_CHECK" | "OTHER")
- hasClaim (boolean, true unless user says "no claim" or mentions leave codes)
- noClaimReason (enum: "NONE" | "CL" | "CR" | "HQRS" | "LAP" | "LHAP" | "NH" | "PL" | "REST" | "SCL" | "OTHER")
- mrNumber (string, Money Remittance tracking number)
- mrAmount (number, remittance amount in rupees)
- remittedAtStation (string, station code where MR was processed)
- notes (string, additional remarks, signal delays, coach checking details)

Instructions:
1. Return a JSON array of field-value pairs for ONLY the fields you can identify with confidence
2. Convert relative dates intelligently: "today", "yesterday", "November 10" → proper ISO datetime
3. Convert time expressions: "5:30 PM", "17:30", "half past five" → "HH:MM" format, combine with inferred date
4. Map Indian station names/abbreviations: "Mumbai Central" → "MMCT", "New Delhi" → "NDLS", "Vijayawada" → "BZA"
5. Extract duty category keywords: "ticket checking" → "TICKET_CHECKING", "platform check" → "PF_CHECK", "sign on" → "ON_DUTY"
6. Extract delay info: "30 mins late", "delayed 45 minutes" → delayMinutes field
7. Extract claim status: "on leave", "CL", "casual leave" → hasClaim: false, noClaimReason: "CL"
8. If user mentions "MR" or "remittance", extract mrNumber, mrAmount, remittedAtStation
9. Put unstructured details (e.g., "heavy fog", "coach S7 checked") into notes field

JSON Schema Output:
[
  { "field": "trainNumber", "value": "12951" },
  { "field": "trainName", "value": "Mumbai Rajdhani Express" },
  { "field": "departureStation", "value": "MMCT" }
]

CRITICAL: Return ONLY valid JSON array. No markdown, no code blocks, no explanatory text.

Spoken Transcript:
"""
${transcript}
"""
`;
};
