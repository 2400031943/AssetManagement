import React, { useState, useEffect } from 'react';
import { LogOut, Database, Users, Server, Activity, LayoutDashboard, Monitor } from 'lucide-react';
import { useNavigate } from '../routes';
import { getAllUsers, getAllAssets } from '../api';
import AdminUsers from '../components/AdminUsers';
import AdminAssets from '../components/AdminAssets';
import './Dashboard.css';

export default function Admin() {
  const navigate = useNavigate();
  const loggedInUser = JSON.parse(localStorage.getItem('user') || '{"name": "Admin"}');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [allAssets, setAllAssets] = useState([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([getAllUsers(), getAllAssets()])
      .then(([usersData, assetsData]) => {
        setUsers(usersData);
        setAllAssets(assetsData);
      })
      .catch(err => console.error('Failed to load admin data:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleSelectUser = (userId) => {
    setSelectedUserId(userId);
    setActiveTab('assets');
  };

  const handleClearUserSelection = () => {
    setSelectedUserId(null);
    setActiveTab('users');
  };

  const handleTabChange = (tab) => {
    if (tab !== 'assets') setSelectedUserId(null);
    setActiveTab(tab);
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <div className="dashboard-layout">
      <aside className="sidebar glass-panel">
        <div className="sidebar-header">
          <Database className="dashboard-logo-icon" size={28} />
          <span className="sidebar-title">
            Asset Manager <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500' }}>| Admin</span>
          </span>
        </div>

        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => handleTabChange('dashboard')}>
            <LayoutDashboard size={20} /><span>Overview</span>
          </button>
          <button className={`nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => handleTabChange('users')}>
            <Users size={20} /><span>Users</span>
          </button>
          <button className={`nav-item ${activeTab === 'assets' && !selectedUserId ? 'active' : ''}`} onClick={() => handleTabChange('assets')}>
            <Monitor size={20} /><span>All Assets</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-card">
            <div className="user-profile-icon">{loggedInUser.name?.charAt(0).toUpperCase() || 'A'}</div>
            <div className="user-profile-info">
              <span className="user-profile-name">{loggedInUser.name}</span>
              <span className="user-profile-role">Administrator</span>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-btn full-width" style={{ marginTop: '0.5rem' }}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      <main className="dashboard-main-content">
        {activeTab === 'dashboard' && (
          <div className="animate-fade-in" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 className="dashboard-title">System Overview</h1>
            <p className="dashboard-subtitle">Monitor total system assets, active users, and overall health.</p>
            <div className="stats-grid">
              <div className="stat-card admin glass-panel">
                <div className="stat-icon-wrapper"><Server size={24} /></div>
                <div className="stat-info"><h3>Total Assets</h3><p>{allAssets.length}</p></div>
              </div>
              <div className="stat-card admin glass-panel">
                <div className="stat-icon-wrapper"><Users size={24} /></div>
                <div className="stat-info"><h3>Active Users</h3><p>{users.length}</p></div>
              </div>
              <div className="stat-card admin glass-panel">
                <div className="stat-icon-wrapper"><Activity size={24} /></div>
                <div className="stat-info"><h3>System Health</h3><p>99.9%</p></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <AdminUsers users={users} loading={loading} onSelectUser={handleSelectUser} />
        )}

        {activeTab === 'assets' && (
          <AdminAssets
            assets={allAssets} loading={loading}
            selectedUser={selectedUser}
            onClearUserSelection={handleClearUserSelection}
          />
        )}
      </main>
    </div>
  );
}
