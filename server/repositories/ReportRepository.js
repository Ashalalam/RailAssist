import ReportHistory from '../models/ReportHistory.js';

class ReportRepository {
  async create(data) {
    return await ReportHistory.create(data);
  }

  async getAllByUser(userId) {
    return await ReportHistory.find({ userId }).sort({ generatedAt: -1 });
  }

  async getById(id, userId) {
    return await ReportHistory.findOne({ _id: id, userId });
  }
}

export default new ReportRepository();
