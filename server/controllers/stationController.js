import AuditLog from '../models/AuditLog.js';
import Station from '../models/Station.js';

class StationController {
  // GET /api/stations - List all stations with search and filters
  async getStations(req, res) {
    try {
      const {
        search = '',
        zone = '',
        division = '',
        stationType = '',
        isActive = '',
        page = 1,
        limit = 50
      } = req.query;

      const query = {};

      // Search by name or code
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { code: { $regex: search, $options: 'i' } }
        ];
      }

      // Filter by zone
      if (zone) {
        query.zone = zone;
      }

      // Filter by division
      if (division) {
        query.division = { $regex: division, $options: 'i' };
      }

      // Filter by station type
      if (stationType) {
        query.stationType = stationType;
      }

      // Filter by active status
      if (isActive !== '') {
        query.isActive = isActive === 'true';
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [stations, total] = await Promise.all([
        Station.find(query)
          .sort({ name: 1 })
          .limit(parseInt(limit))
          .skip(skip)
          .lean(),
        Station.countDocuments(query)
      ]);

      res.json({
        stations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('[StationController getStations]', error);
      res.status(500).json({ message: 'Failed to fetch stations' });
    }
  }

  // GET /api/stations/search - Quick search for autocomplete (no pagination)
  async searchStations(req, res) {
    try {
      const { q = '', limit = 10 } = req.query;

      if (!q || q.length < 2) {
        return res.json({ stations: [] });
      }

      const stations = await Station.find({
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { code: { $regex: q, $options: 'i' } }
        ],
        isActive: true
      })
        .sort({ name: 1 })
        .limit(parseInt(limit))
        .select('code name zone division stationType')
        .lean();

      res.json({ stations });
    } catch (error) {
      console.error('[StationController searchStations]', error);
      res.status(500).json({ message: 'Search failed' });
    }
  }

  // GET /api/stations/:code - Get single station by code
  async getStationByCode(req, res) {
    try {
      const { code } = req.params;

      const station = await Station.findOne({ code: code.toUpperCase() }).lean();

      if (!station) {
        return res.status(404).json({ message: 'Station not found' });
      }

      res.json(station);
    } catch (error) {
      console.error('[StationController getStationByCode]', error);
      res.status(500).json({ message: 'Failed to fetch station' });
    }
  }

  // POST /api/stations - Create new station (admin only)
  async createStation(req, res) {
    try {
      const { code, name, zone, division, state, stationType } = req.body;

      // Validate required fields
      if (!code || !name) {
        return res.status(400).json({ message: 'Station code and name are required' });
      }

      // Check for duplicate code
      const existing = await Station.findOne({ code: code.toUpperCase() });
      if (existing) {
        return res.status(400).json({ message: 'Station code already exists' });
      }

      const station = new Station({
        code: code.toUpperCase(),
        name,
        zone: zone || 'OTHER',
        division: division || '',
        state: state || '',
        stationType: stationType || 'REGULAR',
        isActive: true,
        createdBy: req.user.id,
        updatedBy: req.user.id
      });

      await station.save();

      // Log audit action
      try {
        await AuditLog.create({
          userId: req.user.id,
          action: 'STATION_CREATE',
          details: `Created station: ${station.code} (${station.name})`,
          ip: req.ip
        });
      } catch (logError) {
        console.error('[Audit Log Error]', logError);
      }

      res.status(201).json(station);
    } catch (error) {
      console.error('[StationController createStation]', error);
      res.status(500).json({ message: 'Failed to create station' });
    }
  }

  // PUT /api/stations/:code - Update station (admin only)
  async updateStation(req, res) {
    try {
      const { code } = req.params;
      const { name, zone, division, state, stationType, isActive } = req.body;

      const station = await Station.findOne({ code: code.toUpperCase() });

      if (!station) {
        return res.status(404).json({ message: 'Station not found' });
      }

      // Update fields if provided
      if (name !== undefined) station.name = name;
      if (zone !== undefined) station.zone = zone;
      if (division !== undefined) station.division = division;
      if (state !== undefined) station.state = state;
      if (stationType !== undefined) station.stationType = stationType;
      if (isActive !== undefined) station.isActive = isActive;

      station.updatedBy = req.user.id;

      await station.save();

      // Log audit action
      try {
        await AuditLog.create({
          userId: req.user.id,
          action: 'STATION_UPDATE',
          details: `Updated station: ${station.code} (${station.name})`,
          ip: req.ip
        });
      } catch (logError) {
        console.error('[Audit Log Error]', logError);
      }

      res.json(station);
    } catch (error) {
      console.error('[StationController updateStation]', error);
      res.status(500).json({ message: 'Failed to update station' });
    }
  }

  // DELETE /api/stations/:code - Delete station (admin only)
  async deleteStation(req, res) {
    try {
      const { code } = req.params;

      const station = await Station.findOneAndDelete({ code: code.toUpperCase() });

      if (!station) {
        return res.status(404).json({ message: 'Station not found' });
      }

      // Log audit action
      try {
        await AuditLog.create({
          userId: req.user.id,
          action: 'STATION_DELETE',
          details: `Deleted station: ${station.code} (${station.name})`,
          ip: req.ip
        });
      } catch (logError) {
        console.error('[Audit Log Error]', logError);
      }

      res.json({ message: 'Station deleted successfully' });
    } catch (error) {
      console.error('[StationController deleteStation]', error);
      res.status(500).json({ message: 'Failed to delete station' });
    }
  }

  // POST /api/stations/sync - Bulk sync for offline (read-only)
  async syncStations(req, res) {
    try {
      // Return all active stations for offline caching
      const stations = await Station.find({ isActive: true })
        .select('code name zone division stationType')
        .sort({ name: 1 })
        .limit(1000) // Reasonable limit for offline cache
        .lean();

      res.json({
        stations,
        syncTimestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[StationController syncStations]', error);
      res.status(500).json({ message: 'Sync failed' });
    }
  }
}

export default new StationController();
