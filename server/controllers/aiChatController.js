import JourneyRepository from '../repositories/JourneyRepository.js';
import aiService from '../services/aiService.js';

class AIChatController {
  async handleChat(req, res) {
    const { query } = req.body;
    const userId = req.user.id;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ message: 'Query cannot be empty.' });
    }

    try {
      // 1. Fetch user's journeys from Repository (RAG context)
      const userJourneys = await JourneyRepository.getAllByUser(userId);

      // 2. Prepare compiled summary data for RAG context injection
      const totalTA = userJourneys.reduce((sum, j) => sum + (j.taAmount || 0), 0);
      const totalNDA = userJourneys.reduce((sum, j) => sum + (j.ndaAmount || 0), 0);
      
      const monthlyBreakdowns = {};
      userJourneys.forEach(j => {
        const date = new Date(j.scheduledDeparture);
        const mStr = date.toISOString().substring(0, 7); // "YYYY-MM"
        if (!monthlyBreakdowns[mStr]) {
          monthlyBreakdowns[mStr] = { ta: 0, nda: 0, count: 0 };
        }
        monthlyBreakdowns[mStr].ta += j.taAmount || 0;
        monthlyBreakdowns[mStr].nda += j.ndaAmount || 0;
        monthlyBreakdowns[mStr].count += 1;
      });

      const contextData = {
        staffName: req.user.name,
        staffRole: req.user.role,
        division: req.user.division,
        totals: {
          totalJourneys: userJourneys.length,
          totalTA,
          totalNDA,
          combinedAllowance: totalTA + totalNDA
        },
        monthlySummary: monthlyBreakdowns,
        recentJourneys: userJourneys.slice(0, 10).map(j => ({
          trainNumber: j.trainNumber,
          trainName: j.trainName,
          route: `${j.departureStation}-${j.arrivalStation}`,
          date: j.scheduledDeparture.toISOString().substring(0, 10),
          ta: j.taAmount,
          nda: j.ndaAmount,
          notes: j.notes
        }))
      };

      // 3. Delegate to RAG context chat execution
      const chatResponse = await aiService.chatWithContext(query, contextData);
      
      res.json(chatResponse);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new AIChatController();
