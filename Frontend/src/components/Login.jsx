import React, { useState } from 'react';
import { BadgeCheck, Lock, User, Shield, ArrowRight, CheckCircle2, AlertCircle, Database } from 'lucide-react';
import { useNavigate } from '../routes';
import { login as apiLogin } from '../api';
import { setStoredSession, clearStoredSession } from '../authSession';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState('user');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });

  const handleRoleChange = (selectedRole) => {
    setRole(selectedRole);
    setStatus({ type: null, message: '' });
    setPassword('');
  };

  const handleLogin = async () => {
    const employeeCode = identifier.trim().toUpperCase();

    if (!employeeCode || !password) {
      setStatus({ type: 'error', message: 'Please fill in all required credentials.' });
      return;
    }

    setLoading(true);
    setStatus({ type: null, message: '' });

    try {
      const { user, token } = await apiLogin(employeeCode, password);
      const displayName = user.employeeName || user.EMPLOYEENAME || user.employee_name || user.username || employeeCode;
      const designation = user.designation || user.DESGFULLNAME || user.role || '';

      // Persist session
      setStoredSession({
        ...user,
        name: displayName,
        employeeName: displayName,
        designation,
        emp_code: user.emp_code || employeeCode,
        area: user.area || null,
      }, token);

      const dbRole = user.role; // 'Admin' | 'AreaAdmin' | 'User'

      // ── Admin tab: only users with role=Admin in DB can proceed ──────────
      if (role === 'admin') {
        if (dbRole !== 'Admin') {
          setStatus({ type: 'error', message: 'Access denied. You do not have Admin privileges.' });
          clearStoredSession();
          return;
        }
        setStatus({ type: 'success', message: 'Admin Authentication successful!' });
        setTimeout(() => navigate('/admin'), 600);
        return;
      }

      // ── User tab: tab choice is always respected — never redirect to /admin
      //    Even if DB role is Admin, User tab gives normal user access.
      if (dbRole === 'AreaAdmin') {
        setStatus({ type: 'success', message: 'Welcome! Loading Area Admin dashboard…' });
        setTimeout(() => navigate('/area-admin'), 600);
      } else {
        setStatus({ type: 'success', message: 'Welcome back! Loading your asset dashboard…' });
        setTimeout(() => navigate('/user'), 600);
      }

    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Authentication failed.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-blob-1"></div>
      <div className="login-blob-2"></div>

      <div className="glass-panel login-card animate-fade-in">
        {role === 'admin' && (
          <div className="admin-badge-indicator animate-fade-in">
            <Shield size={12} /> Admin Mode
          </div>
        )}

        <div className="login-header">
          <div className="login-logo-wrapper"><Database size={32} /></div>
          <h1 className="login-title">ACMS Systems Management</h1>
          <p className="login-subtitle">Find your Assets with ease</p>
        </div>

        <div className="role-tabs">
          <button type="button" className={`role-tab ${role === 'user' ? 'active' : ''}`} onClick={() => handleRoleChange('user')}>
            <User className="tab-icon" /> User
          </button>
          <button type="button" className={`role-tab ${role === 'admin' ? 'active' : ''}`} onClick={() => handleRoleChange('admin')}>
            <Shield className="tab-icon" /> Admin
          </button>
        </div>

        <form className="login-form" onSubmit={(e) => {
          e.preventDefault();
          handleLogin();
        }}>
          <div className="input-group">
            <label className="input-label" htmlFor="identifier">
              Employee Code
            </label>
            <div className="input-wrapper">
              <input
                id="identifier" type="text" className="login-input"
                placeholder="e.g. NR1234"
                value={identifier} onChange={(e) => setIdentifier(e.target.value)} required
              />
              {role === 'admin' ? <Shield className="input-icon" /> : <BadgeCheck className="input-icon" />}
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="password">Password</label>
            <div className="input-wrapper">
              <input
                id="password" type="password" className="login-input"
                placeholder="Enter your password here"
                value={password} onChange={(e) => setPassword(e.target.value)} required
              />
              <Lock className="input-icon" />
            </div>
          </div>

          {status.type && (
            <div className={`status-banner ${status.type}`}>
              {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{status.message}</span>
            </div>
          )}

          <div className="btn-group">
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? <div className="spinner"></div> : <><span>Login</span><ArrowRight size={18} /></>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
