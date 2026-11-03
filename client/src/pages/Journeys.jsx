import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useJourneys } from '../contexts/JourneyContext';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
  Search, 
  Calendar, 
  Trash2, 
  Edit2, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  RefreshCw,
  FolderOpen,
  Filter,
  MapPin,
  Clock,
  Navigation
} from 'lucide-react';

const Journeys = () => {
  const { journeys, templates, deleteJourney, createJourney, syncing, syncProgress, triggerManualSync, loading } = useJourneys();
  const navigate = useNavigate();
  const { isOnline } = useAuth();

  // Filter states
  const [search, setSearch] = useState('');
  const [syncFilter, setSyncFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sorting state
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset pagination to first page when search/filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, syncFilter, startDate, endDate]);

  const handleApplyTemplate = async (template) => {
    if (window.confirm(`Create a new journey using template "${template.templateName}"?`)) {
      try {
        const today = new Date();
        const depStr = `${today.toISOString().substring(0, 10)}T${template.scheduledDepartureTime}`;
        const arrStr = `${today.toISOString().substring(0, 10)}T${template.scheduledArrivalTime}`;
        
        const depDate = new Date(depStr);
        let arrDate = new Date(arrStr);
        if (arrDate < depDate) {
          arrDate.setDate(arrDate.getDate() + 1);
        }

        const journeyPayload = {
          trainNumber: template.trainNumber,
          trainName: template.trainName,
          departureStation: template.departureStation,
          arrivalStation: template.arrivalStation,
          scheduledDeparture: depDate.toISOString(),
          scheduledArrival: arrDate.toISOString(),
          actualDeparture: depDate.toISOString(),
          actualArrival: arrDate.toISOString(),
          departureFromHq: depDate.toISOString(),
          arrivalAtHq: arrDate.toISOString(),
          distanceKm: template.distanceKm || 0,
          delayMinutes: 0,
          notes: 'Created from saved template'
        };

        const created = await createJourney(journeyPayload);
        navigate(`/journeys/edit/${created.localId}`);
      } catch (err) {
        alert('Failed to log journey from template: ' + err.message);
      }
    }
  };

  const handleDelete = async (localId) => {
    if (window.confirm('Are you sure you want to delete this duty log entry?')) {
      await deleteJourney(localId);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filter computations
  const filteredJourneys = journeys.filter(j => {
    const matchesSearch = 
      j.trainNumber.toLowerCase().includes(search.toLowerCase()) ||
      j.trainName.toLowerCase().includes(search.toLowerCase()) ||
      j.departureStation.toLowerCase().includes(search.toLowerCase()) ||
      j.arrivalStation.toLowerCase().includes(search.toLowerCase());

    const matchesSync = 
      syncFilter === 'all' ||
      (syncFilter === 'synced' && j.syncStatus === 'synced') ||
      (syncFilter === 'pending' && j.syncStatus !== 'synced');

    const journeyDepDate = new Date(j.scheduledDeparture);
    const matchesStartDate = !startDate || journeyDepDate >= new Date(startDate + 'T00:00:00');
    const matchesEndDate = !endDate || journeyDepDate <= new Date(endDate + 'T23:59:59');

    return matchesSearch && matchesSync && matchesStartDate && matchesEndDate;
  });

  // Sort computations
  const sortedJourneys = [...filteredJourneys].sort((a, b) => {
    let aVal, bVal;
    if (sortField === 'date') {
      aVal = new Date(a.scheduledDeparture).getTime();
      bVal = new Date(b.scheduledDeparture).getTime();
    } else if (sortField === 'train') {
      aVal = parseInt(a.trainNumber) || 0;
      bVal = parseInt(b.trainNumber) || 0;
    } else if (sortField === 'distance') {
      aVal = a.distanceKm || 0;
      bVal = b.distanceKm || 0;
    } else if (sortField === 'allowance') {
      aVal = (a.taAmount || 0) + (a.ndaAmount || 0);
      bVal = (b.taAmount || 0) + (b.ndaAmount || 0);
    }
    
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination computations
  const totalItems = sortedJourneys.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedJourneys = sortedJourneys.slice(startIndex, startIndex + itemsPerPage);

  const hasUnsynced = journeys.some(j => j.syncStatus && j.syncStatus !== 'synced');

  return (
    <div className="app-container">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-white mb-1">Official Duty Logs</h2>
          <p className="text-secondary-custom mb-0">Record of shift duties, train operations, and allowance sheets</p>
        </div>
        <Link to="/journeys/new" className="btn btn-glow-primary py-2 px-3 d-flex align-items-center gap-2">
          <Plus size={16} />
          <span>Log Shift Duty</span>
        </Link>
      </div>

      {/* Sync Warning Banner */}
      {hasUnsynced && (
        <div className="alert alert-warning d-flex justify-content-between align-items-center mb-4 border-warning-subtle" style={{ backgroundColor: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.15)', borderRadius: '12px', padding: '16px' }}>
          <div className="d-flex align-items-center gap-2">
            <span className="rounded-circle bg-warning d-inline-block" style={{ width: '8px', height: '8px' }}></span>
            <span className="text-white small">Offline duty logs detected. Click Sync Now to publish logs to server.</span>
          </div>
          <button 
            onClick={async () => {
              try {
                await triggerManualSync();
              } catch (err) {
                alert('Sync failed: ' + err.message);
              }
            }}
            disabled={syncing}
            className="btn btn-saas-secondary py-1 px-3 btn-sm"
          >
            {syncing ? (
              <>
                <RefreshCw size={12} className="spin me-1" />
                Syncing {syncProgress}%
              </>
            ) : (
              <>
                <RefreshCw size={12} className="me-1" />
                Sync Now
              </>
            )}
          </button>
        </div>
      )}

      {/* Templates Carousel */}
      {templates.length > 0 && !loading && (
        <div className="card-saas mb-4 p-3" style={{ backgroundColor: 'var(--bg-surface)' }}>
          <span className="text-secondary-custom uppercase d-block mb-2 font-weight-semibold" style={{ fontSize: '11px', letterSpacing: '0.05em' }}>
            Saved Templates
          </span>
          <div className="d-flex gap-2 overflow-x-auto pb-1">
            {templates.map(t => (
              <button 
                key={t.id || t._id} 
                onClick={() => handleApplyTemplate(t)}
                className="btn btn-saas-secondary py-2 px-3 text-start flex-shrink-0"
                style={{ minWidth: '180px' }}
              >
                <div className="font-weight-bold text-white small mb-1 text-truncate" style={{ maxWidth: '150px' }}>
                  {t.templateName}
                </div>
                <div className="text-secondary-custom small text-truncate" style={{ fontSize: '11px', maxWidth: '150px' }}>
                  {t.trainNumber} • {t.departureStation} → {t.arrivalStation}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter Toolbar (Stripe style) */}
      <div className="card-saas mb-4" style={{ padding: '20px' }}>
        <div className="row g-2 align-items-center">
          {/* Search Input */}
          <div className="col-12 col-md-4 position-relative">
            <Search size={14} className="position-absolute text-secondary-custom" style={{ left: '20px', top: '15px' }} />
            <input 
              type="text" 
              className="form-control form-control-saas" 
              placeholder="Search train, number, or route..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
          </div>

          {/* Sync Status Filter */}
          <div className="col-12 col-sm-6 col-md-2">
            <select 
              className="form-select form-control-saas" 
              value={syncFilter}
              onChange={(e) => setSyncFilter(e.target.value)}
              style={{ 
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e")`, 
                backgroundPosition: 'right 0.75rem center', 
                backgroundSize: '16px 12px' 
              }}
            >
              <option value="all">All Syncs</option>
              <option value="synced">Synced</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* Date Range - Start */}
          <div className="col-6 col-sm-3 col-md-3">
            <input 
              type="date" 
              className="form-control form-control-saas"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date"
            />
          </div>

          {/* Date Range - End */}
          <div className="col-6 col-sm-3 col-md-3">
            <input 
              type="date" 
              className="form-control form-control-saas"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
            />
          </div>
        </div>
      </div>

      {/* Stripe-style Interactive Table */}
      <div className="card-saas p-0 overflow-hidden mb-3">
        <div className="table-responsive" style={{ maxHeight: 'calc(100vh - 380px)' }}>
          <table className="table table-hover table-dark-custom align-middle mb-0">
            <thead>
              <tr style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: 'var(--bg-surface)' }}>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('date')}>
                  <div className="d-flex align-items-center gap-1">
                    <span>Date</span>
                    <ArrowUpDown size={12} className="text-secondary-custom" />
                  </div>
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('train')}>
                  <div className="d-flex align-items-center gap-1">
                    <span>Train</span>
                    <ArrowUpDown size={12} className="text-secondary-custom" />
                  </div>
                </th>
                <th>Route</th>
                <th>Duty Hours</th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('distance')}>
                  <div className="d-flex align-items-center gap-1">
                    <span>Distance</span>
                    <ArrowUpDown size={12} className="text-secondary-custom" />
                  </div>
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('allowance')}>
                  <div className="d-flex align-items-center gap-1">
                    <span>Allowances</span>
                    <ArrowUpDown size={12} className="text-secondary-custom" />
                  </div>
                </th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // Table Row Skeleton Loaders
                [1, 2, 3, 4, 5].map(n => (
                  <tr key={n}>
                    <td><div className="skeleton skeleton-text" style={{ width: '70px', marginBottom: 0 }}></div></td>
                    <td>
                      <div className="skeleton skeleton-text" style={{ width: '50px', marginBottom: '4px' }}></div>
                      <div className="skeleton skeleton-text" style={{ width: '100px', marginBottom: 0, height: '10px' }}></div>
                    </td>
                    <td><div className="skeleton skeleton-text" style={{ width: '120px', marginBottom: 0 }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '80px', marginBottom: 0 }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '40px', marginBottom: 0 }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '60px', marginBottom: 0 }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '60px', marginBottom: 0 }}></div></td>
                    <td className="text-end"><div className="skeleton skeleton-text ms-auto" style={{ width: '90px', marginBottom: 0 }}></div></td>
                  </tr>
                ))
              ) : paginatedJourneys.length > 0 ? (
                paginatedJourneys.map(j => {
                  const depDate = new Date(j.scheduledDeparture);
                  const isSynced = j.syncStatus === 'synced';
                  const taAmt = j.taAmount || 0;
                  const ndaAmt = j.ndaAmount || 0;
                  const totAmt = taAmt + ndaAmt;

                  // Duty timing calculation
                  const actualDep = new Date(j.actualDeparture);
                  const actualArr = new Date(j.actualArrival);
                  let elapsedHours = 'N/A';
                  if (!isNaN(actualDep) && !isNaN(actualArr) && actualArr > actualDep) {
                    elapsedHours = `${((actualArr - actualDep) / (1000 * 60 * 60)).toFixed(1)}h`;
                  }

                  return (
                    <tr key={j.localId}>
                      <td className="font-weight-medium text-white">
                        {depDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td>
                        <span className="badge bg-dark border border-secondary text-white font-weight-semibold">{j.trainNumber}</span>
                        <small className="text-secondary-custom d-block mt-1 text-truncate" style={{ fontSize: '11px', maxWidth: '160px' }}>
                          {j.trainName}
                        </small>
                      </td>
                      <td className="text-secondary-custom">
                        <div className="d-flex align-items-center gap-1">
                          <span>{j.departureStation}</span>
                          <span className="text-muted" style={{ fontSize: '10px' }}>→</span>
                          <span>{j.arrivalStation}</span>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-1 text-secondary-custom" style={{ fontSize: '13px' }}>
                          <Clock size={12} className="text-secondary" />
                          <span>{elapsedHours}</span>
                          <small className="text-muted" style={{ fontSize: '10px' }}>({j.nightDutyHours}h Night)</small>
                        </div>
                      </td>
                      <td className="text-secondary-custom">{j.distanceKm} km</td>
                      <td>
                        <span className="text-success font-weight-medium">₹{taAmt}</span>
                        <small className="text-secondary-custom d-block" style={{ fontSize: '10px' }}>NDA: ₹{ndaAmt}</small>
                      </td>
                      <td>
                        {isSynced ? (
                          <span className="badge-custom badge-synced" style={{ fontSize: '10px' }}>
                            Synced
                          </span>
                        ) : (
                          <span className="badge-custom badge-pending" style={{ fontSize: '10px' }}>
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="text-end">
                        <div className="d-flex gap-1 justify-content-end">
                          <Link to={`/journeys/edit/${j.localId}`} className="btn btn-saas-secondary btn-sm p-1 px-2 border-0 bg-transparent text-secondary-custom hover-text-white">
                            <Edit2 size={14} />
                          </Link>
                          <button onClick={() => handleDelete(j.localId)} className="btn btn-saas-secondary btn-sm p-1 px-2 border-0 bg-transparent text-secondary-custom text-danger-hover">
                            <Trash2 size={14} className="text-danger" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-5">
                    <div className="d-flex flex-column align-items-center justify-content-center">
                      <FolderOpen size={40} className="text-secondary-custom mb-2" />
                      <h6 className="text-white mb-1">No Duty Logs Found</h6>
                      <p className="text-secondary-custom small mb-0">Modify search criteria or input a new shift record.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar (Stripe style) */}
        {!loading && totalItems > 0 && (
          <div className="d-flex justify-content-between align-items-center border-top border-secondary p-3 flex-wrap gap-2" style={{ backgroundColor: 'rgba(19, 23, 34, 0.2)' }}>
            <span className="text-secondary-custom small">
              Showing <span className="text-white font-weight-semibold">{startIndex + 1}</span> to <span className="text-white font-weight-semibold">{endIndex}</span> of <span className="text-white font-weight-semibold">{totalItems}</span> duty logs
            </span>
            <div className="d-flex gap-1">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                disabled={currentPage === 1}
                className="btn btn-saas-secondary btn-sm p-1 px-3 d-flex align-items-center gap-1"
              >
                <ChevronLeft size={13} />
                <span>Prev</span>
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                disabled={currentPage === totalPages}
                className="btn btn-saas-secondary btn-sm p-1 px-3 d-flex align-items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Journeys;
