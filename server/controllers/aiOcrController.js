import ocrWorker from '../workers/ocrWorker.js';

class AIOcrController {
  async enqueueOCR(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No image file uploaded.' });
      }

      // Enqueue job in worker
      const jobId = ocrWorker.enqueueOCRJob(req.file.path, req.file.mimetype);
      
      // Instantly return 202 Accepted with jobId
      res.status(202).json({
        message: 'OCR job enqueued successfully.',
        jobId,
        status: 'processing'
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async checkStatus(req, res) {
    const { jobId } = req.params;
    try {
      const jobStatus = ocrWorker.getJobStatus(jobId);
      if (jobStatus.status === 'not_found') {
        return res.status(404).json({ message: 'Job not found.' });
      }
      res.json(jobStatus);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new AIOcrController();
