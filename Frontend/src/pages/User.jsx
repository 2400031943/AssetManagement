import React, { useState, useEffect, useCallback } from 'react';
import { LogOut, Database, LayoutDashboard, PlusCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from '../routes';
import { getMyAssets, createAsset } from '../api';
import { getStoredSession, clearStoredSession } from '../authSession';
import MyAssets from '../components/MyAssets';
import AddAsset from '../components/AddAsset';
import './Dashboard.css';

export default function User() {
  const navigate = useNavigate();
  const { user: loggedInUser, token } = getStoredSession();
  const footerName = loggedInUser.employeeName || loggedInUser.name || loggedInUser.username || 'User';
  const footerDesignation = loggedInUser.designation || loggedInUser.role || 'User';
  const employeeCode = loggedInUser.emp_code || loggedInUser.empCode || '';
  const [activeTab, setActiveTab] = useState('my-assets');
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMyAssets = useCallback(() => {
    setLoading(true);
    setError(null);
    getMyAssets()
      .then(data => {
        setAssets(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        console.error('Failed to load assets:', err);
        const message = (err?.message || '').toLowerCase();
        if (
          message.includes('missing authorization') ||
          message.includes('unauthorized') ||
          message.includes('token')
        ) {
          setError('Your session has expired. Please log in again.');
          clearStoredSession();
          navigate('/');
          return;
        }
        setError('Failed to load your assets. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  // Fetch assets on mount and whenever the My Assets tab is activated
  useEffect(() => {
    if (!token) {
      clearStoredSession();
      navigate('/');
      return;
    }
    if (activeTab === 'my-assets') {
      fetchMyAssets();
    }
  }, [activeTab, fetchMyAssets, navigate, token]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleLogout = () => {
    clearStoredSession();
    navigate('/');
  };

  const handleAddAsset = async (newAsset) => {
    try {
      // Inject the logged-in user's local DB id so the asset is linked correctly
      const payload = {
        ...newAsset,
        assigned_to: loggedInUser.id || null,
        // Ensure AssetCustodianECNO is set from logged-in user if not already provided
        AssetCustodianECNO: newAsset.AssetCustodianECNO || employeeCode,
      };
      const saved = await createAsset(payload);
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
          <button
            className={`nav-item ${activeTab === 'my-assets' ? 'active' : ''}`}
            onClick={() => handleTabChange('my-assets')}
          >
            <LayoutDashboard size={20} /><span>My Assets</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'add-asset' ? 'active' : ''}`}
            onClick={() => handleTabChange('add-asset')}
          >
            <PlusCircle size={20} /><span>Add Asset</span>
          </button>
        </nav>

        {/* Employee code badge */}
        {employeeCode && (
          <div className="sidebar-ecno-badge">
            <span className="sidebar-ecno-label">Employee Code</span>
            <span className="sidebar-ecno-value">{employeeCode.toUpperCase()}</span>
          </div>
        )}

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
        {activeTab === 'my-assets' && (
          <MyAssets
            assets={assets}
            loading={loading}
            error={error}
            employeeCode={employeeCode}
            onRefresh={fetchMyAssets}
          />
        )}
        {activeTab === 'add-asset' && <AddAsset onAddAsset={handleAddAsset} />}
      </main>
    </div>
  );
}
