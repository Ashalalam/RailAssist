import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useJourneys } from '../contexts/JourneyContext';
import { 
  User, 
  Bell, 
  RefreshCw, 
  ShieldAlert, 
  LogOut, 
  ChevronRight,
  Database,
  Users
} from 'lucide-react';

const Settings = () => {
  const { user, logout, isOnline } = useAuth();
  const { syncing, triggerManualSync } = useJourneys();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to sign out? Your offline logs will be cleared from this device.')) {
      await logout();
      navigate('/login');
    }
  };

  return (
    <div className="app-container">
      {/* Title */}
      <div className="mb-4">
        <h2 className="text-white mb-1">Application Settings</h2>
        <p className="text-secondary-custom">Manage your profile, alerts, cloud syncing, and administrative options</p>
      </div>

      <div className="row g-3">
        {/* Navigation & Services */}
        <div className="col-12 col-md-6">
          <div className="card-saas mb-3" style={{ padding: '24px' }}>
            <h5 className="text-white mb-3" style={{ fontSize: '15px', fontWeight: '600' }}>General Settings</h5>
            
            <div className="d-flex flex-column gap-1">
              <Link to="/profile" className="d-flex justify-content-between align-items-center p-3 rounded text-decoration-none hover-bg-surface-secondary" style={{ backgroundColor: 'rgba(27, 34, 50, 0.15)', transition: 'all 0.2s' }}>
                <div className="d-flex align-items-center gap-3">
                  <User size={18} className="text-primary" />
                  <div>
                    <h6 className="mb-0 text-white" style={{ fontSize: '14px', fontWeight: '500' }}>Staff Credentials</h6>
                    <small className="text-secondary-custom d-block" style={{ fontSize: '11px' }}>Edit name, division, and password</small>
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted" />
              </Link>

              <Link to="/notifications" className="d-flex justify-content-between align-items-center p-3 rounded text-decoration-none hover-bg-surface-secondary" style={{ backgroundColor: 'rgba(27, 34, 50, 0.15)', transition: 'all 0.2s' }}>
                <div className="d-flex align-items-center gap-3">
                  <Bell size={18} className="text-warning" />
                  <div>
                    <h6 className="mb-0 text-white" style={{ fontSize: '14px', fontWeight: '500' }}>Duty Notifications</h6>
                    <small className="text-secondary-custom d-block" style={{ fontSize: '11px' }}>Configure alert logs and warning triggers</small>
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted" />
              </Link>
            </div>
          </div>

          <div className="card-saas">
            <h5 className="text-white mb-3" style={{ fontSize: '15px', fontWeight: '600' }}>Synchronizations</h5>
            <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
              <div>
                <p className="text-secondary-custom small mb-1">Roster Sync Pipeline:</p>
                <span className={`badge py-1 px-2 border fs-6 ${isOnline ? 'bg-success-subtle text-success border-success-subtle' : 'bg-danger-subtle text-danger border-danger-subtle'}`} style={{ fontSize: '12px' }}>
                  {isOnline ? 'ONLINE (Cloud Connected)' : 'OFFLINE (Local Store Active)'}
                </span>
              </div>
              <button 
                onClick={triggerManualSync} 
                className="btn btn-glow-primary py-2 px-3 btn-sm d-flex align-items-center gap-1"
                disabled={syncing || !isOnline}
              >
                <RefreshCw size={13} className={syncing ? 'spin' : ''} />
                <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            </div>
            <p className="text-secondary-custom small mb-0" style={{ lineHeight: '1.4' }}>
              RailAssist auto-syncs shift duty logs when returning online. Trigger manually to force updates instantly.
            </p>
          </div>
        </div>

        {/* Subscription & Admin Access */}
        <div className="col-12 col-md-6">
          {/* Subscription Panel */}
          <div className="card-saas mb-3">
            <h5 className="text-white mb-3" style={{ fontSize: '15px', fontWeight: '600' }}>Subscription Billing</h5>
            <div className="p-3 bg-dark border border-secondary rounded mb-3 d-flex justify-content-between align-items-center" style={{ backgroundColor: 'rgba(27, 34, 50, 0.2)' }}>
              <div>
                <h6 className="text-white mb-0" style={{ fontSize: '14px' }}>SaaS License License</h6>
                <span className="text-primary font-weight-bold" style={{ fontSize: '16px' }}>{user?.subscriptionTier} Access</span>
              </div>
              <span className="badge bg-success-subtle text-success border border-success-subtle py-1 px-3" style={{ fontSize: '11px' }}>
                Active
              </span>
            </div>
            <p className="text-secondary-custom small mb-0" style={{ lineHeight: '1.4' }}>
              Your account runs under an enterprise employee billing token managed directly by your Division Headquarters.
            </p>
          </div>

          {/* Secure Admin Control Panel */}
          {user?.isAdmin && (
            <div className="card-saas mb-3 border-warning-subtle">
              <h5 className="text-warning mb-3" style={{ fontSize: '15px', fontWeight: '600' }}>
                <ShieldAlert size={16} className="me-1 d-inline" />
                Admin Console
              </h5>
              <div className="d-flex flex-column gap-1">
                <Link to="/admin" className="d-flex justify-content-between align-items-center p-3 rounded text-decoration-none hover-bg-surface-secondary" style={{ backgroundColor: 'rgba(27, 34, 50, 0.15)', transition: 'all 0.2s' }}>
                  <div className="d-flex align-items-center gap-2">
                    <Database size={16} className="text-primary" />
                    <span className="text-white small">Roster Metrics Overview</span>
                  </div>
                  <ChevronRight size={14} className="text-muted" />
                </Link>
                <Link to="/admin/users" className="d-flex justify-content-between align-items-center p-3 rounded text-decoration-none hover-bg-surface-secondary" style={{ backgroundColor: 'rgba(27, 34, 50, 0.15)', transition: 'all 0.2s' }}>
                  <div className="d-flex align-items-center gap-2">
                    <Users size={16} className="text-warning" />
                    <span className="text-white small">Manage Staff Accounts</span>
                  </div>
                  <ChevronRight size={14} className="text-muted" />
                </Link>
              </div>
            </div>
          )}

          {/* Log Out */}
          <button onClick={handleLogout} className="btn btn-saas-secondary text-danger border-danger-subtle py-3 w-100 d-flex align-items-center justify-content-center gap-2">
            <LogOut size={16} />
            <span>Sign Out of Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
