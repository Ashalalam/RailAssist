import aiService from '../services/aiService.js';

class AIVoiceController {
  async parseVoice(req, res) {
    const { transcript } = req.body;
    
    if (!transcript || transcript.trim().length === 0) {
      return res.status(400).json({ message: 'Transcript cannot be empty.' });
    }

    try {
      const parsed = await aiService.parseVoiceCommand(transcript);
      res.json(parsed);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new AIVoiceController();
