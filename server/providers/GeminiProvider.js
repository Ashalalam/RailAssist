import dotenv from 'dotenv';

dotenv.config();

class GeminiProvider {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
  }

  async generate(prompt, mimeType = null, fileBuffer = null) {
    if (!this.apiKey) {
      throw new Error('Gemini API Key is not configured. Set GEMINI_API_KEY in server/.env');
    }

    const url = `${this.baseUrl}?key=${this.apiKey}`;
    const parts = [{ text: prompt }];

    // If binary file buffer is provided, load it as inlineData
    if (fileBuffer && mimeType) {
      const base64Data = fileBuffer.toString('base64');
      parts.push({
        inlineData: {
          mimeType,
          data: base64Data
        }
      });
    }

    const payload = {
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    try {
      const startTime = Date.now();
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error?.message || `Gemini API HTTP Error: ${response.status}`);
      }

      const resJson = await response.json();
      const duration = Date.now() - startTime;
      
      const contentText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!contentText) throw new Error('Empty response returned from Gemini Model.');

      return {
        text: contentText.trim(),
        durationMs: duration
      };
    } catch (error) {
      console.error('[GeminiProvider Error]:', error.message);
      throw error;
    }
  }
}

export default new GeminiProvider();
