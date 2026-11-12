import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import localDB from '../services/db';
import {
  Train as TrainIcon,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit2,
  Power,
  PowerOff,
  Plus,
  X,
  MapPin,
  Clock,
  Calendar,
  Info,
  AlertCircle
} from 'lucide-react';

const TrainDirectory = () => {
  const { user } = useAuth();
  const [trains, setTrains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrain, setSelectedTrain] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTrain, setEditingTrain] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [trainType, setTrainType] = useState('');
  const [fromStation, setFromStation] = useState('');
  const [toStation, setToStation] = useState('');
  const [isActive, setIsActive] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    number: '',
    name: '',
    fromStation: '',
    toStation: '',
    distanceKm: '',
    trainType: 'EXPRESS',
    intermediateStations: '',
    operatingDays: [],
    route: '',
    isActive: true
  });

  useEffect(() => {
    fetchTrains();
  }, [page, search, trainType, fromStation, toStation, isActive]);

  const fetchTrains = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(search && { search }),
        ...(trainType && { trainType }),
        ...(fromStation && { fromStation }),
        ...(toStation && { toStation }),
        ...(isActive !== '' && { isActive })
      });

      const response = await api.trains.getDirectory(params.toString());
      setTrains(response.trains);
      setTotalPages(response.pagination.pages);
      setTotal(response.pagination.total);
      setLastSync(new Date());

      // Cache in IndexedDB
      const db = await localDB.init();
      for (const train of response.trains) {
        await db.put('trains', train);
      }
    } catch (err) {
      console.error('Failed to fetch trains:', err);
      
      // Fallback to offline data
      try {
        const db = await localDB.init();
        let offlineTrains = await db.getAll('trains');
        
        // Apply filters to offline data
        if (search) {
          const lowerSearch = search.toLowerCase();
          offlineTrains = offlineTrains.filter(t => 
            t.number.toLowerCase().includes(lowerSearch) || 
            t.name.toLowerCase().includes(lowerSearch)
          );
        }
        if (trainType) {
          offlineTrains = offlineTrains.filter(t => t.trainType === trainType);
        }
        if (isActive !== '') {
          offlineTrains = offlineTrains.filter(t => t.isActive === (isActive === 'true'));
        }
        
        setTrains(offlineTrains.slice(0, 50));
        setTotal(offlineTrains.length);
        setTotalPages(Math.ceil(offlineTrains.length / 50));
      } catch (dbErr) {
        console.error('Failed to load offline trains:', dbErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (train) => {
    setSelectedTrain(train);
  };

  const handleAddTrain = () => {
    setEditingTrain(null);
    setFormData({
      number: '',
      name: '',
      fromStation: '',
      toStation: '',
      distanceKm: '',
      trainType: 'EXPRESS',
      intermediateStations: '',
      operatingDays: [],
      route: '',
      isActive: true
    });
    setShowForm(true);
  };

  const handleEditTrain = (train) => {
    setEditingTrain(train);
    setFormData({
      number: train.number,
      name: train.name,
      fromStation: train.fromStation,
      toStation: train.toStation,
      distanceKm: train.distanceKm.toString(),
      trainType: train.trainType || 'EXPRESS',
      intermediateStations: Array.isArray(train.intermediateStations) ? train.intermediateStations.join(', ') : '',
      operatingDays: train.operatingDays || [],
      route: train.route || '',
      isActive: train.isActive !== false
    });
    setShowForm(true);
  };

  const handleToggleActive = async (train) => {
    if (!user.isAdmin) {
      alert('Admin access required');
      return;
    }

    if (!window.confirm(`${train.isActive ? 'Deactivate' : 'Activate'} train ${train.number}?`)) return;

    try {
      await api.trains.toggleActive(train._id);
      fetchTrains();
      if (selectedTrain && selectedTrain._id === train._id) {
        setSelectedTrain(null);
      }
    } catch (err) {
      alert('Failed to update train status: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user.isAdmin) {
      alert('Admin access required');
      return;
    }

    try {
      const payload = {
        ...formData,
        distanceKm: parseFloat(formData.distanceKm) || 0,
        intermediateStations: formData.intermediateStations
          .split(',')
          .map(s => s.trim())
          .filter(s => s)
      };

      if (editingTrain) {
        await api.trains.update(editingTrain._id, payload);
      } else {
        await api.trains.create(payload);
      }

      setShowForm(false);
      fetchTrains();
    } catch (err) {
      alert('Failed to save train: ' + err.message);
    }
  };

  const handleDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      operatingDays: prev.operatingDays.includes(day)
        ? prev.operatingDays.filter(d => d !== day)
        : [...prev.operatingDays, day]
    }));
  };

  const clearFilters = () => {
    setSearch('');
    setTrainType('');
    setFromStation('');
    setToStation('');
    setIsActive('');
    setPage(1);
  };

  const trainTypes = ['RAJDHANI', 'SHATABDI', 'DURONTO', 'EXPRESS', 'SUPERFAST', 'MAIL', 'PASSENGER', 'LOCAL', 'SPECIAL', 'OTHER'];
  const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  return (
    <div className="app-container">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-white mb-1">Train Directory</h2>
          <p className="text-secondary-custom mb-0">
            Official Indian Railways train database ({total} trains)
            {lastSync && <span className="ms-2 small">• Last synced: {lastSync.toLocaleTimeString()}</span>}
          </p>
        </div>
        <div className="d-flex gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className="btn btn-saas-secondary d-flex align-items-center gap-2">
            <Filter size={16} />
            <span>Filters</span>
          </button>
          {user.isAdmin && (
            <button onClick={handleAddTrain} className="btn btn-glow-primary d-flex align-items-center gap-2">
              <Plus size={16} />
              <span>Add Train</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="card-saas mb-3">
        <div className="position-relative">
          <Search size={18} className="position-absolute text-secondary-custom" style={{ left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-control form-control-saas ps-5"
            placeholder="Search by train number or name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="card-saas mb-3">
          <h6 className="text-white mb-3">Filters</h6>
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label-saas">Train Type</label>
              <select className="form-select form-control-saas" value={trainType} onChange={(e) => { setTrainType(e.target.value); setPage(1); }}>
                <option value="">All Types</option>
                {trainTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label-saas">From Station</label>
              <input
                type="text"
                className="form-control form-control-saas"
                placeholder="e.g., NDLS"
                value={fromStation}
                onChange={(e) => { setFromStation(e.target.value); setPage(1); }}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label-saas">To Station</label>
              <input
                type="text"
                className="form-control form-control-saas"
                placeholder="e.g., MMCT"
                value={toStation}
                onChange={(e) => { setToStation(e.target.value); setPage(1); }}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label-saas">Status</label>
              <select className="form-select form-control-saas" value={isActive} onChange={(e) => { setIsActive(e.target.value); setPage(1); }}>
                <option value="">All Trains</option>
                <option value="true">Active Only</option>
                <option value="false">Inactive Only</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <button onClick={clearFilters} className="btn btn-saas-secondary btn-sm">Clear Filters</button>
          </div>
        </div>
      )}

      {/* Train List */}
      {loading ? (
        <div className="card-saas text-center py-5">
          <div className="spinner-border text-primary mb-3" role="status"></div>
          <p className="text-secondary-custom">Loading train directory...</p>
        </div>
      ) : trains.length === 0 ? (
        <div className="card-saas text-center py-5">
          <TrainIcon size={48} className="text-secondary-custom mb-3" />
          <h6 className="text-white mb-1">No Trains Found</h6>
          <p className="text-secondary-custom small mb-0">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <>
          <div className="card-saas p-0">
            <div className="table-responsive">
              <table className="table table-hover table-dark-custom mb-0">
                <thead>
                  <tr>
                    <th>Train Number</th>
                    <th>Train Name</th>
                    <th>Type</th>
                    <th>Route</th>
                    <th>Distance</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {trains.map(train => (
                    <tr key={train._id}>
                      <td>
                        <span className="badge bg-dark border border-secondary text-white">{train.number}</span>
                      </td>
                      <td className="text-white">{train.name}</td>
                      <td>
                        <span className="badge bg-primary-subtle text-primary" style={{ fontSize: '10px' }}>
                          {train.trainType || 'EXPRESS'}
                        </span>
                      </td>
                      <td className="text-secondary-custom">
                        {train.fromStation} → {train.toStation}
                      </td>
                      <td className="text-secondary-custom">{train.distanceKm} km</td>
                      <td>
                        {train.isActive !== false ? (
                          <span className="badge bg-success-subtle text-success">Active</span>
                        ) : (
                          <span className="badge bg-secondary-subtle text-secondary">Inactive</span>
                        )}
                      </td>
                      <td className="text-end">
                        <div className="d-flex gap-1 justify-content-end">
                          <button
                            onClick={() => handleViewDetails(train)}
                            className="btn btn-saas-secondary btn-sm p-1 px-2"
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>
                          {user.isAdmin && (
                            <>
                              <button
                                onClick={() => handleEditTrain(train)}
                                className="btn btn-saas-secondary btn-sm p-1 px-2"
                                title="Edit Train"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleToggleActive(train)}
                                className={`btn btn-saas-secondary btn-sm p-1 px-2 ${train.isActive ? 'text-danger' : 'text-success'}`}
                                title={train.isActive ? 'Deactivate' : 'Activate'}
                              >
                                {train.isActive ? <PowerOff size={14} /> : <Power size={14} />}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <p className="text-secondary-custom mb-0 small">
                Page {page} of {totalPages} ({total} total trains)
              </p>
              <div className="d-flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn btn-saas-secondary btn-sm"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn btn-saas-secondary btn-sm"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Train Details Modal */}
      {selectedTrain && (
        <div className="modal-overlay" onClick={() => setSelectedTrain(null)}>
          <div className="card-saas" style={{ maxWidth: '700px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="text-white mb-0">Train Details</h5>
              <button onClick={() => setSelectedTrain(null)} className="btn btn-sm p-1 border-0 bg-transparent text-secondary-custom">
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <div className="d-flex align-items-center gap-3 mb-3">
                <span className="badge bg-dark border border-secondary text-white" style={{ fontSize: '16px', padding: '8px 12px' }}>
                  {selectedTrain.number}
                </span>
                <h6 className="text-white mb-0">{selectedTrain.name}</h6>
              </div>
              
              <div className="d-flex gap-2 mb-3">
                <span className="badge bg-primary-subtle text-primary">{selectedTrain.trainType || 'EXPRESS'}</span>
                {selectedTrain.isActive !== false ? (
                  <span className="badge bg-success-subtle text-success">Active</span>
                ) : (
                  <span className="badge bg-secondary-subtle text-secondary">Inactive</span>
                )}
              </div>
            </div>

            <div className="row g-3">
              <div className="col-12">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <MapPin size={16} className="text-primary" />
                  <span className="text-secondary-custom small">Route</span>
                </div>
                <p className="text-white mb-0">{selectedTrain.fromStation} → {selectedTrain.toStation}</p>
                <p className="text-secondary-custom small mb-0">{selectedTrain.distanceKm} kilometers</p>
              </div>

              {selectedTrain.route && (
                <div className="col-12">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <Info size={16} className="text-primary" />
                    <span className="text-secondary-custom small">Route Description</span>
                  </div>
                  <p className="text-white mb-0">{selectedTrain.route}</p>
                </div>
              )}

              {selectedTrain.intermediateStations && selectedTrain.intermediateStations.length > 0 && (
                <div className="col-12">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <MapPin size={16} className="text-primary" />
                    <span className="text-secondary-custom small">Intermediate Stations</span>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {selectedTrain.intermediateStations.map((station, idx) => (
                      <span key={idx} className="badge bg-dark border border-secondary text-secondary-custom">
                        {station}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedTrain.operatingDays && selectedTrain.operatingDays.length > 0 && (
                <div className="col-12">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <Calendar size={16} className="text-primary" />
                    <span className="text-secondary-custom small">Operating Days</span>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {selectedTrain.operatingDays.map((day, idx) => (
                      <span key={idx} className="badge bg-primary-subtle text-primary">
                        {day}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(!selectedTrain.route && (!selectedTrain.intermediateStations || selectedTrain.intermediateStations.length === 0)) && (
                <div className="col-12">
                  <div className="alert alert-warning d-flex align-items-center gap-2" role="alert" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>
                    <AlertCircle size={16} />
                    <small>Detailed route information is not available for this train.</small>
                  </div>
                </div>
              )}
            </div>

            {user.isAdmin && (
              <div className="d-flex gap-2 mt-4">
                <button onClick={() => { handleEditTrain(selectedTrain); setSelectedTrain(null); }} className="btn btn-glow-primary">
                  Edit Train
                </button>
                <button onClick={() => { handleToggleActive(selectedTrain); }} className="btn btn-saas-secondary">
                  {selectedTrain.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Train Form Modal */}
      {showForm && user.isAdmin && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="card-saas" style={{ maxWidth: '700px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="text-white mb-0">{editingTrain ? 'Edit Train' : 'Add New Train'}</h5>
              <button onClick={() => setShowForm(false)} className="btn btn-sm p-1 border-0 bg-transparent text-secondary-custom">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-6">
                  <label className="form-label-saas">Train Number *</label>
                  <input
                    type="text"
                    className="form-control form-control-saas"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    required
                    disabled={!!editingTrain}
                  />
                </div>

                <div className="col-6">
                  <label className="form-label-saas">Train Type *</label>
                  <select className="form-select form-control-saas" value={formData.trainType} onChange={(e) => setFormData({ ...formData, trainType: e.target.value })} required>
                    {trainTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="col-12">
                  <label className="form-label-saas">Train Name *</label>
                  <input
                    type="text"
                    className="form-control form-control-saas"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="col-6">
                  <label className="form-label-saas">From Station *</label>
                  <input
                    type="text"
                    className="form-control form-control-saas"
                    value={formData.fromStation}
                    onChange={(e) => setFormData({ ...formData, fromStation: e.target.value })}
                    placeholder="e.g., NDLS"
                    required
                  />
                </div>

                <div className="col-6">
                  <label className="form-label-saas">To Station *</label>
                  <input
                    type="text"
                    className="form-control form-control-saas"
                    value={formData.toStation}
                    onChange={(e) => setFormData({ ...formData, toStation: e.target.value })}
                    placeholder="e.g., MMCT"
                    required
                  />
                </div>

                <div className="col-6">
                  <label className="form-label-saas">Distance (km) *</label>
                  <input
                    type="number"
                    className="form-control form-control-saas"
                    value={formData.distanceKm}
                    onChange={(e) => setFormData({ ...formData, distanceKm: e.target.value })}
                    required
                    min="0"
                  />
                </div>

                <div className="col-6">
                  <label className="form-label-saas">Status</label>
                  <select className="form-select form-control-saas" value={formData.isActive.toString()} onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>

                <div className="col-12">
                  <label className="form-label-saas">Intermediate Stations (comma-separated)</label>
                  <input
                    type="text"
                    className="form-control form-control-saas"
                    value={formData.intermediateStations}
                    onChange={(e) => setFormData({ ...formData, intermediateStations: e.target.value })}
                    placeholder="e.g., SUR, KYN, IGP"
                  />
                </div>

                <div className="col-12">
                  <label className="form-label-saas d-block mb-2">Operating Days</label>
                  <div className="d-flex flex-wrap gap-2">
                    {weekDays.map(day => (
                      <button
                        key={day}
                        type="button"
                        className={`btn btn-sm ${formData.operatingDays.includes(day) ? 'btn-primary' : 'btn-saas-secondary'}`}
                        onClick={() => handleDayToggle(day)}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="col-12">
                  <label className="form-label-saas">Route Description</label>
                  <textarea
                    className="form-control form-control-saas"
                    rows="3"
                    value={formData.route}
                    onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                    placeholder="Detailed route information..."
                  />
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2 mt-4">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-saas-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-glow-primary">
                  {editingTrain ? 'Update Train' : 'Add Train'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainDirectory;
