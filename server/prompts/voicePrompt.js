export const voicePrompt = (transcript) => {
  return `You are a voice commands NLP parser for the RailAssist PWA logbook.
The user spoke a brief update or diary log during their shift.
Parse the spoken text and map it to logbook fields. Return a valid JSON list of identified updates.

Supported Fields:
- trainNumber (string)
- departureStation (string)
- arrivalStation (string)
- actualDeparture (ISO datetime "YYYY-MM-DDTHH:MM")
- actualArrival (ISO datetime "YYYY-MM-DDTHH:MM")
- notes (string, containing additional comments)

Instructions:
1. Return a JSON array of objects, where each object represents a field update.
2. If the user said "started duty at VSKP 5:30 PM", you should output updates for actualDeparture and departureStation.
3. If they said "reached Vijayawada 30 mins late", output the arrivalStation as "BZA" (if you can map it, else "Vijayawada") and append the delay info into notes.

JSON Schema Output:
[
  { "field": "fieldName", "value": "fieldValue" }
]

Ensure you return ONLY pure JSON and no other text or markdown wrappers.

Spoken Transcript:
"""
${transcript}
"""
`;
};
