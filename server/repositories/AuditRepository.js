import AuditLog from '../models/AuditLog.js';

class AuditRepository {
  async create(userId, action, details, ipAddress) {
    return await AuditLog.create({
      userId,
      action,
      details,
      ipAddress
    });
  }

  async getAll(limit = 100) {
    return await AuditLog.find({})
      .populate('userId', 'name email role')
      .sort({ timestamp: -1 })
      .limit(limit);
  }
}

export default new AuditRepository();
