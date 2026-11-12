import { useState } from 'react';
import { useNavigate, Link, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, RefreshCw, Mail, Lock, CheckCircle2, ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react';

const ForgotPassword = () => {
  const { requestPasswordReset, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { token: paramToken } = useParams();
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get('token');
  const activeToken = paramToken || queryToken;

  // Step 1: Request Link Form State
  const [email, setEmail] = useState('');
  const [devRecoveryUrl, setDevRecoveryUrl] = useState('');

  // Step 2: Set New Password Form State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status Feedback States
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle Step 1: Request Password Reset Link
  const handleRequestLink = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setDevRecoveryUrl('');
    setLoading(true);

    try {
      const response = await requestPasswordReset(email);
      setSuccess(
        response.message || 
        'If an account associated with that email exists, password reset instructions have been dispatched.'
      );

      // In local development with unconfigured SMTP, display the generated dev link
      if (response.devResetUrl) {
        setDevRecoveryUrl(response.devResetUrl);
      }
    } catch (err) {
      setError(err.message || 'Error processing request. Please verify your email.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2: Submit New Password with Token
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Password and confirmation password do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const response = await resetPassword(activeToken, newPassword);
      setSuccess(response.message || 'Password updated successfully! Redirecting to sign in...');
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err) {
      setError(err.message || 'Password reset token is invalid or has expired. Please request a new link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 px-3 py-5" style={{ backgroundColor: 'var(--bg-main)' }}>
      <div className="w-100" style={{ maxWidth: '420px' }}>
        {/* Brand Header */}
        <div className="text-center mb-4">
          <img src="/logo.svg" alt="RailAssist Logo" width="60" height="60" className="mb-3" />
          <h2 className="mb-1 font-weight-bold" style={{ fontSize: '22px', letterSpacing: '-0.02em', color: '#0C4A6E' }}>
            {activeToken ? 'Set New Password' : 'Reset Password'}
          </h2>
          <p className="small mb-0" style={{ color: '#64748B' }}>
            {activeToken 
              ? 'Enter and confirm your new secure credentials' 
              : 'Recover your RailAssist official portal access'}
          </p>
        </div>

        {/* Form Card */}
        <div className="card-saas">
          <div className="d-flex align-items-center gap-2 mb-3">
            {activeToken ? (
              <KeyRound size={18} style={{ color: '#0EA5E9' }} />
            ) : (
              <ShieldCheck size={18} style={{ color: '#0EA5E9' }} />
            )}
            <h4 className="mb-0" style={{ fontSize: '16px', fontWeight: '600', color: '#0C4A6E' }}>
              {activeToken ? 'Credential Reset' : 'Account Verification'}
            </h4>
          </div>

          {error && (
            <div className="alert alert-danger py-2 px-3 mb-4 fs-6 d-flex align-items-start gap-2" style={{ backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' }}>
              <AlertTriangle size={15} className="mt-1 flex-shrink-0" />
              <span className="small">{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success py-2 px-3 mb-4 fs-6 d-flex align-items-start gap-2" style={{ backgroundColor: '#D1FAE5', color: '#059669', border: '1px solid #A7F3D0' }}>
              <CheckCircle2 size={15} className="mt-1 flex-shrink-0" />
              <span className="small">{success}</span>
            </div>
          )}

          {/* Local Developer Verification Box when SMTP is not configured */}
          {devRecoveryUrl && (
            <div className="p-3 mb-4 rounded" style={{ backgroundColor: '#E0F2FE', border: '1px solid #BAE6FD' }}>
              <span className="font-weight-semibold d-block small mb-1" style={{ color: '#0EA5E9' }}>
                🛠️ Local Development Verification Mode:
              </span>
              <p className="small mb-2" style={{ fontSize: '11px', lineHeight: '1.4', color: '#64748B' }}>
                Email delivery provider is unconfigured in <code>server/.env</code>. For testing, use the single-use recovery link below:
              </p>
              <a 
                href={devRecoveryUrl} 
                className="btn btn-sm btn-glow-primary w-100 text-decoration-none"
                style={{ fontSize: '12px' }}
              >
                Proceed with Generated Recovery Token
              </a>
            </div>
          )}

          {/* STEP 2: Token Active -> Submit New Password */}
          {activeToken ? (
            <form onSubmit={handleResetPassword}>
              <div className="mb-3">
                <label className="form-label-saas" htmlFor="newPassword">New Security Password</label>
                <div className="position-relative">
                  <Lock size={14} className="position-absolute" style={{ left: '12px', top: '14px', color: '#94A3B8' }} />
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

              <div className="mb-4">
                <label className="form-label-saas" htmlFor="confirmPassword">Confirm New Password</label>
                <div className="position-relative">
                  <Lock size={14} className="position-absolute" style={{ left: '12px', top: '14px', color: '#94A3B8' }} />
                  <input
                    type="password"
                    id="confirmPassword"
                    className="form-control form-control-saas"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={{ paddingLeft: '34px' }}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-glow-primary w-100 mb-3 d-flex align-items-center justify-content-center gap-1" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw size={13} className="spin" />
                    <span>Verifying Token & Updating...</span>
                  </>
                ) : (
                  'Save New Password'
                )}
              </button>
            </form>
          ) : (
            /* STEP 1: No Token -> Request Recovery Link via Email */
            <form onSubmit={handleRequestLink}>
              <div className="mb-4">
                <label className="form-label-saas" htmlFor="email">Registered Official Email</label>
                <div className="position-relative">
                  <Mail size={14} className="position-absolute" style={{ left: '12px', top: '14px', color: '#94A3B8' }} />
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
                <small className="d-block mt-2" style={{ fontSize: '11px', lineHeight: '1.4', color: '#64748B' }}>
                  A single-use, 15-minute verification link will be issued to your registered railway address.
                </small>
              </div>

              <button 
                type="submit" 
                className="btn btn-glow-primary w-100 mb-3 d-flex align-items-center justify-content-center gap-1" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw size={13} className="spin" />
                    <span>Generating Secure Link...</span>
                  </>
                ) : (
                  'Send Reset Instructions'
                )}
              </button>
            </form>
          )}

          <div className="text-center mt-3" style={{ fontSize: '13px' }}>
            <Link to="/login" className="d-inline-flex align-items-center gap-1 text-decoration-none" style={{ color: '#10B981', fontWeight: '500' }}>
              <ArrowLeft size={13} />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
