import aiService from '../services/aiService.js';
import fs from 'fs';

class OCRWorker {
  constructor() {
    this.jobs = new Map();
    this.maxRetries = 3;
  }

  enqueueOCRJob(filePath, mimeType) {
    const jobId = `job-ocr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Set initial queue state
    this.jobs.set(jobId, {
      id: jobId,
      status: 'processing',
      filePath,
      mimeType,
      retryCount: 0,
      result: null,
      error: null,
      createdAt: new Date()
    });

    // Start processing in the background (non-blocking)
    this.processJob(jobId);

    return jobId;
  }

  async processJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      // Read file buffer from disk
      if (!fs.existsSync(job.filePath)) {
        throw new Error('Upload file not found on disk.');
      }
      const fileBuffer = fs.readFileSync(job.filePath);

      console.log(`[OCRWorker] Starting processing for Job: ${jobId}`);
      const ocrResult = await aiService.parseDutySlip(job.mimeType, fileBuffer);

      // Clean up physical uploaded file immediately after success
      this.cleanupFile(job.filePath);

      // Transition to completed
      this.jobs.set(jobId, {
        ...job,
        status: 'completed',
        result: ocrResult,
        filePath: null // free ref
      });
      console.log(`[OCRWorker] Job ${jobId} completed successfully.`);
    } catch (error) {
      console.error(`[OCRWorker] Job ${jobId} failed:`, error.message);
      
      if (job.retryCount < this.maxRetries) {
        // Retry strategy transition
        job.retryCount += 1;
        this.jobs.set(jobId, {
          ...job,
          status: 'retry_pending'
        });
        console.log(`[OCRWorker] Scheduling retry ${job.retryCount} for job ${jobId} in 3 seconds...`);
        setTimeout(() => this.processJob(jobId), 3000);
      } else {
        // Dead-letter state transition
        this.cleanupFile(job.filePath);
        this.jobs.set(jobId, {
          ...job,
          status: 'failed',
          error: error.message || 'Maximum AI retries exceeded.',
          filePath: null
        });
        console.log(`[OCRWorker] Job ${jobId} entered dead-letter failed state.`);
      }
    }
  }

  getJobStatus(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return { status: 'not_found' };
    
    return {
      id: job.id,
      status: job.status,
      result: job.result,
      error: job.error,
      retryCount: job.retryCount
    };
  }

  cleanupFile(filePath) {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error(`[OCRWorker] File cleanup failed:`, err);
      }
    }
  }
}

export default new OCRWorker();
