import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';

const AdminDashboard = () => {
  const [metrics, setMetrics] = useState({
    usersCount: 0,
    journeysCount: 0,
    premiumUsersCount: 0,
    activeSubscriptions: 0,
    totalTA: 0,
    totalNDA: 0,
    avgDelay: 0
  });

  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const metricsData = await api.admin.getMetrics();
        setMetrics(metricsData);

        const logs = await api.admin.getAuditLogs();
        setAuditLogs(logs);
      } catch (err) {
        setError(err.message || 'Access denied: Admin permissions required.');
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, []);

  if (loading) {
    return (
      <div className="app-container text-center py-5">
        <div className="spinner-border text-info" role="status">
          <span className="visually-hidden">Loading Admin Console...</span>
        </div>
        <p className="text-muted-custom mt-2">Fetching global metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container">
        <div className="alert alert-danger border-0 py-3" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
          <i className="bi bi-shield-exclamation me-2 fs-5"></i>
          {error}
        </div>
        <Link to="/" className="btn btn-saas-secondary">Return to Employee Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-white mb-1">Admin Console Overview</h2>
          <p className="text-muted-custom mb-0">System metrics, license subscription shares, and security audits</p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/settings" className="btn btn-saas-secondary py-1 px-3">
            <i className="bi bi-arrow-left"></i> Settings
          </Link>
          <Link to="/admin/users" className="btn btn-glow-primary py-1 px-3">
            <i className="bi bi-people-fill me-2"></i>Manage Users
          </Link>
        </div>
      </div>

      {/* Stats Widgets */}
      <div className="row g-3 mb-4">
        {/* Total Users */}
        <div className="col-6 col-md-3">
          <div className="card-saas text-center">
            <span className="text-muted-custom small">Total Staff Accounts</span>
            <div className="widget-stat-number fs-2">{metrics.usersCount}</div>
            <small className="text-muted-custom">Registered</small>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="col-6 col-md-3">
          <div className="card-saas text-center">
            <span className="text-muted-custom small">SaaS Licenses Active</span>
            <div className="widget-stat-number fs-2">{metrics.activeSubscriptions}</div>
            <small className="text-muted-custom">Premium / Enterprise</small>
          </div>
        </div>

        {/* Total Journeys */}
        <div className="col-6 col-md-3">
          <div className="card-saas text-center">
            <span className="text-muted-custom small">Total Logs Ingested</span>
            <div className="widget-stat-number fs-2">{metrics.journeysCount}</div>
            <small className="text-muted-custom">Synced MongoDB</small>
          </div>
        </div>

        {/* Average delay */}
        <div className="col-6 col-md-3">
          <div className="card-saas text-center">
            <span className="text-muted-custom small">Avg Delay Record</span>
            <div className="widget-stat-number fs-2 text-danger">{metrics.avgDelay}m</div>
            <small className="text-muted-custom">Minutes per run</small>
          </div>
        </div>
      </div>

      {/* Payout summaries */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6">
          <div className="card-saas text-center border-success">
            <span className="text-muted-custom small">Accumulated TA Disbursed</span>
            <div className="widget-stat-number text-success">₹{metrics.totalTA}</div>
            <small className="text-muted-custom">Total Traveling Allowance logs</small>
          </div>
        </div>
        <div className="col-12 col-md-6">
          <div className="card-saas text-center border-info">
            <span className="text-muted-custom small">Accumulated NDA Disbursed</span>
            <div className="widget-stat-number text-info">₹{metrics.totalNDA}</div>
            <small className="text-muted-custom">Total Night Duty Allowance logs</small>
          </div>
        </div>
      </div>

      {/* Audit Trails logs */}
      <div className="card-saas">
        <h5 className="text-white mb-3">Security & System Audit Logs</h5>
        <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <table className="table table-dark table-hover border-secondary align-middle">
            <thead>
              <tr style={{ color: 'var(--text-secondary)' }}>
                <th>Timestamp</th>
                <th>Staff Account</th>
                <th>Action</th>
                <th>Details</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map(log => (
                <tr key={log._id}>
                  <td style={{ fontSize: '12px' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td>
                    {log.userId ? (
                      <div>
                        <div className="text-white font-weight-bold">{log.userId.name}</div>
                        <small className="text-muted-custom" style={{ fontSize: '11px' }}>{log.userId.email} ({log.userId.role})</small>
                      </div>
                    ) : (
                      <span className="text-muted-custom">System Service</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge py-1 px-2 ${log.action.includes('REGISTER') || log.action.includes('CREATE') ? 'bg-success-subtle text-success' : (log.action.includes('DELETE') ? 'bg-danger-subtle text-danger' : 'bg-primary-subtle text-primary')}`} style={{ fontSize: '11px' }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px' }}>{log.details}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{log.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
