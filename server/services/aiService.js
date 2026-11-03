import GeminiProvider from '../providers/GeminiProvider.js';
import { ocrPrompt } from '../prompts/ocrPrompt.js';
import { voicePrompt } from '../prompts/voicePrompt.js';
import { auditPrompt } from '../prompts/auditPrompt.js';
import { chatPrompt } from '../prompts/chatPrompt.js';
import aiResponseValidator from '../validators/aiResponseValidator.js';

class AIService {
  async parseDutySlip(mimeType, fileBuffer) {
    const prompt = ocrPrompt("Please extract train details from the attached sign-on slip image.");
    
    // Call abstract AI provider
    const result = await GeminiProvider.generate(prompt, mimeType, fileBuffer);
    
    // Validate output
    const validation = aiResponseValidator.validateOCR(result.text);
    if (!validation.valid) {
      console.warn('[AIService OCR Validation Warning]:', validation.error);
      throw new Error('AI returned an invalid OCR structured response.');
    }

    return {
      ...validation.data,
      latencyMs: result.durationMs
    };
  }

  async parseVoiceCommand(transcript) {
    const prompt = voicePrompt(transcript);
    const result = await GeminiProvider.generate(prompt);
    
    const validation = aiResponseValidator.validateVoice(result.text);
    if (!validation.valid) {
      throw new Error('AI returned an invalid Voice Command structured response.');
    }

    return {
      updates: validation.data,
      latencyMs: result.durationMs
    };
  }

  async explainAuditWarnings(warnings) {
    const prompt = auditPrompt(warnings);
    const result = await GeminiProvider.generate(prompt);
    
    return {
      summary: result.text,
      latencyMs: result.durationMs
    };
  }

  async chatWithContext(query, contextData) {
    const prompt = chatPrompt(query, contextData);
    const result = await GeminiProvider.generate(prompt);
    
    const validation = aiResponseValidator.validateChat(result.text);
    return {
      ...validation.data,
      latencyMs: result.durationMs
    };
  }
}

export default new AIService();
