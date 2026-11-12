import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import localDB from '../services/db';
import StationAutocomplete from '../components/StationAutocomplete';
import { 
  User, 
  Lock, 
  ShieldAlert, 
  CheckCircle2,
  Trash2,
  Database,
  RefreshCw,
  AlertTriangle,
  Mail,
  Briefcase,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  Building2,
  Plus,
  X
} from 'lucide-react';

// Model/Cadre options based on designation
const MODEL_OPTIONS = {
  'Loco Pilot': [
    'WAP-4', 'WAP-5', 'WAP-7', 'WAG-5', 'WAG-7', 'WAG-9', 
    'WDM-2', 'WDM-3A', 'WDM-3D', 'WDP-4', 'WDP-4D',
    'EMU/MEMU', 'Diesel Multiple Unit', 'Electric Multiple Unit'
  ],
  'Assistant Loco Pilot': [
    'WAP-4', 'WAP-5', 'WAP-7', 'WAG-5', 'WAG-7', 'WAG-9',
    'WDM-2', 'WDM-3A', 'WDM-3D', 'WDP-4', 'WDP-4D',
    'EMU/MEMU', 'Diesel Multiple Unit', 'Electric Multiple Unit'
  ],
  'TTE': ['Mail/Express', 'Passenger', 'Suburban', 'Long Distance'],
  'TC': ['Booking', 'Checking', 'Reservation', 'Platform'],
  'Guard': ['Mail/Express', 'Passenger', 'Goods', 'Mixed'],
  'Station Master': ['Class A', 'Class B', 'Class C', 'Halt Station'],
  'Commercial Inspector': ['Booking', 'Coaching', 'Goods', 'Parcel'],
  'Chief Ticket Inspector': ['Zonal', 'Divisional', 'District'],
  'Railway Supervisor': ['Operations', 'Commercial', 'Technical', 'Safety']
};

const RAILWAY_ZONES = [
  'Central Railway (CR)',
  'Eastern Railway (ER)',
  'East Central Railway (ECR)',
  'East Coast Railway (ECoR)',
  'Northern Railway (NR)',
  'North Central Railway (NCR)',
  'North Eastern Railway (NER)',
  'Northeast Frontier Railway (NFR)',
  'North Western Railway (NWR)',
  'Southern Railway (SR)',
  'South Central Railway (SCR)',
  'South Eastern Railway (SER)',
  'South East Central Railway (SECR)',
  'South Western Railway (SWR)',
  'Western Railway (WR)',
  'West Central Railway (WCR)',
  'Metro Railway, Kolkata',
  'Konkan Railway'
];

