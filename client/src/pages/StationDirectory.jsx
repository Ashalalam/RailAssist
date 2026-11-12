import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import localDB from '../services/db';
import { 
  Search, 
  MapPin, 
  Plus, 
  Edit, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  CheckCircle,
  AlertCircle,
  Train
} from 'lucide-react';

const StationDirectory = () => {
  const { user, isOnline } = useAuth();
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');
  const [stationTypeFilter, setStationTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view'); // 'view', 'create', 'edit'

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    zone: 'OTHER',
    division: '',
    state: '',
    stationType: 'REGULAR',
    isActive: true
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const zones = ['CR', 'ER', 'ECR', 'ECoR', 'NR', 'NCR', 'NFR', 'NER', 'NWR', 'SR', 'SCR', 'SER', 'SECR', 'SWR', 'WR', 'WCR', 'OTHER'];
  const stationTypes = ['TERMINUS', 'JUNCTION', 'CENTRAL', 'HALT', 'REGULAR', 'OTHER'];

  useEffect(() => {
    loadStations();
  }, [searchQuery, zoneFilter, divisionFilter, stationTypeFilter, currentPage, isOnline]);

  const loadStations = async () => {
    setLoading(true);
    try {
      if (isOnline) {
        // Load from API
        const params = new URLSearchParams({
          page: currentPage,
          limit: 20,
          ...(searchQuery && { search: searchQuery }),
          ...(zoneFilter && { zone: zoneFilter }),
          ...(divisionFilter && { division: divisionFilter }),
          ...(stationTypeFilter && { stationType: stationTypeFilter })
        }).toString();

        const data = await api.stations.getAll(params);
        setStations(data.stations);
        setTotalPages(data.pagination.pages);

        // Cache stations in IndexedDB
        await localDB.init();
        for (const station of data.stations) {
          await localDB.put('stations', station);
        }
      } else {
        // Load from IndexedDB (offline)
        await localDB.init();
        let allStations = await localDB.getAll('stations');

        // Apply filters offline
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          allStations = allStations.filter(s => 
            s.name.toLowerCase().includes(query) || 
            s.code.toLowerCase().includes(query)
          );
        }
        if (zoneFilter) {
          allStations = allStations.filter(s => s.zone === zoneFilter);
        }
        if (divisionFilter) {
          allStations = allStations.filter(s => 
            s.division && s.division.toLowerCase().includes(divisionFilter.toLowerCase())
          );
        }
        if (stationTypeFilter) {
          allStations = allStations.filter(s => s.stationType === stationTypeFilter);
        }

        // Manual pagination
        const startIndex = (currentPage - 1) * 20;
        const endIndex = startIndex + 20;
        setStations(allStations.slice(startIndex, endIndex));
        setTotalPages(Math.ceil(allStations.length / 20));
      }
    } catch (error) {
      console.error('Failed to load stations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (mode, station = null) => {
    setModalMode(mode);
    setSelectedStation(station);
    setFormError('');
    setFormSuccess('');

    if (mode === 'create') {
      setFormData({
        code: '',
        name: '',
        zone: 'OTHER',
        division: '',
        state: '',
        stationType: 'REGULAR',
        isActive: true
      });
    } else if (mode === 'edit' && station) {
      setFormData({
        code: station.code,
        name: station.name,
        zone: station.zone,
        division: station.division || '',
        state: station.state || '',
        stationType: station.stationType,
        isActive: station.isActive
      });
    } else if (mode === 'view' && station) {
      setSelectedStation(station);
    }

    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedStation(null);
    setFormError('');
    setFormSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!isOnline) {
      setFormError('Cannot create/edit stations while offline');
      return;
    }

    try {
      if (modalMode === 'create') {
        await api.stations.create(formData);
        setFormSuccess('Station created successfully!');
        setTimeout(() => {
          handleCloseModal();
          loadStations();
        }, 1500);
      } else if (modalMode === 'edit') {
        await api.stations.update(formData.code, formData);
        setFormSuccess('Station updated successfully!');
        setTimeout(() => {
          handleCloseModal();
          loadStations();
        }, 1500);
      }
    } catch (error) {
      setFormError(error.message || 'Failed to save station');
    }
  };

  const handleDelete = async (code) => {
    if (!confirm(`Are you sure you want to delete station ${code}?`)) {
      return;
    }

    if (!isOnline) {
      alert('Cannot delete stations while offline');
      return;
    }

    try {
      await api.stations.delete(code);
      loadStations();
    } catch (error) {
      alert('Failed to delete station: ' + error.message);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setZoneFilter('');
    setDivisionFilter('');
    setStationTypeFilter('');
    setCurrentPage(1);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-white mb-2" style={{ fontSize: '24px', fontWeight: '700' }}>
            Station Directory
          </h2>
          <p className="text-secondary-custom mb-0" style={{ fontSize: '14px' }}>
            Railway station codes and information
          </p>
        </div>

        {user?.isAdmin && isOnline && (
          <button
            onClick={() => handleOpenModal('create')}
            className="btn btn-glow-primary px-4 d-inline-flex align-items-center gap-2"
          >
            <Plus size={18} />
            <span>Add Station</span>
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="card-saas mb-4">
        <div className="row g-3">
          {/* Search */}
          <div className="col-12 col-md-8">
            <div className="position-relative">
              <Search size={18} className="position-absolute text-secondary-custom" style={{ left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="form-control form-control-saas ps-5"
                placeholder="Search by station name or code..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <div className="col-12 col-md-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-saas-secondary w-100 d-flex align-items-center justify-content-center gap-2"
            >
              <Filter size={18} />
              <span>Filters</span>
              {(zoneFilter || divisionFilter || stationTypeFilter) && (
                <span className="badge bg-primary rounded-pill">
                  {[zoneFilter, divisionFilter, stationTypeFilter].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="col-12">
              <div className="border-top border-secondary pt-3 mt-2">
                <div className="row g-3">
                  <div className="col-12 col-md-4">
                    <label className="form-label-saas">Zone</label>
                    <select
                      className="form-select form-control-saas"
                      value={zoneFilter}
                      onChange={(e) => {
                        setZoneFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="">All Zones</option>
                      {zones.map(z => <option key={z} value={z}>{z}</option>)}
                    </select>
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label-saas">Division</label>
                    <input
                      type="text"
                      className="form-control form-control-saas"
                      placeholder="e.g. Mumbai"
                      value={divisionFilter}
                      onChange={(e) => {
                        setDivisionFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label-saas">Station Type</label>
                    <select
                      className="form-select form-control-saas"
                      value={stationTypeFilter}
                      onChange={(e) => {
                        setStationTypeFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="">All Types</option>
                      {stationTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                {(zoneFilter || divisionFilter || stationTypeFilter) && (
                  <button
                    onClick={handleClearFilters}
                    className="btn btn-sm btn-outline-danger mt-3 d-inline-flex align-items-center gap-2"
                  >
                    <X size={14} />
                    <span>Clear Filters</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="alert alert-info mb-4 d-flex align-items-center gap-2" style={{ fontSize: '13px' }}>
          <AlertCircle size={16} />
          <span>You are offline. Showing cached stations. Admin functions disabled.</span>
        </div>
      )}

      {/* Stations Grid */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : stations.length > 0 ? (
        <>
          <div className="row g-3 mb-4">
            {stations.map((station) => (
              <div key={station.code} className="col-12 col-md-6 col-lg-4">
                <div className="card-saas h-100">
                  <div className="d-flex align-items-start justify-content-between mb-3">
                    <div className="d-flex align-items-center gap-2">
                      <div className="rounded p-2" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)' }}>
                        <MapPin size={18} className="text-primary" />
                      </div>
                      <div>
                        <h5 className="text-white mb-0" style={{ fontSize: '14px', fontWeight: '600' }}>
                          {station.code}
                        </h5>
                        <span className="badge bg-dark border border-secondary text-secondary-custom mt-1" style={{ fontSize: '10px' }}>
                          {station.zone}
                        </span>
                      </div>
                    </div>

                    {station.isActive ? (
                      <CheckCircle size={16} className="text-success" />
                    ) : (
                      <AlertCircle size={16} className="text-danger" />
                    )}
                  </div>

                  <p className="text-white mb-2" style={{ fontSize: '13px', fontWeight: '500' }}>
                    {station.name}
                  </p>

                  <div className="d-flex align-items-center gap-2 mb-2">
                    {station.division && (
                      <span className="badge bg-dark text-secondary-custom border border-secondary" style={{ fontSize: '11px' }}>
                        {station.division}
                      </span>
                    )}
                    {station.stationType && station.stationType !== 'REGULAR' && (
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle" style={{ fontSize: '11px' }}>
                        {station.stationType}
                      </span>
                    )}
                  </div>

                  {station.state && (
                    <p className="text-secondary-custom mb-3" style={{ fontSize: '12px' }}>
                      {station.state}
                    </p>
                  )}

                  <div className="d-flex gap-2 mt-auto">
                    <button
                      onClick={() => handleOpenModal('view', station)}
                      className="btn btn-sm btn-saas-secondary flex-grow-1"
                    >
                      View
                    </button>
                    {user?.isAdmin && isOnline && (
                      <>
                        <button
                          onClick={() => handleOpenModal('edit', station)}
                          className="btn btn-sm btn-outline-info d-inline-flex align-items-center justify-content-center"
                          style={{ width: '36px' }}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(station.code)}
                          className="btn btn-sm btn-outline-danger d-inline-flex align-items-center justify-content-center"
                          style={{ width: '36px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex align-items-center justify-content-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn btn-saas-secondary px-3"
              >
                <ChevronLeft size={18} />
              </button>

              <span className="text-secondary-custom" style={{ fontSize: '14px' }}>
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-saas-secondary px-3"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="card-saas text-center py-5">
          <Train size={48} className="text-secondary-custom mx-auto mb-3" />
          <h5 className="text-white mb-2" style={{ fontSize: '16px' }}>No Stations Found</h5>
          <p className="text-secondary-custom mb-0" style={{ fontSize: '13px' }}>
            {searchQuery || zoneFilter || divisionFilter || stationTypeFilter
              ? 'Try adjusting your filters or search query'
              : 'No stations in the directory yet'}
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div 
          className="modal d-block" 
          style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
          onClick={handleCloseModal}
        >
          <div 
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
              <div className="modal-header border-bottom border-secondary">
                <h5 className="modal-title text-white">
                  {modalMode === 'view' ? 'Station Details' : modalMode === 'create' ? 'Add Station' : 'Edit Station'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
                  onClick={handleCloseModal}
                ></button>
              </div>

              <div className="modal-body">
                {modalMode === 'view' && selectedStation ? (
                  <div>
                    <div className="mb-3">
                      <label className="text-secondary-custom" style={{ fontSize: '12px' }}>Station Code</label>
                      <p className="text-white mb-0" style={{ fontSize: '16px', fontWeight: '600' }}>{selectedStation.code}</p>
                    </div>

                    <div className="mb-3">
                      <label className="text-secondary-custom" style={{ fontSize: '12px' }}>Station Name</label>
                      <p className="text-white mb-0">{selectedStation.name}</p>
                    </div>

                    <div className="row g-3 mb-3">
                      <div className="col-6">
                        <label className="text-secondary-custom" style={{ fontSize: '12px' }}>Zone</label>
                        <p className="text-white mb-0">{selectedStation.zone}</p>
                      </div>
                      <div className="col-6">
                        <label className="text-secondary-custom" style={{ fontSize: '12px' }}>Type</label>
                        <p className="text-white mb-0">{selectedStation.stationType}</p>
                      </div>
                    </div>

                    {selectedStation.division && (
                      <div className="mb-3">
                        <label className="text-secondary-custom" style={{ fontSize: '12px' }}>Division</label>
                        <p className="text-white mb-0">{selectedStation.division}</p>
                      </div>
                    )}

                    {selectedStation.state && (
                      <div className="mb-3">
                        <label className="text-secondary-custom" style={{ fontSize: '12px' }}>State</label>
                        <p className="text-white mb-0">{selectedStation.state}</p>
                      </div>
                    )}

                    <div className="mb-3">
                      <label className="text-secondary-custom" style={{ fontSize: '12px' }}>Status</label>
                      <p className="mb-0">
                        {selectedStation.isActive ? (
                          <span className="badge bg-success">Active</span>
                        ) : (
                          <span className="badge bg-danger">Inactive</span>
                        )}
                      </p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    {formError && (
                      <div className="alert alert-danger mb-3">
                        {formError}
                      </div>
                    )}

                    {formSuccess && (
                      <div className="alert alert-success mb-3">
                        {formSuccess}
                      </div>
                    )}

                    <div className="mb-3">
                      <label className="form-label-saas">Station Code *</label>
                      <input
                        type="text"
                        className="form-control form-control-saas"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        required
                        disabled={modalMode === 'edit'}
                        placeholder="e.g. NDLS"
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label-saas">Station Name *</label>
                      <input
                        type="text"
                        className="form-control form-control-saas"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="e.g. New Delhi"
                      />
                    </div>

                    <div className="row g-3 mb-3">
                      <div className="col-6">
                        <label className="form-label-saas">Zone *</label>
                        <select
                          className="form-select form-control-saas"
                          value={formData.zone}
                          onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                          required
                        >
                          {zones.map(z => <option key={z} value={z}>{z}</option>)}
                        </select>
                      </div>

                      <div className="col-6">
                        <label className="form-label-saas">Station Type *</label>
                        <select
                          className="form-select form-control-saas"
                          value={formData.stationType}
                          onChange={(e) => setFormData({ ...formData, stationType: e.target.value })}
                          required
                        >
                          {stationTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label-saas">Division</label>
                      <input
                        type="text"
                        className="form-control form-control-saas"
                        value={formData.division}
                        onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                        placeholder="e.g. Mumbai"
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label-saas">State</label>
                      <input
                        type="text"
                        className="form-control form-control-saas"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        placeholder="e.g. Maharashtra"
                      />
                    </div>

                    {modalMode === 'edit' && (
                      <div className="mb-3">
                        <div className="form-check">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id="isActive"
                            checked={formData.isActive}
                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                          />
                          <label className="form-check-label text-secondary-custom" htmlFor="isActive">
                            Station is active
                          </label>
                        </div>
                      </div>
                    )}

                    <div className="d-flex gap-2 justify-content-end mt-4">
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="btn btn-saas-secondary"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-glow-primary"
                        disabled={!!formSuccess}
                      >
                        {modalMode === 'create' ? 'Create Station' : 'Update Station'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StationDirectory;
