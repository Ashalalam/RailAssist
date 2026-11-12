import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useDemoMode } from '../contexts/DemoModeContext';
import localDB from '../services/db';
import StationAutocomplete from '../components/StationAutocomplete';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Edit2, 
  Trash2, 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Train,
  ArrowRight,
  AlertCircle,
  FolderOpen,
  X
} from 'lucide-react';

const Roster = () => {
  const { user } = useAuth();
  const { isDemoMode, demoDutyRoster } = useDemoMode();
  const [rosters, setRosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRoster, setEditingRoster] = useState(null);
  const [view, setView] = useState('month');

  // Form states
  const [formData, setFormData] = useState({
    dutyDate: '',
    trainNumber: '',
    trainName: '',
    reportingTime: '',
    departureStation: '',
    arrivalStation: '',
    expectedDeparture: '',
    expectedArrival: '',
    dutyCategory: 'TICKET_CHECKING',
    remarks: ''
  });

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  useEffect(() => {
    fetchRosters();
  }, [currentMonth, currentYear]);

  const fetchRosters = async () => {
    try {
      setLoading(true);
      
      // DEMO MODE: Use synthetic roster data
      if (isDemoMode) {
        setRosters(demoDutyRoster || []);
        setLoading(false);
        return;
      }
      
      const response = await api.rosters.getAll(currentMonth + 1, currentYear);
      // Handle different response formats
      const rostersData = Array.isArray(response.data) ? response.data : (response.data?.rosters || response || []);
      setRosters(rostersData);
      
      // Cache rosters in IndexedDB
      if (Array.isArray(rostersData) && rostersData.length > 0) {
        const db = await localDB.init();
        await db.clear('rosters');
        for (const roster of rostersData) {
          await db.put('rosters', { ...roster, localId: roster._id || roster.localId });
        }
      }
    } catch (err) {
      console.error('Failed to fetch rosters:', err);
      
      // Fallback to offline data
      try {
        const db = await localDB.init();
        const offlineRosters = await db.getAll('rosters');
        const filteredRosters = offlineRosters.filter(r => {
          const rosterDate = new Date(r.dutyDate);
          return rosterDate.getMonth() === currentMonth && rosterDate.getFullYear() === currentYear;
        });
        setRosters(filteredRosters);
      } catch (dbErr) {
        console.error('Failed to load offline rosters:', dbErr);
        setRosters([]); // Set empty array as final fallback
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getDaysInMonth = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Previous month days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({ day: prevMonthLastDay - i, isCurrentMonth: false, isToday: false });
    }
    
    // Current month days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = day === today.getDate() && 
                      currentMonth === today.getMonth() && 
                      currentYear === today.getFullYear();
      days.push({ day, isCurrentMonth: true, isToday });
    }
    
    // Next month days
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({ day, isCurrentMonth: false, isToday: false });
    }
    
    return days;
  };

  const getRosterForDate = (day) => {
    if (!day.isCurrentMonth || !Array.isArray(rosters)) return [];
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
    return rosters.filter(r => {
      const rosterDate = new Date(r.dutyDate).toISOString().substring(0, 10);
      return rosterDate === dateStr;
    });
  };

  const handleDateClick = (day) => {
    if (!day.isCurrentMonth) return;
    const date = new Date(currentYear, currentMonth, day.day);
    setSelectedDate(date);
    setFormData({
      ...formData,
      dutyDate: date.toISOString().substring(0, 10)
    });
  };

  const handleAddRoster = () => {
    setEditingRoster(null);
    setFormData({
      dutyDate: selectedDate ? selectedDate.toISOString().substring(0, 10) : '',
      trainNumber: '',
      trainName: '',
      reportingTime: '',
      departureStation: '',
      arrivalStation: '',
      expectedDeparture: '',
      expectedArrival: '',
      dutyCategory: 'TICKET_CHECKING',
      remarks: ''
    });
    setShowForm(true);
  };

  const handleEditRoster = (roster) => {
    setEditingRoster(roster);
    setFormData({
      dutyDate: new Date(roster.dutyDate).toISOString().substring(0, 10),
      trainNumber: roster.trainNumber || '',
      trainName: roster.trainName || '',
      reportingTime: roster.reportingTime ? new Date(roster.reportingTime).toISOString().substring(0, 16) : '',
      departureStation: roster.departureStation || '',
      arrivalStation: roster.arrivalStation || '',
      expectedDeparture: roster.expectedDeparture ? new Date(roster.expectedDeparture).toISOString().substring(0, 16) : '',
      expectedArrival: roster.expectedArrival ? new Date(roster.expectedArrival).toISOString().substring(0, 16) : '',
      dutyCategory: roster.dutyCategory || 'TICKET_CHECKING',
      remarks: roster.remarks || ''
    });
    setShowForm(true);
  };

  const handleDeleteRoster = async (id) => {
    if (!window.confirm('Are you sure you want to delete this roster entry?')) return;
    
    // DEMO MODE: Prevent deleting real records
    if (isDemoMode) {
      alert('Demo Mode: Cannot delete roster entries. This is synthetic data for demonstration only.');
      return;
    }
    
    try {
      await api.rosters.delete(id);
      fetchRosters();
    } catch (err) {
      console.error('Failed to delete roster:', err);
      
      // Offline fallback
      try {
        const db = await localDB.init();
        await db.delete('rosters', id);
        fetchRosters();
        alert('Deleted offline. Will sync when online.');
      } catch (dbErr) {
        alert('Failed to delete roster: ' + err.message);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // DEMO MODE: Prevent creating/updating real records
    if (isDemoMode) {
      alert('Demo Mode: Cannot create or update roster entries. This is synthetic data for demonstration only.');
      return;
    }
    
    try {
      const payload = {
        ...formData,
        reportingTime: formData.reportingTime ? new Date(formData.reportingTime).toISOString() : null,
        expectedDeparture: formData.expectedDeparture ? new Date(formData.expectedDeparture).toISOString() : null,
        expectedArrival: formData.expectedArrival ? new Date(formData.expectedArrival).toISOString() : null,
        dutyDate: new Date(formData.dutyDate).toISOString(),
      };
      
      if (editingRoster) {
        await api.rosters.update(editingRoster._id, payload);
      } else {
        await api.rosters.create(payload);
      }
      
      setShowForm(false);
      fetchRosters();
    } catch (err) {
      console.error('Failed to save roster:', err);
      
      // Offline fallback
      try {
        const db = await localDB.init();
        const localId = editingRoster?._id || `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const rosterData = {
          ...formData,
          localId,
          _id: editingRoster?._id,
          reportingTime: formData.reportingTime ? new Date(formData.reportingTime).toISOString() : null,
          expectedDeparture: formData.expectedDeparture ? new Date(formData.expectedDeparture).toISOString() : null,
          expectedArrival: formData.expectedArrival ? new Date(formData.expectedArrival).toISOString() : null,
          dutyDate: new Date(formData.dutyDate).toISOString(),
          syncStatus: 'pending',
          userId: user._id
        };
        
        await db.put('rosters', rosterData);
        setShowForm(false);
        fetchRosters();
        alert('Saved offline. Will sync when online.');
      } catch (dbErr) {
        alert('Failed to save roster: ' + err.message);
      }
    }
  };

  const handleConvertToJourney = async (rosterId) => {
    if (!window.confirm('Convert this roster entry to a duty log? This will create a new journey record.')) return;
    
    // DEMO MODE: Prevent creating real records
    if (isDemoMode) {
      alert('Demo Mode: Cannot convert roster to journey. This is synthetic data for demonstration only.');
      return;
    }
    
    try {
      await api.rosters.convert(rosterId);
      alert('Roster converted to duty log successfully!');
      fetchRosters();
    } catch (err) {
      alert('Failed to convert roster: ' + err.message);
    }
  };

  const days = getDaysInMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="app-container">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-white mb-1">Duty Roster</h2>
          <p className="text-secondary-custom mb-0">Your scheduled duty assignments and roster calendar</p>
        </div>
        <button onClick={handleAddRoster} className="btn btn-glow-primary py-2 px-3 d-flex align-items-center gap-2">
          <Plus size={16} />
          <span>Add Roster Entry</span>
        </button>
      </div>

      {/* Calendar Controls */}
      <div className="card-saas mb-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <button onClick={handlePrevMonth} className="btn btn-saas-secondary btn-sm p-2">
              <ChevronLeft size={16} />
            </button>
            <h5 className="text-white mb-0 mx-2" style={{ minWidth: '180px', textAlign: 'center' }}>{monthName}</h5>
            <button onClick={handleNextMonth} className="btn btn-saas-secondary btn-sm p-2">
              <ChevronRight size={16} />
            </button>
            <button onClick={handleToday} className="btn btn-saas-secondary btn-sm px-3 ms-2">Today</button>
          </div>
          
          <div className="d-flex gap-2">
            <button onClick={() => setView('month')} className={`btn btn-sm ${view === 'month' ? 'btn-glow-primary' : 'btn-saas-secondary'}`}>
              Month
            </button>
            <button onClick={() => setView('list')} className={`btn btn-sm ${view === 'list' ? 'btn-glow-primary' : 'btn-saas-secondary'}`}>
              List
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card-saas text-center py-5">
          <div className="spinner-border text-primary mb-3" role="status"></div>
          <p className="text-secondary-custom">Loading roster...</p>
        </div>
      ) : view === 'month' ? (
        /* Calendar View */
        <div className="card-saas p-0 overflow-hidden">
          <div className="table-responsive">
            <table className="table table-dark-custom mb-0" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr className="border-bottom border-secondary">
                  <th className="text-center text-secondary-custom" style={{ fontSize: '12px', fontWeight: '600', padding: '12px' }}>SUN</th>
                  <th className="text-center text-secondary-custom" style={{ fontSize: '12px', fontWeight: '600', padding: '12px' }}>MON</th>
                  <th className="text-center text-secondary-custom" style={{ fontSize: '12px', fontWeight: '600', padding: '12px' }}>TUE</th>
                  <th className="text-center text-secondary-custom" style={{ fontSize: '12px', fontWeight: '600', padding: '12px' }}>WED</th>
                  <th className="text-center text-secondary-custom" style={{ fontSize: '12px', fontWeight: '600', padding: '12px' }}>THU</th>
                  <th className="text-center text-secondary-custom" style={{ fontSize: '12px', fontWeight: '600', padding: '12px' }}>FRI</th>
                  <th className="text-center text-secondary-custom" style={{ fontSize: '12px', fontWeight: '600', padding: '12px' }}>SAT</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.ceil(days.length / 7) }, (_, weekIndex) => (
                  <tr key={weekIndex} className="border-bottom border-secondary">
                    {days.slice(weekIndex * 7, (weekIndex + 1) * 7).map((dayObj, dayIndex) => {
                      const dayRosters = getRosterForDate(dayObj);
                      return (
                        <td 
                          key={dayIndex}
                          onClick={() => handleDateClick(dayObj)}
                          className={`border-end border-secondary ${dayObj.isCurrentMonth ? 'cursor-pointer' : 'bg-dark'}`}
                          style={{ 
                            minHeight: '100px', 
                            verticalAlign: 'top', 
                            padding: '8px',
                            cursor: dayObj.isCurrentMonth ? 'pointer' : 'default',
                            opacity: dayObj.isCurrentMonth ? 1 : 0.3
                          }}
                        >
                          <div className={`small mb-1 ${dayObj.isToday ? 'badge bg-primary text-white' : (dayObj.isCurrentMonth ? 'text-white' : 'text-secondary-custom')}`}
                               style={{ fontSize: '11px', fontWeight: '600' }}>
                            {dayObj.day}
                          </div>
                          {dayRosters.map(roster => (
                            <div 
                              key={roster._id}
                              className="p-1 mb-1 rounded bg-primary-subtle border border-primary-subtle"
                              style={{ fontSize: '10px', cursor: 'pointer', backgroundColor: 'rgba(99, 102, 241, 0.1)' }}
                              onClick={(e) => { e.stopPropagation(); handleEditRoster(roster); }}
                            >
                              <div className="text-primary font-weight-bold text-truncate">{roster.trainNumber || 'TBD'}</div>
                              {roster.dutyCategory && (
                                <div className="text-secondary-custom text-truncate" style={{ fontSize: '9px' }}>
                                  {roster.dutyCategory.replace('_', ' ')}
                                </div>
                              )}
                            </div>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="card-saas p-0">
          {rosters.length === 0 ? (
            <div className="text-center py-5">
              <FolderOpen size={48} className="text-secondary-custom mb-3" />
              <h6 className="text-white mb-1">No Roster Entries</h6>
              <p className="text-secondary-custom small mb-0">No duty roster entries for this month.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-dark-custom mb-0">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Train</th>
                    <th>Route</th>
                    <th>Reporting Time</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rosters.map(roster => (
                    <tr key={roster._id}>
                      <td className="text-white font-weight-medium">
                        {new Date(roster.dutyDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </td>
                      <td>
                        {roster.trainNumber ? (
                          <>
                            <span className="badge bg-dark border border-secondary text-white">{roster.trainNumber}</span>
                            {roster.trainName && <small className="text-secondary-custom d-block mt-1 text-truncate" style={{ fontSize: '11px' }}>{roster.trainName}</small>}
                          </>
                        ) : (
                          <span className="text-secondary-custom">-</span>
                        )}
                      </td>
                      <td className="text-secondary-custom">
                        {roster.departureStation && roster.arrivalStation ? (
                          <>{roster.departureStation} → {roster.arrivalStation}</>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="text-secondary-custom">
                        {roster.reportingTime ? new Date(roster.reportingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td>
                        <span className="badge bg-dark border border-secondary text-secondary-custom" style={{ fontSize: '10px' }}>
                          {roster.dutyCategory?.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        {roster.journeyId ? (
                          <span className="badge bg-success-subtle text-success">Converted</span>
                        ) : (
                          <span className="badge bg-warning-subtle text-warning">Scheduled</span>
                        )}
                      </td>
                      <td className="text-end">
                        <div className="d-flex gap-1 justify-content-end">
                          {!roster.journeyId && (
                            <button
                              onClick={() => handleConvertToJourney(roster._id)}
                              className="btn btn-saas-secondary btn-sm p-1 px-2 border-0 bg-transparent text-success"
                              title="Convert to Duty Log"
                            >
                              <ArrowRight size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => handleEditRoster(roster)}
                            className="btn btn-saas-secondary btn-sm p-1 px-2 border-0 bg-transparent text-secondary-custom hover-text-white"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteRoster(roster._id)}
                            className="btn btn-saas-secondary btn-sm p-1 px-2 border-0 bg-transparent text-danger"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Roster Form Modal */}
      {showForm && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowForm(false)}>
          <div className="card-saas" style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="text-white mb-0">{editingRoster ? 'Edit Roster Entry' : 'Add Roster Entry'}</h5>
              <button onClick={() => setShowForm(false)} className="btn btn-sm p-1 border-0 bg-transparent text-secondary-custom">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label-saas">Duty Date *</label>
                  <input
                    type="date"
                    className="form-control form-control-saas"
                    value={formData.dutyDate}
                    onChange={(e) => setFormData({ ...formData, dutyDate: e.target.value })}
                    required
                  />
                </div>
                
                <div className="col-6">
                  <label className="form-label-saas">Train Number</label>
                  <input
                    type="text"
                    className="form-control form-control-saas"
                    value={formData.trainNumber}
                    onChange={(e) => setFormData({ ...formData, trainNumber: e.target.value })}
                    placeholder="e.g., 12951"
                  />
                </div>
                
                <div className="col-6">
                  <label className="form-label-saas">Train Name</label>
                  <input
                    type="text"
                    className="form-control form-control-saas"
                    value={formData.trainName}
                    onChange={(e) => setFormData({ ...formData, trainName: e.target.value })}
                    placeholder="e.g., Rajdhani"
                  />
                </div>
                
                <div className="col-6">
                  <StationAutocomplete
                    label="From Station"
                    value={formData.departureStation}
                    onChange={(station) => {
                      if (station) {
                        setFormData({ ...formData, departureStation: station.code });
                      } else {
                        setFormData({ ...formData, departureStation: '' });
                      }
                    }}
                    onInputChange={(text) => setFormData({ ...formData, departureStation: text })}
                    placeholder="Search station..."
                  />
                </div>
                
                <div className="col-6">
                  <StationAutocomplete
                    label="To Station"
                    value={formData.arrivalStation}
                    onChange={(station) => {
                      if (station) {
                        setFormData({ ...formData, arrivalStation: station.code });
                      } else {
                        setFormData({ ...formData, arrivalStation: '' });
                      }
                    }}
                    onInputChange={(text) => setFormData({ ...formData, arrivalStation: text })}
                    placeholder="Search station..."
                  />
                </div>
                
                <div className="col-12">
                  <label className="form-label-saas">Reporting Time</label>
                  <input
                    type="datetime-local"
                    className="form-control form-control-saas"
                    value={formData.reportingTime}
                    onChange={(e) => setFormData({ ...formData, reportingTime: e.target.value })}
                  />
                </div>
                
                <div className="col-6">
                  <label className="form-label-saas">Expected Departure</label>
                  <input
                    type="datetime-local"
                    className="form-control form-control-saas"
                    value={formData.expectedDeparture}
                    onChange={(e) => setFormData({ ...formData, expectedDeparture: e.target.value })}
                  />
                </div>
                
                <div className="col-6">
                  <label className="form-label-saas">Expected Arrival</label>
                  <input
                    type="datetime-local"
                    className="form-control form-control-saas"
                    value={formData.expectedArrival}
                    onChange={(e) => setFormData({ ...formData, expectedArrival: e.target.value })}
                  />
                </div>
                
                <div className="col-12">
                  <label className="form-label-saas">Duty Category *</label>
                  <select
                    className="form-select form-control-saas"
                    value={formData.dutyCategory}
                    onChange={(e) => setFormData({ ...formData, dutyCategory: e.target.value })}
                    required
                    style={{ 
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e")`, 
                      backgroundPosition: 'right 0.75rem center', 
                      backgroundSize: '16px 12px' 
                    }}
                  >
                    <option value="TICKET_CHECKING">Ticket Checking</option>
                    <option value="ON_DUTY">On Duty</option>
                    <option value="STATION_DUTY">Station Duty</option>
                    <option value="PF_CHECK">PF Check</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                
                <div className="col-12">
                  <label className="form-label-saas">Remarks</label>
                  <textarea
                    className="form-control form-control-saas"
                    rows="3"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              
              <div className="d-flex justify-content-end gap-2 mt-4">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-saas-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-glow-primary">
                  {editingRoster ? 'Update' : 'Add'} Roster Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roster;
