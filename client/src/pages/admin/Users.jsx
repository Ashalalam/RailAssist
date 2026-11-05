import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Edit Modal/Panel states
  const [selectedUser, setSelectedUser] = useState(null);
  const [editRole, setEditRole] = useState('');
  const [editTier, setEditTier] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editIsAdmin, setEditIsAdmin] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    const fetchUsers = async () => {
      try {
        const data = await api.admin.getUsers();
        if (!ignore) {
          setUsers(data);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || 'Failed to retrieve accounts.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchUsers();

    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setEditRole(user.role);
    setEditTier(user.subscriptionTier);
    setEditStatus(user.subscriptionStatus || 'None');
    setEditIsAdmin(user.isAdmin);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.admin.updateUser(selectedUser._id, {
        role: editRole,
        subscriptionTier: editTier,
        subscriptionStatus: editStatus,
        isAdmin: editIsAdmin
      });
      alert('User settings updated successfully!');
      setSelectedUser(null);
      setRefreshKey(k => k + 1); // Refresh
    } catch (err) {
      alert('Update failed: ' + err.message);
    }
  };

  const handleDelete = async (id, email) => {
    if (window.confirm(`Are you absolutely sure you want to delete account ${email}? This action cannot be undone.`)) {
      try {
        await api.admin.deleteUser(id);
        alert('User account deleted.');
        setRefreshKey(k => k + 1); // Refresh
      } catch (err) {
        alert('Deletion failed: ' + err.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="app-container text-center py-5">
        <div className="spinner-border text-info" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-white mb-1">Staff User Registry</h2>
          <p className="text-muted-custom mb-0">Modify employee subscription levels and security roles</p>
        </div>
        <Link to="/admin" className="btn btn-saas-secondary py-1 px-3">
          <i className="bi bi-chevron-left me-2"></i>Admin Console
        </Link>
      </div>

      <div className="row g-3">
        {/* Users list table */}
        <div className={selectedUser ? "col-12 col-lg-8" : "col-12"}>
          <div className="card-saas">
            <h5 className="text-white mb-3">Accounts ({users.length})</h5>
            {error && <div className="alert alert-danger mb-3 py-2 px-3 small">{error}</div>}
            <div className="table-responsive">
              <table className="table table-dark table-hover border-secondary align-middle">
                <thead>
                  <tr style={{ color: 'var(--text-secondary)' }}>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Division</th>
                    <th>License</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id} style={{ borderColor: 'var(--border-color)' }}>
                      <td>
                        <div className="text-white font-weight-bold">{u.name}</div>
                        {u.isAdmin && <span className="badge bg-danger py-0 px-2" style={{ fontSize: '10px' }}>ADMIN</span>}
                      </td>
                      <td style={{ fontSize: '13px' }}>{u.email}</td>
                      <td>{u.role}</td>
                      <td>{u.division}</td>
                      <td>
                        <span className={`badge ${u.subscriptionTier === 'Enterprise' ? 'bg-primary' : (u.subscriptionTier === 'Premium' ? 'bg-info text-dark' : 'bg-secondary')}`} style={{ fontSize: '11px' }}>
                          {u.subscriptionTier} ({u.subscriptionStatus})
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="d-flex gap-1 justify-content-end">
                          <button onClick={() => handleEditClick(u)} className="btn btn-saas-secondary py-1 px-2 text-info small" style={{ fontSize: '12px' }}>
                            <i className="bi bi-pencil-fill"></i>
                          </button>
                          <button onClick={() => handleDelete(u._id, u.email)} className="btn btn-danger py-1 px-2 small" style={{ fontSize: '12px', background: 'var(--danger-glow)', border: 'none' }} disabled={u.email === 'admin@railassist.com'}>
                            <i className="bi bi-trash-fill"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Edit Panel (Conditional) */}
        {selectedUser && (
          <div className="col-12 col-lg-4">
            <div className="card-saas card-glow">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="text-white mb-0">Modify Account</h5>
                <button onClick={() => setSelectedUser(null)} className="btn-close btn-close-white" aria-label="Close"></button>
              </div>
              <p className="text-muted-custom small mb-4">Editing settings for: <strong>{selectedUser.name}</strong> ({selectedUser.email})</p>

              <form onSubmit={handleSave}>
                {/* Role dropdown */}
                <div className="mb-3">
                  <label className="form-label-saas">Designation Role</label>
                  <select
                    className="form-select form-control-saas"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.75rem center', backgroundSize: '16px 12px' }}
                  >
                    <option value="TTE">TTE</option>
                    <option value="TC">TC</option>
                    <option value="Guard">Guard</option>
                    <option value="Loco Pilot">Loco Pilot</option>
                    <option value="Assistant Loco Pilot">Assistant Loco Pilot</option>
                    <option value="Station Master">Station Master</option>
                    <option value="Commercial Inspector">Commercial Inspector</option>
                    <option value="Chief Ticket Inspector">Chief Ticket Inspector</option>
                    <option value="Railway Supervisor">Railway Supervisor</option>
                  </select>
                </div>

                {/* Subscription Tier */}
                <div className="mb-3">
                  <label className="form-label-saas">License Tier</label>
                  <select
                    className="form-select form-control-saas"
                    value={editTier}
                    onChange={(e) => setEditTier(e.target.value)}
                    style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.75rem center', backgroundSize: '16px 12px' }}
                  >
                    <option value="Free">Free</option>
                    <option value="Premium">Premium</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>

                {/* Subscription Status */}
                <div className="mb-3">
                  <label className="form-label-saas">License Status</label>
                  <select
                    className="form-select form-control-saas"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.75rem center', backgroundSize: '16px 12px' }}
                  >
                    <option value="None">None</option>
                    <option value="Active">Active</option>
                    <option value="Canceled">Canceled</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>

                {/* Admin Checkbox */}
                <div className="form-check form-switch mb-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="editAdmin"
                    checked={editIsAdmin}
                    onChange={(e) => setEditIsAdmin(e.target.checked)}
                    disabled={selectedUser.email === 'admin@railassist.com'}
                    style={{ width: '40px', height: '20px', marginRight: '10px' }}
                  />
                  <label className="form-check-label text-white pt-1" htmlFor="editAdmin">Administrator Permissions</label>
                </div>

                {/* Actions */}
                <div className="d-flex gap-2">
                  <button type="button" onClick={() => setSelectedUser(null)} className="btn btn-saas-secondary flex-grow-1">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-glow-primary flex-grow-1">
                    Save Updates
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
