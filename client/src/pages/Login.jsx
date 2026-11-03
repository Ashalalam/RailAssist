import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, RefreshCw, Mail, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 px-3 py-5" style={{ backgroundColor: 'var(--bg-main)' }}>
      <div className="w-100" style={{ maxWidth: '400px' }}>
        {/* Brand Logo & Description */}
        <div className="text-center mb-4">
          <img src="/logo.svg" alt="RailAssist Logo" width="64" height="64" className="mb-3" />
          <h2 className="text-white mb-1 font-weight-bold" style={{ fontSize: '22px', letterSpacing: '-0.02em' }}>RailAssist Enterprise</h2>
          <p className="text-secondary-custom small mb-0">Offline-first portal for Indian Railways officials</p>
        </div>

        {/* Login Card */}
        <div className="card-saas">
          <h4 className="mb-4 text-white" style={{ fontSize: '18px', fontWeight: '600' }}>Sign In</h4>

          {error && (
            <div className="alert alert-danger py-2 px-3 mb-4 fs-6 border-0 d-flex align-items-center gap-2" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: 'var(--color-error)' }}>
              <AlertTriangle size={15} />
              <span className="small">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label-saas" htmlFor="email">Official Email Address</label>
              <div className="position-relative">
                <Mail size={14} className="position-absolute text-muted" style={{ left: '12px', top: '14px' }} />
                <input
                  type="email"
                  id="email"
                  className="form-control form-control-saas"
                  placeholder="staff@railassist.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ paddingLeft: '34px' }}
                />
              </div>
            </div>

            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label-saas mb-0" htmlFor="password">Password</label>
                <Link to="/forgot-password" style={{ color: 'var(--color-primary)', fontSize: '12px', textDecoration: 'none', fontWeight: '500' }}>
                  Forgot Password?
                </Link>
              </div>
              <div className="position-relative">
                <Lock size={14} className="position-absolute text-muted" style={{ left: '12px', top: '14px' }} />
                <input
                  type="password"
                  id="password"
                  className="form-control form-control-saas"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingLeft: '34px' }}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-glow-primary w-100 mb-3 d-flex align-items-center justify-content-center gap-1" disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw size={13} className="spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="text-center mt-3" style={{ fontSize: '13px' }}>
            <span className="text-secondary-custom">New to RailAssist? </span>
            <Link to="/signup" style={{ color: '#10B981', textDecoration: 'none', fontWeight: '500' }}>
              Register Staff ID
            </Link>
          </div>
        </div>

        {/* Demo Helper */}
        <div className="text-center mt-4 text-secondary-custom" style={{ fontSize: '11px' }}>
          Authorized credentials: staff@railassist.com | admin@railassist.com (Password123)
        </div>
      </div>
    </div>
  );
};

export default Login;
