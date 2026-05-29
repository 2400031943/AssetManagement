import React, { useState, useEffect } from 'react';
import { LogOut, Database, LayoutDashboard, PlusCircle } from 'lucide-react';
import { useNavigate } from '../routes';
import { getMyAssets, createAsset } from '../api';
import MyAssets from '../components/MyAssets';
import AddAsset from '../components/AddAsset';
import './Dashboard.css';

export default function User() {
  const navigate = useNavigate();
  const loggedInUser = JSON.parse(localStorage.getItem('user') || '{"name": "User"}');
  const footerName = loggedInUser.employeeName || loggedInUser.name || loggedInUser.username || 'User';
  const footerDesignation = loggedInUser.designation || loggedInUser.role || 'User';
  const [activeTab, setActiveTab] = useState('my-assets');
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMyAssets()
      .then(data => setAssets(data))
      .catch(err => console.error('Failed to load assets:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleAddAsset = async (newAsset) => {
    try {
      const saved = await createAsset(newAsset);
      setAssets(prev => [...prev, saved]);
      setActiveTab('my-assets');
    } catch (err) {
      console.error('Failed to save asset:', err);
    }
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar glass-panel">
        <div className="sidebar-header">
          <Database className="dashboard-logo-icon" size={28} />
          <span className="sidebar-title">Asset Manager</span>
        </div>

        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'my-assets' ? 'active' : ''}`} onClick={() => setActiveTab('my-assets')}>
            <LayoutDashboard size={20} /><span>My Assets</span>
          </button>
          <button className={`nav-item ${activeTab === 'add-asset' ? 'active' : ''}`} onClick={() => setActiveTab('add-asset')}>
            <PlusCircle size={20} /><span>Add Asset</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-card">
            <div className="user-profile-icon">{footerName.charAt(0).toUpperCase()}</div>
            <div className="user-profile-info">
              <span className="user-profile-name">{footerName}</span>
              <span className="user-profile-role">{footerDesignation}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-btn full-width" style={{ marginTop: '0.5rem' }}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      <main className="dashboard-main-content">
        {activeTab === 'my-assets' && <MyAssets assets={assets} loading={loading} />}
        {activeTab === 'add-asset' && <AddAsset onAddAsset={handleAddAsset} />}
      </main>
    </div>
  );
}
