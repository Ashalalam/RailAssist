class AIResponseValidator {
  validateOCR(rawData) {
    try {
      const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      
      const schema = {
        trainNumber: data.trainNumber || null,
        trainNumber_confidence: Number(data.trainNumber_confidence) || 0,
        trainName: data.trainName || null,
        trainName_confidence: Number(data.trainName_confidence) || 0,
        departureStation: data.departureStation || null,
        departureStation_confidence: Number(data.departureStation_confidence) || 0,
        arrivalStation: data.arrivalStation || null,
        arrivalStation_confidence: Number(data.arrivalStation_confidence) || 0,
        scheduledDeparture: data.scheduledDeparture || null,
        scheduledDeparture_confidence: Number(data.scheduledDeparture_confidence) || 0,
        scheduledArrival: data.scheduledArrival || null,
        scheduledArrival_confidence: Number(data.scheduledArrival_confidence) || 0,
        actualDeparture: data.actualDeparture || null,
        actualDeparture_confidence: Number(data.actualDeparture_confidence) || 0,
        actualArrival: data.actualArrival || null,
        actualArrival_confidence: Number(data.actualArrival_confidence) || 0,
        distanceKm: Number(data.distanceKm) || 0,
        distanceKm_confidence: Number(data.distanceKm_confidence) || 0,
        coach: data.coach || null,
        coach_confidence: Number(data.coach_confidence) || 0
      };

      return { valid: true, data: schema };
    } catch (err) {
      return { valid: false, error: 'OCR JSON Parsing failed: ' + err.message };
    }
  }

  validateVoice(rawData) {
    try {
      const arr = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      if (!Array.isArray(arr)) throw new Error('Response is not a valid JSON array');

      const validated = arr.map(item => ({
        field: String(item.field),
        value: String(item.value)
      })).filter(item => ['trainNumber', 'departureStation', 'arrivalStation', 'actualDeparture', 'actualArrival', 'notes'].includes(item.field));

      return { valid: true, data: validated };
    } catch (err) {
      return { valid: false, error: 'Voice NLP validation failed: ' + err.message };
    }
  }

  validateChat(rawData) {
    try {
      const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      
      const schema = {
        answer: String(data.answer || 'I am sorry, I encountered an issue processing your query.'),
        action: ['NAVIGATE_REPORTS', 'OPEN_JOURNEY_FORM', 'NAVIGATE_ANALYTICS', 'NONE'].includes(data.action) ? data.action : 'NONE',
        params: data.params || {}
      };

      return { valid: true, data: schema };
    } catch (err) {
      return { 
        valid: true, // Graceful recovery
        data: {
          answer: typeof rawData === 'string' ? rawData : 'I encountered an issue formatting my response, but I am ready to help.',
          action: 'NONE',
          params: {}
        }
      };
    }
  }
}

export default new AIResponseValidator();