const Profile = () => {
  const { user, updateProfile, isOnline } = useAuth();
  
  // Basic fields
  const [name, setName] = useState(user?.name || '');
  const [division, setDivision] = useState(user?.division || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Extended profile fields - Feature 01
  const [model, setModel] = useState(user?.model || '');
  const [zone, setZone] = useState(user?.zone || '');
  const [branch, setBranch] = useState(user?.branch || '');
  const [headquartersStation, setHeadquartersStation] = useState(user?.headquartersStation || '');
  const [payLevel, setPayLevel] = useState(user?.payLevel || '');
  const [basicPay, setBasicPay] = useState(user?.basicPay || '');
  const [payScale, setPayScale] = useState(user?.payScale || '');
  const [gradePay, setGradePay] = useState(user?.gradePay || '');
  const [billUnit, setBillUnit] = useState(user?.billUnit || '');
  const [dateOfAppointment, setDateOfAppointment] = useState(
    user?.dateOfAppointment ? new Date(user.dateOfAppointment).toISOString().split('T')[0] : ''
  );
  
  // Feature 12: My Stations management
  const [myStationsList, setMyStationsList] = useState(user?.myStations || []);
  const [showStationPicker, setShowStationPicker] = useState(false);
  
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbStats, setDbStats] = useState({ journeysCount: 0, templatesCount: 0 });

  useEffect(() => {
    const loadStats = async () => {
      try {
        await localDB.init();
        const js = await localDB.getAll('journeys');
        const ts = await localDB.getAll('templates');
        setDbStats({ journeysCount: js.length, templatesCount: ts.length });
      } catch (err) {
        console.error('Error loading db stats:', err);
      }
    };
    loadStats();
  }, []);

  // Update form when user changes (e.g., after profile sync)
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setDivision(user.division || '');
      setModel(user.model || '');
      setZone(user.zone || '');
      setBranch(user.branch || '');
      setHeadquartersStation(user.headquartersStation || '');
      setPayLevel(user.payLevel || '');
      setBasicPay(user.basicPay || '');
      setPayScale(user.payScale || '');
      setGradePay(user.gradePay || '');
      setBillUnit(user.billUnit || '');
      setDateOfAppointment(
        user.dateOfAppointment ? new Date(user.dateOfAppointment).toISOString().split('T')[0] : ''
      );
      setMyStationsList(user.myStations || []);
    }
  }, [user]);

  const getFullTitle = (role) => {
    switch (role) {
      case 'TTE': return 'Senior Travelling Ticket Examiner';
      case 'TC': return 'Ticket Collector';
      case 'Guard': return 'Train Operations Guard';
      case 'Loco Pilot': return 'Loco Pilot (Mail/Express)';
      case 'Assistant Loco Pilot': return 'Assistant Loco Pilot';
      case 'Station Master': return 'Station Superintendent';
      case 'Commercial Inspector': return 'Commercial Inspector';
      case 'Chief Ticket Inspector': return 'Chief Ticket Inspector';
      case 'Railway Supervisor': return 'Railway Supervisor';
      default: return role || 'Railway Officer';
    }
  };

  // Feature 12: My Stations management handlers
  const handleAddStation = (station) => {
    if (station && station.code && !myStationsList.includes(station.code)) {
      setMyStationsList([...myStationsList, station.code]);
      setShowStationPicker(false);
    }
  };

  const handleRemoveStation = (code) => {
    setMyStationsList(myStationsList.filter(c => c !== code));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (password && password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        name,
        division,
        model: model || undefined,
        zone: zone || undefined,
        branch: branch || undefined,
        headquartersStation: headquartersStation || undefined,
        payLevel: payLevel ? parseInt(payLevel) : undefined,
        basicPay: basicPay ? parseFloat(basicPay) : undefined,
        payScale: payScale || undefined,
        gradePay: gradePay ? parseFloat(gradePay) : undefined,
        billUnit: billUnit || undefined,
        dateOfAppointment: dateOfAppointment || undefined,
        myStations: myStationsList // Send array directly
      };
      
      if (password) {
        payload.password = password;
      }
      
      await updateProfile(payload);
      setSuccess(isOnline ? 'Profile updated successfully!' : 'Profile updated locally. Changes will sync when online.');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handlePurgeCache = async () => {
    if (window.confirm('WARNING: This will delete all locally cached journeys, templates, and profile settings. Any unsynced data will be lost. Proceed?')) {
      try {
        await localDB.clear('journeys');
        await localDB.clear('templates');
        await localDB.clear('reports');
        await localDB.clear('profile');
        alert('Local cache purged. Please reload the application.');
        window.location.reload();
      } catch (err) {
        alert('Purge failed: ' + err.message);
      }
    }
  };

  const modelOptions = MODEL_OPTIONS[user?.role] || [];
  const showModelField = modelOptions.length > 0;

  return (
    <div className="app-container">
      {/* Title */}
      <div className="mb-4">
        <h2 className="text-white mb-1">Staff Profile Management</h2>
        <p className="text-secondary-custom">Complete your profile with official railway service details</p>
      </div>

      {!isOnline && (
        <div className="alert alert-warning py-2 px-3 mb-4 fs-6 border-0 d-flex align-items-center gap-2" style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', color: 'var(--color-warning)' }}>
          <AlertTriangle size={15} />
          <span>Offline Mode: Profile changes will synchronize when connectivity returns.</span>
        </div>
      )}

      <div className="row g-3">
        {/* Profile Edit form */}
        <div className="col-12 col-lg-8">
          <div className="card-saas">
            <div className="d-flex align-items-center gap-2 mb-4 border-bottom border-secondary pb-2">
              <User size={16} className="text-primary" />
              <h5 className="text-white mb-0" style={{ fontSize: '15px', fontWeight: '600' }}>Personal & Service Information</h5>
            </div>

            {error && (
              <div className="alert alert-danger py-2 px-3 mb-4 fs-6 border-0 d-flex align-items-center gap-2" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: 'var(--color-error)' }}>
                <AlertTriangle size={15} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="alert alert-success py-2 px-3 mb-4 fs-6 border-0 d-flex align-items-center gap-2" style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', color: 'var(--color-success)' }}>
                <CheckCircle2 size={15} />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleUpdate}>
              {/* Basic Information */}
              <div className="row g-3 mb-3">
                <div className="col-12 col-sm-6">
                  <label className="form-label-saas">Full Name <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control form-control-saas"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="col-12 col-sm-6">
                  <label className="form-label-saas">Division <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control form-control-saas"
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    required
                    placeholder="e.g., BCT, BRC"
                  />
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-12 col-sm-6">
                  <label className="form-label-saas">Email Address (Read Only)</label>
                  <div className="position-relative">
                    <Mail size={14} className="position-absolute text-muted" style={{ left: '12px', top: '14px' }} />
                    <input
                      type="email"
                      className="form-control form-control-saas text-muted"
                      value={user?.email || ''}
                      disabled
                      style={{ paddingLeft: '34px', backgroundColor: 'var(--bg-surface) !important', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>
                <div className="col-12 col-sm-6">
                  <label className="form-label-saas">Designation (Read Only)</label>
                  <div className="position-relative">
                    <Briefcase size={14} className="position-absolute text-muted" style={{ left: '12px', top: '14px' }} />
                    <input
                      type="text"
                      className="form-control form-control-saas text-muted"
                      value={getFullTitle(user?.role)}
                      disabled
                      style={{ paddingLeft: '34px', backgroundColor: 'var(--bg-surface) !important', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>
              </div>

              {/* Extended Profile Fields - Feature 01 */}
              <div className="d-flex align-items-center gap-2 mt-4 mb-3 border-bottom border-secondary pb-2">
                <Building2 size={16} className="text-primary" />
                <h5 className="text-white mb-0" style={{ fontSize: '15px', fontWeight: '600' }}>Official Railway Details</h5>
              </div>

              {showModelField && (
                <div className="row g-3 mb-3">
                  <div className="col-12">
                    <label className="form-label-saas">
                      {user?.role?.includes('Loco') ? 'Locomotive/Traction Model' : 'Cadre/Squad'}
                    </label>
                    <select
                      className="form-control form-control-saas"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                    >
                      <option value="">Select...</option>
                      {modelOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <small className="text-secondary-custom" style={{ fontSize: '11px' }}>
                      {user?.role?.includes('Loco') 
                        ? 'Select your primary locomotive class'
                        : 'Select your operational cadre or squad'}
                    </small>
                  </div>
                </div>
              )}

              <div className="row g-3 mb-3">
                <div className="col-12 col-sm-6">
                  <label className="form-label-saas">Railway Zone</label>
                  <select
                    className="form-control form-control-saas"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                  >
                    <option value="">Select Railway Zone...</option>
                    {RAILWAY_ZONES.map(z => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-sm-6">
                  <label className="form-label-saas">Branch/Department</label>
                  <input
                    type="text"
                    className="form-control form-control-saas"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="e.g., Operations, Commercial"
                  />
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-12">
                  <label className="form-label-saas">Headquarters Station Code</label>
                  <div className="position-relative">
                    <MapPin size={14} className="position-absolute text-muted" style={{ left: '12px', top: '14px' }} />
                    <input
                      type="text"
                      className="form-control form-control-saas"
                      value={headquartersStation}
                      onChange={(e) => setHeadquartersStation(e.target.value.toUpperCase())}
                      placeholder="e.g., BCT, NDLS, CSTM"
                      style={{ paddingLeft: '34px' }}
                      maxLength={6}
                    />
                  </div>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2 mt-4 mb-3 border-bottom border-secondary pb-2">
                <DollarSign size={16} className="text-primary" />
                <h5 className="text-white mb-0" style={{ fontSize: '15px', fontWeight: '600' }}>Pay & Service Details</h5>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-12 col-sm-6">
                  <label className="form-label-saas">Pay Level (1-14)</label>
                  <input
                    type="number"
                    className="form-control form-control-saas"
                    value={payLevel}
                    onChange={(e) => setPayLevel(e.target.value)}
                    min="1"
                    max="14"
                    placeholder="e.g., 7"
                  />
                </div>
                <div className="col-12 col-sm-6">
                  <label className="form-label-saas">Basic Pay (₹)</label>
                  <input
                    type="number"
                    className="form-control form-control-saas"
                    value={basicPay}
                    onChange={(e) => setBasicPay(e.target.value)}
                    min="0"
                    step="0.01"
                    placeholder="e.g., 35400"
                  />
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-12 col-sm-6">
                  <label className="form-label-saas">Pay Scale</label>
                  <input
                    type="text"
                    className="form-control form-control-saas"
                    value={payScale}
                    onChange={(e) => setPayScale(e.target.value)}
                    placeholder="e.g., 5200-20200"
                  />
                </div>
                <div className="col-12 col-sm-6">
                  <label className="form-label-saas">Grade Pay (₹)</label>
                  <input
                    type="number"
                    className="form-control form-control-saas"
                    value={gradePay}
                    onChange={(e) => setGradePay(e.target.value)}
                    min="0"
                    step="0.01"
                    placeholder="e.g., 2800"
                  />
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-12 col-sm-6">
                  <label className="form-label-saas">Bill Unit Number</label>
                  <div className="position-relative">
                    <FileText size={14} className="position-absolute text-muted" style={{ left: '12px', top: '14px' }} />
                    <input
                      type="text"
                      className="form-control form-control-saas"
                      value={billUnit}
                      onChange={(e) => setBillUnit(e.target.value)}
                      placeholder="e.g., BU/WR/BCT/001"
                      style={{ paddingLeft: '34px' }}
                    />
                  </div>
                </div>
                <div className="col-12 col-sm-6">
                  <label className="form-label-saas">Date of Appointment</label>
                  <div className="position-relative">
                    <Calendar size={14} className="position-absolute text-muted" style={{ left: '12px', top: '14px' }} />
                    <input
                      type="date"
                      className="form-control form-control-saas"
                      value={dateOfAppointment}
                      onChange={(e) => setDateOfAppointment(e.target.value)}
                      style={{ paddingLeft: '34px' }}
                    />
                  </div>
                </div>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-12">
                  <label className="form-label-saas">My Stations (Frequently Used)</label>
                  
                  {/* Selected Stations Display */}
                  {myStationsList.length > 0 && (
                    <div className="d-flex flex-wrap gap-2 mb-3 p-3 rounded" style={{ backgroundColor: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                      {myStationsList.map(code => (
                        <div 
                          key={code}
                          className="badge bg-primary d-inline-flex align-items-center gap-2 px-3 py-2"
                          style={{ fontSize: '13px' }}
                        >
                          <MapPin size={12} />
                          <span>{code}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveStation(code)}
                            className="btn btn-link p-0 text-white border-0"
                            style={{ lineHeight: 1, marginLeft: '4px' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Station Button/Picker */}
                  {showStationPicker ? (
                    <div className="mb-2">
                      <StationAutocomplete
                        value=""
                        onChange={handleAddStation}
                        placeholder="Search and select station..."
                        showClearButton={false}
                      />
                      <button
                        type="button"
                        onClick={() => setShowStationPicker(false)}
                        className="btn btn-sm btn-saas-secondary mt-2"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowStationPicker(true)}
                      className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-2"
                    >
                      <Plus size={14} />
                      <span>Add Station</span>
                    </button>
                  )}

                  <small className="text-secondary-custom d-block mt-2" style={{ fontSize: '11px' }}>
                    Add frequently used station codes. These will appear as quick-select suggestions in duty forms.
                  </small>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2 mt-4 mb-3 border-bottom border-secondary pb-2">
                <Lock size={16} className="text-primary" />
                <h5 className="text-white mb-0" style={{ fontSize: '15px', fontWeight: '600' }}>Change Password</h5>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6">
                  <label className="form-label-saas">New Password (Optional)</label>
                  <input
                    type="password"
                    className="form-control form-control-saas"
                    placeholder="Leave blank to keep current"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="col-12 col-sm-6">
                  <label className="form-label-saas">Confirm New Password</label>
                  <input
                    type="password"
                    className="form-control form-control-saas"
                    placeholder="Leave blank to keep current"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-glow-primary py-2 px-4" disabled={loading}>
                {loading ? (
                  <>
                    <RefreshCw size={13} className="spin me-1 d-inline-block" />
                    Saving Changes...
                  </>
                ) : 'Save Profile Changes'}
              </button>
            </form>
          </div>
        </div>

        {/* Diagnostics & Cache storage card */}
        <div className="col-12 col-lg-4">
          <div className="card-saas h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex align-items-center gap-2 mb-3 border-bottom border-secondary pb-2">
                <Database size={16} className="text-primary" />
                <h5 className="text-white mb-0" style={{ fontSize: '15px', fontWeight: '600' }}>Storage Diagnostics</h5>
              </div>
              
              <div className="mb-4">
                <span className="text-secondary-custom small d-block mb-2">Offline Cache Status (Active)</span>
                <div className="d-flex justify-content-between text-secondary-custom small border-bottom border-secondary pb-2 mb-2">
                  <span>Cached Duty Logs:</span>
                  <span className="text-white font-weight-semibold">{dbStats.journeysCount} records</span>
                </div>
                <div className="d-flex justify-content-between text-secondary-custom small border-bottom border-secondary pb-2 mb-2">
                  <span>Statement Templates:</span>
                  <span className="text-white font-weight-semibold">{dbStats.templatesCount} templates</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-top border-secondary mt-3">
              <div className="d-flex align-items-center gap-2 mb-2 text-danger">
                <ShieldAlert size={14} />
                <h6 className="mb-0" style={{ fontSize: '13px', fontWeight: '600' }}>Emergency Recovery</h6>
              </div>
              <p className="text-secondary-custom small mb-3" style={{ lineHeight: '1.4' }}>
                If your offline sync pipeline becomes stuck or experiences write conflicts, you can flush the database cache. Unsynchronized logs will be lost.
              </p>
              <button onClick={handlePurgeCache} className="btn btn-saas-secondary text-danger border-danger-subtle w-100 py-2 d-flex align-items-center justify-content-center gap-1">
                <Trash2 size={14} />
                <span>Purge Offline Cache</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
