import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './Auth.css';

export default function Register() {
  const [form, setForm]       = useState({ email: '', username: '', password: '', role: 'student' });
  const [loading, setLoading] = useState(false);
  const { register }          = useAuth();
  const navigate              = useNavigate();

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form.email, form.username, form.password, form.role);
      toast.success('Welcome to CampusConnect! 🎉');
      navigate('/feed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">CC</div>
          <h1>CampusConnect</h1>
          <p>Join the CampusConnect community</p>
        </div>

        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handle} required />
          </div>
          <div className="field">
            <label>Username</label>
            <input name="username" placeholder="e.g. nancy_wanjiku" value={form.username} onChange={handle} required />
          </div>
          <div className="field">
            <label>Role</label>
            <select name="role" value={form.role} onChange={handle} className="role-select" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: '#fff', fontSize: '14px', outline: 'none' }} required>
              <option value="student">Student</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="field">
            <label>Password</label>
            <input name="password" type="password" placeholder="Min. 6 characters" value={form.password} onChange={handle} required minLength={6} />
          </div>
          <button className="btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
