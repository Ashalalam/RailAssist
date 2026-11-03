import User from '../models/User.js';

class UserRepository {
  async getById(id) {
    return await User.findById(id).select('-password');
  }

  async getByEmail(email) {
    return await User.findOne({ email });
  }

  async create(data) {
    return await User.create(data);
  }

  async update(id, data) {
    return await User.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true }
    ).select('-password');
  }

  async getAll() {
    return await User.find({}).select('-password').sort({ createdAt: -1 });
  }

  async delete(id) {
    return await User.findByIdAndDelete(id);
  }
}

export default new UserRepository();
