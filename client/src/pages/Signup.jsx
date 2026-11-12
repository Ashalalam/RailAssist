import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { AlertTriangle, RefreshCw, User, Mail, Lock, Briefcase, MapPin } from 'lucide-react';

const Signup = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('TTE');
  const [division, setDivision] = useState('BCT');
  const [divisions, setDivisions] = useState([
    { code: 'BCT', name: 'Mumbai WR' },
    { code: 'BB', name: 'Mumbai CR' },
    { code: 'DLI', name: 'Delhi' },
    { code: 'HWH', name: 'Howrah' }
  ]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDivisions = async () => {
      try {
        const divs = await api.meta.getDivisions();
        if (divs && divs.length > 0) {
          setDivisions(divs);
        }
      } catch (err) {
        console.log('Failed to load divisions, using defaults:', err);
      }
    };
    fetchDivisions();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register({ name, email, password, role, division });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 px-3 py-5" style={{ backgroundColor: 'var(--bg-main)' }}>
      <div className="w-100" style={{ maxWidth: '440px' }}>
        {/* Brand Logo & Description */}
        <div className="text-center mb-4">
          <img src="/logo.svg" alt="RailAssist Logo" width="64" height="64" className="mb-3" />
          <h2 className="mb-1 font-weight-bold" style={{ fontSize: '22px', letterSpacing: '-0.02em', color: '#0C4A6E' }}>Join RailAssist</h2>
          <p className="small mb-0" style={{ color: '#64748B' }}>Enterprise Logbook & Allowances Manager</p>
        </div>

        {/* Signup Card */}
        <div className="card-saas">
          <h4 className="mb-4" style={{ fontSize: '18px', fontWeight: '600', color: '#0C4A6E' }}>Create Account</h4>

          {error && (
            <div className="alert alert-danger py-2 px-3 mb-4 fs-6 d-flex align-items-center gap-2" style={{ backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' }}>
              <AlertTriangle size={15} />
              <span className="small">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label-saas" htmlFor="name">Full Name</label>
              <div className="position-relative">
                <User size={14} className="position-absolute" style={{ left: '12px', top: '14px', color: '#94A3B8' }} />
                <input
                  type="text"
                  id="name"
                  className="form-control form-control-saas"
                  placeholder="Rajesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{ paddingLeft: '34px' }}
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label-saas" htmlFor="email">Official Email</label>
              <div className="position-relative">
                <Mail size={14} className="position-absolute" style={{ left: '12px', top: '14px', color: '#94A3B8' }} />
                <input
                  type="email"
                  id="email"
                  className="form-control form-control-saas"
                  placeholder="rajesh@railassist.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ paddingLeft: '34px' }}
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label-saas" htmlFor="password">Security Password</label>
              <div className="position-relative">
                <Lock size={14} className="position-absolute" style={{ left: '12px', top: '14px', color: '#94A3B8' }} />
                <input
                  type="password"
                  id="password"
                  className="form-control form-control-saas"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingLeft: '34px' }}
                />
              </div>
            </div>

            <div className="row g-2 mb-4">
              <div className="col-6">
                <label className="form-label-saas" htmlFor="role">Designation</label>
                <div className="position-relative">
                  <Briefcase size={14} className="position-absolute" style={{ left: '12px', top: '14px', zIndex: 10, color: '#94A3B8' }} />
                  <select
                    id="role"
                    className="form-select form-control-saas"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={{ 
                      paddingLeft: '34px',
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e")`, 
                      backgroundPosition: 'right 0.75rem center', 
                      backgroundSize: '16px 12px' 
                    }}
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
              </div>
              <div className="col-6">
                <label className="form-label-saas" htmlFor="division">Division</label>
                <div className="position-relative">
                  <MapPin size={14} className="position-absolute" style={{ left: '12px', top: '14px', zIndex: 10, color: '#94A3B8' }} />
                  <select
                    id="division"
                    className="form-select form-control-saas"
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    style={{ 
                      paddingLeft: '34px',
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e")`, 
                      backgroundPosition: 'right 0.75rem center', 
                      backgroundSize: '16px 12px' 
                    }}
                  >
                    {divisions.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-glow-primary w-100 mb-3 d-flex align-items-center justify-content-center gap-1" disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw size={13} className="spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="text-center mt-3" style={{ fontSize: '13px' }}>
            <span style={{ color: '#64748B' }}>Already registered? </span>
            <Link to="/login" style={{ color: '#10B981', textDecoration: 'none', fontWeight: '500' }}>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
