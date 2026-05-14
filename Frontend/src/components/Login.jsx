import React, { useState } from 'react';
import { Mail, Lock, User, Shield, ArrowRight, CheckCircle2, AlertCircle, Database } from 'lucide-react';
import './Login.css';

export default function Login() {
  const [role, setRole] = useState('user'); // 'user' or 'admin'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });
  const [actionType, setActionType] = useState('login'); // 'login' or 'signup'

  const handleRoleChange = (selectedRole) => {
    setRole(selectedRole);
    setStatus({ type: null, message: '' });
    // Reset password but keep identifier for convenience if desired, or reset both
    setPassword('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      setStatus({
        type: 'error',
        message: 'Please fill in all required credentials.',
      });
      return;
    }

    setLoading(true);
    setStatus({ type: null, message: '' });

    // Simulated API call authentication logic
    setTimeout(() => {
      setLoading(false);
      if (actionType === 'signup') {
        setStatus({
          type: 'success',
          message: `Account created successfully for ${role.toUpperCase()}! Please log in.`,
        });
        return;
      }

      if (role === 'admin' && identifier.includes('admin')) {
        setStatus({
          type: 'success',
          message: 'Admin Authentication successful! Accessing manager dashboard...',
        });
      } else if (role === 'user' && identifier.includes('@')) {
        setStatus({
          type: 'success',
          message: 'Welcome back! Loading your asset dashboard...',
        });
      } else {
        // Mock error condition to show dynamic error feedback
        setStatus({
          type: 'error',
          message: role === 'admin' 
            ? 'Invalid Admin ID or credentials. Please use an identifier containing "admin".' 
            : 'Please enter a valid email address containing "@" to login as User.',
        });
      }
    }, 1500);
  };

  return (
    <div className="login-container">
      {/* Premium glowing backdrop elements */}
      <div className="login-blob-1"></div>
      <div className="login-blob-2"></div>

      <div className="glass-panel login-card animate-fade-in">
        {role === 'admin' && (
          <div className="admin-badge-indicator animate-fade-in">
            <Shield size={12} /> Admin Mode
          </div>
        )}

        <div className="login-header">
          <div className="login-logo-wrapper">
            <Database size={32} />
          </div>
          <h1 className="login-title">Asset manager</h1>
          <p className="login-subtitle">Secure Premium Asset Management</p>
        </div>

        {/* Dynamic Tab Switcher */}
        <div className="role-tabs">
          <button
            type="button"
            className={`role-tab ${role === 'user' ? 'active' : ''}`}
            onClick={() => handleRoleChange('user')}
          >
            <User className="tab-icon" /> User
          </button>
          <button
            type="button"
            className={`role-tab ${role === 'admin' ? 'active' : ''}`}
            onClick={() => handleRoleChange('admin')}
          >
            <Shield className="tab-icon" /> Admin
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label className="input-label" htmlFor="identifier">
              {role === 'admin' ? 'Administrator ID / Email' : 'Email Address'}
            </label>
            <div className="input-wrapper">
              <input
                id="identifier"
                type="text"
                className="login-input"
                placeholder={role === 'admin' ? 'admin.super@company.com' : 'name@company.com'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
              {role === 'admin' ? (
                <Shield className="input-icon" />
              ) : (
                <Mail className="input-icon" />
              )}
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="password">
              Password
            </label>
            <div className="input-wrapper">
              <input
                id="password"
                type="password"
                className="login-input"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Lock className="input-icon" />
            </div>
          </div>

          {/* Feedback banner */}
          {status.type && (
            <div className={`status-banner ${status.type}`}>
              {status.type === 'success' ? (
                <CheckCircle2 size={18} />
              ) : (
                <AlertCircle size={18} />
              )}
              <span>{status.message}</span>
            </div>
          )}

          <div className="btn-group">
            <button 
              type="submit" 
              className="signup-btn" 
              disabled={loading}
              onClick={() => setActionType('signup')}
            >
              {loading && actionType === 'signup' ? (
                <div className="spinner"></div>
              ) : (
                <span>Signup</span>
              )}
            </button>
            <button 
              type="submit" 
              className="login-btn" 
              disabled={loading}
              onClick={() => setActionType('login')}
            >
              {loading && actionType === 'login' ? (
                <div className="spinner"></div>
              ) : (
                <>
                  <span>Login</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
