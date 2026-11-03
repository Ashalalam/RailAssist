import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, RefreshCw, Mail, Lock, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const ForgotPassword = () => {
  const { forgotPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await forgotPassword(email, newPassword);
      setSuccess('Password updated successfully. You will be redirected to Sign In shortly.');
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err) {
      setError(err.message || 'Error updating password. Verify email.');
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
          <h2 className="text-white mb-1 font-weight-bold" style={{ fontSize: '22px', letterSpacing: '-0.02em' }}>Reset Password</h2>
          <p className="text-secondary-custom small mb-0">Recover your RailAssist portal access</p>
        </div>

        {/* Card */}
        <div className="card-saas">
          <h4 className="mb-4 text-white" style={{ fontSize: '18px', fontWeight: '600' }}>Reset Credentials</h4>

          {error && (
            <div className="alert alert-danger py-2 px-3 mb-4 fs-6 border-0 d-flex align-items-center gap-2" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: 'var(--color-error)' }}>
              <AlertTriangle size={15} />
              <span className="small">{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success py-2 px-3 mb-4 fs-6 border-0 d-flex align-items-center gap-2" style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', color: 'var(--color-success)' }}>
              <CheckCircle2 size={15} />
              <span className="small">{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label-saas" htmlFor="email">Registered Email Address</label>
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
              <label className="form-label-saas" htmlFor="newPassword">New Security Password</label>
              <div className="position-relative">
                <Lock size={14} className="position-absolute text-muted" style={{ left: '12px', top: '14px' }} />
                <input
                  type="password"
                  id="newPassword"
                  className="form-control form-control-saas"
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  style={{ paddingLeft: '34px' }}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-glow-primary w-100 mb-3 d-flex align-items-center justify-content-center gap-1" disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw size={13} className="spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>

          <div className="text-center mt-3" style={{ fontSize: '13px' }}>
            <Link to="/login" style={{ color: '#10B981', textDecoration: 'none', fontWeight: '500' }}>
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
