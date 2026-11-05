import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import localDB from '../services/db';
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
  Briefcase
} from 'lucide-react';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  
  const [name, setName] = useState(user?.name || '');
  const [division, setDivision] = useState(user?.division || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
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

  const getFullTitle = (role) => {
    switch (role) {
      case 'TTE': return 'Senior Travelling Ticket Examiner';
      case 'TC': return 'Ticket Collector';
      case 'Guard': return 'Train Operations Guard';
      case 'Loco Pilot': return 'Loco Pilot (Mail/Express)';
      case 'Assistant Loco Pilot': return 'Assistant Loco Pilot';
      case 'Station Master': return 'Station Superintendent';
      default: return role || 'Railway Officer';
    }
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
      const payload = { name, division };
      if (password) {
        payload.password = password;
      }
      await updateProfile(payload);
      setSuccess('Profile updated successfully!');
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

  return (
    <div className="app-container">
      {/* Title */}
      <div className="mb-4">
        <h2 className="text-white mb-1">User Profile & Diagnostics</h2>
        <p className="text-secondary-custom">Manage your credentials, divisions, and offline diagnostic database storage caches</p>
      </div>

      <div className="row g-3">
        {/* Profile Edit form */}
        <div className="col-12 col-lg-8">
          <div className="card-saas">
            <div className="d-flex align-items-center gap-2 mb-4 border-bottom border-secondary pb-2">
              <User size={16} className="text-primary" />
              <h5 className="text-white mb-0" style={{ fontSize: '15px', fontWeight: '600' }}>Credential Settings</h5>
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
              <div className="row g-3 mb-3">
                <div className="col-12 col-sm-6">
                  <label className="form-label-saas">Full Name</label>
                  <input
                    type="text"
                    className="form-control form-control-saas"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="col-12 col-sm-6">
                  <label className="form-label-saas">Division</label>
                  <input
                    type="text"
                    className="form-control form-control-saas"
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    required
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
                ) : 'Save Changes'}
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
