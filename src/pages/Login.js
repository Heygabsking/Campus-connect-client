import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api'; // Import Axios client utility
import toast from 'react-hot-toast';
import './Auth.css';

export default function Login() {
  const [form, setForm]     = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login }             = useAuth();
  const navigate              = useNavigate();

  // Forgot password flow states
  const [forgotStep, setForgotStep] = useState(0); // 0 = Sign In, 1 = Verify Email, 2 = Set New Password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotUsername, setForgotUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Sign In submit handler
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/feed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Verify registered email address exists in backend
  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setResetLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password-verify', { email: forgotEmail });
      setForgotUsername(data.username);
      setForgotStep(2); // Jump to step 2 (new password set)
      toast.success('Email verified! Choose a new password.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setResetLoading(false);
    }
  };

  // Step 2: Submit new password to backend for hashing and saving
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword) return;
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setResetLoading(true);
    try {
      await api.post('/auth/forgot-password-reset', { email: forgotEmail, password: newPassword });
      toast.success('Password reset successfully! Please sign in.');
      setForgotStep(0); // Return back to sign-in screen
      setForgotEmail('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">CC</div>
          <h1>CampusConnect</h1>
          <p>CampusConnect Student Platform</p>
        </div>

        {/* Step 0: Normal Login Form */}
        {forgotStep === 0 && (
          <form onSubmit={submit}>
            <div className="field">
              <label>Email</label>
              <input name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handle} required />
            </div>
            <div className="field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Password</label>
                <button 
                  type="button" 
                  onClick={() => setForgotStep(1)} 
                  style={{ background: 'none', border: 'none', color: '#1F4E79', fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}
                >
                  Forgot Password?
                </button>
              </div>
              <input name="password" type="password" placeholder="••••••••" value={form.password} onChange={handle} required />
            </div>
            <button className="btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        )}

        {/* Step 1: Verify Email address */}
        {forgotStep === 1 && (
          <form onSubmit={handleVerifyEmail}>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: 16, textAlign: 'center' }}>
              Enter your registered email address to verify your account.
            </p>
            <div className="field">
              <label>Registered Email</label>
              <input 
                type="email" 
                placeholder="you@example.com" 
                value={forgotEmail} 
                onChange={(e) => setForgotEmail(e.target.value)} 
                required 
              />
            </div>
            <button className="btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={resetLoading}>
              {resetLoading ? 'Verifying…' : 'Verify Email'}
            </button>
            <button 
              type="button" 
              onClick={() => setForgotStep(0)} 
              className="btn-text" 
              style={{ width: '100%', marginTop: 12, color: '#666', textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Back to Sign In
            </button>
          </form>
        )}

        {/* Step 2: Set new password for the verified user */}
        {forgotStep === 2 && (
          <form onSubmit={handleResetPassword}>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: 16, textAlign: 'center' }}>
              Setting new password for account: <strong>@{forgotUsername}</strong>
            </p>
            <div className="field">
              <label>New Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                required 
              />
            </div>
            <div className="field">
              <label>Confirm Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required 
              />
            </div>
            <button className="btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={resetLoading}>
              {resetLoading ? 'Resetting Password…' : 'Reset Password'}
            </button>
            <button 
              type="button" 
              onClick={() => { setForgotStep(0); setForgotEmail(''); }} 
              className="btn-text" 
              style={{ width: '100%', marginTop: 12, color: '#666', textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </form>
        )}

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
