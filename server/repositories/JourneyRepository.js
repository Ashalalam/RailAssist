import Journey from '../models/Journey.js';

class JourneyRepository {
  async create(data) {
    return await Journey.create(data);
  }

  async update(id, userId, data) {
    return await Journey.findOneAndUpdate(
      { _id: id, userId },
      { $set: data },
      { new: true }
    );
  }

  async delete(id, userId) {
    return await Journey.findOneAndDelete({ _id: id, userId });
  }

  async getById(id, userId) {
    return await Journey.findOne({ _id: id, userId });
  }

  async getAllByUser(userId) {
    return await Journey.find({ userId }).sort({ scheduledDeparture: -1 });
  }

  async getByMonth(userId, month) {
    // month is "YYYY-MM"
    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    return await Journey.find({
      userId,
      scheduledDeparture: {
        $gte: start,
        $lt: end
      }
    }).sort({ scheduledDeparture: 1 });
  }

  async checkOverlaps(userId, start, end, excludeId = null) {
    const query = {
      userId,
      $or: [
        {
          actualDeparture: { $lt: new Date(end) },
          actualArrival: { $gt: new Date(start) }
        }
      ]
    };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    return await Journey.find(query);
  }
}

export default new JourneyRepository();
