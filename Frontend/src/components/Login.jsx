import React, { useState } from 'react';
import { BadgeCheck, Lock, User, Shield, ArrowRight, CheckCircle2, AlertCircle, Database, MapPin } from 'lucide-react';
import { useNavigate } from '../routes';
import { login as apiLogin } from '../api';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState('user');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });
  const [selectedArea, setSelectedArea] = useState('');

  const handleRoleChange = (selectedRole) => {
    setRole(selectedRole);
    setStatus({ type: null, message: '' });
    setPassword('');
    setSelectedArea('');
  };

  const handleLogin = async () => {
    const employeeCode = identifier.trim().toUpperCase();

    if (!employeeCode || !password) {
      setStatus({ type: 'error', message: 'Please fill in all required credentials.' });
      return;
    }
    if (role === 'area-admin' && !selectedArea) {
      setStatus({ type: 'error', message: 'Please select your assigned area.' });
      return;
    }

    setLoading(true);
    setStatus({ type: null, message: '' });

    try {
      const { user, token } = await apiLogin(employeeCode, password);
      const displayName = user.employeeName || user.EMPLOYEENAME || user.employee_name || user.username || employeeCode;
      const designation = user.designation || user.DESGFULLNAME || user.role || '';

      // Persist session
      localStorage.setItem('user', JSON.stringify({
        ...user,
        name: displayName,
        employeeName: displayName,
        designation,
        emp_code: user.emp_code || employeeCode,
        token,
        area: role === 'area-admin' ? selectedArea : (user.area || null),
      }));

      if (role === 'admin') {
        setStatus({ type: 'success', message: 'Admin Authentication successful!' });
        setTimeout(() => navigate('/admin'), 600);
      } else if (role === 'area-admin') {
        setStatus({ type: 'success', message: `Welcome! Loading ${selectedArea} dashboard...` });
        setTimeout(() => navigate('/area-admin'), 600);
      } else {
        setStatus({ type: 'success', message: 'Welcome back! Loading your asset dashboard...' });
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
        {(role === 'admin' || role === 'area-admin') && (
          <div className="admin-badge-indicator animate-fade-in">
            <Shield size={12} /> {role === 'area-admin' ? 'Area Admin Mode' : 'Admin Mode'}
          </div>
        )}

        <div className="login-header">
          <div className="login-logo-wrapper"><Database size={32} /></div>
          <h1 className="login-title">Asset Manager</h1>
          <p className="login-subtitle">Find your Assets with ease</p>
        </div>

        <div className="role-tabs">
          <button type="button" className={`role-tab ${role === 'user' ? 'active' : ''}`} onClick={() => handleRoleChange('user')}>
            <User className="tab-icon" /> User
          </button>
          <button type="button" className={`role-tab ${role === 'area-admin' ? 'active' : ''}`} onClick={() => handleRoleChange('area-admin')}>
            <MapPin className="tab-icon" /> Area Admin
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
              {role === 'admin' ? <Shield className="input-icon" />
                : role === 'area-admin' ? <MapPin className="input-icon" />
                : <BadgeCheck className="input-icon" />}
            </div>
          </div>

          {role === 'area-admin' && (
            <div className="input-group">
              <label className="input-label" htmlFor="area">Assigned Area *</label>
              <div className="input-wrapper">
                <select id="area" className="login-input" value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)} required style={{ paddingRight: '2.5rem' }}>
                  <option value="">Select your area...</option>
                  <option value="Balanagar">Balanagar</option>
                  <option value="Shadnagar">Shadnagar</option>
                  <option value="RSAA Datacentre Balanagar">RSAA Datacentre Balanagar</option>
                </select>
                <MapPin className="input-icon" />
              </div>
            </div>
          )}

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
