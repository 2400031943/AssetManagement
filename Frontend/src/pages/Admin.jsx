import React from 'react';
import { LogOut, Database, Users, Server, Activity } from 'lucide-react';
import { useNavigate } from '../routes';
import './Dashboard.css';

export default function Admin() {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header glass-panel">
        <div className="dashboard-logo">
          <Database className="dashboard-logo-icon" size={28} />
          <span>Asset Manager <span style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: '500' }}>| Admin</span></span>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          <LogOut size={18} /> Logout
        </button>
      </header>

      <main className="dashboard-content animate-fade-in">
        <h1 className="dashboard-title">Admin Dashboard</h1>
        <p className="dashboard-subtitle">Manage system assets, users, and overall activity.</p>

        <div className="stats-grid">
          <div className="stat-card admin glass-panel">
            <div className="stat-icon-wrapper">
              <Server size={24} />
            </div>
            <div className="stat-info">
              <h3>Total Assets</h3>
              <p>1,248</p>
            </div>
          </div>
          
          <div className="stat-card admin glass-panel">
            <div className="stat-icon-wrapper">
              <Users size={24} />
            </div>
            <div className="stat-info">
              <h3>Active Users</h3>
              <p>432</p>
            </div>
          </div>

          <div className="stat-card admin glass-panel">
            <div className="stat-icon-wrapper">
              <Activity size={24} />
            </div>
            <div className="stat-info">
              <h3>System Health</h3>
              <p>99.9%</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
