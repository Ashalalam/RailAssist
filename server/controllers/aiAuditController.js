import JourneyRepository from '../repositories/JourneyRepository.js';
import aiService from '../services/aiService.js';

class AIAuditController {
  async runAudit(req, res) {
    const { month } = req.query; // "YYYY-MM"
    const userId = req.user.id;

    if (!month) {
      return res.status(400).json({ message: 'Month query parameter is required.' });
    }

    try {
      // 1. Fetch journeys for target month
      const list = await JourneyRepository.getByMonth(userId, month);
      
      const warnings = [];
      let healthScore = 100;

      // 2. Deterministic Rule Engine
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        
        // Rule A: Negative duration check
        const dep = new Date(item.actualDeparture);
        const arr = new Date(item.actualArrival);
        if (arr <= dep) {
          warnings.push({
            type: 'NEGATIVE_DURATION',
            journeyId: item._id,
            trainNumber: item.trainNumber,
            description: `Journey for Train ${item.trainNumber} has arrival time before or equal to departure.`
          });
          healthScore -= 20;
        }

        // Rule B: Overlap checks
        const overlaps = await JourneyRepository.checkOverlaps(
          userId, 
          item.actualDeparture, 
          item.actualArrival, 
          item._id
        );
        if (overlaps.length > 0) {
          warnings.push({
            type: 'OVERLAPPING_SHIFT',
            journeyId: item._id,
            trainNumber: item.trainNumber,
            description: `Shift for Train ${item.trainNumber} overlaps with Train ${overlaps[0].trainNumber}.`
          });
          healthScore -= 25;
        }

        // Rule C: Mismatching station transit sequence check
        if (i > 0) {
          const previous = list[i - 1];
          if (previous.arrivalStation !== item.departureStation) {
            // Flag station mismatch
            warnings.push({
              type: 'STATION_SEQUENCE_MISMATCH',
              journeyId: item._id,
              trainNumber: item.trainNumber,
              description: `Transit gap: Previous shift ended at ${previous.arrivalStation}, but current shift starts at ${item.departureStation}.`
            });
            healthScore -= 10;
          }
        }
      }

      // Ensure health score doesn't drop below 0
      healthScore = Math.max(healthScore, 0);

      // 3. AI Explanation Gateway
      let aiExplanation = "Your report logbook looks clean and compliant. Ready to generate claim form!";
      if (warnings.length > 0) {
        const explanation = await aiService.explainAuditWarnings(warnings);
        aiExplanation = explanation.summary;
      }

      res.json({
        month,
        healthScore,
        journeyCount: list.length,
        warnings,
        aiExplanation
      });

    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new AIAuditController();
