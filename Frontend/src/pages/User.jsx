import React, { useState, useEffect, useCallback } from 'react';
import { LogOut, Database, LayoutDashboard, PlusCircle, Sparkles, Clock, ShieldCheck } from 'lucide-react';
import { useNavigate } from '../routes';
import { getMyAssets, createAsset, updateAsset } from '../api';
import { getStoredSession, clearStoredSession } from '../authSession';
import MyAssets from '../components/MyAssets';
import AddAsset from '../components/AddAsset';
import ApprovalPending from '../components/ApprovalPending';
import PendingApprovals from '../components/PendingApprovals';
import './Dashboard.css';

export default function User() {
  const navigate = useNavigate();
  const { user: loggedInUser, token } = getStoredSession();
  const employeeCode = loggedInUser.emp_code || loggedInUser.empCode || '';
  const footerName        = loggedInUser.employeeName        || loggedInUser.EMPLOYEENAME  || loggedInUser.name     || loggedInUser.username || employeeCode;
  const footerCode        = loggedInUser.employeeCode        || loggedInUser.EMPLOYEECODE  || loggedInUser.emp_code || employeeCode;
  const footerDesignation = loggedInUser.employeeDesignation || loggedInUser.DESGFULLNAME  || '';
  const [activeTab, setActiveTab] = useState('approval-pending');
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMyAssets = useCallback(() => {
    setLoading(true);
    setError(null);
    getMyAssets()
      .then(data => { setAssets(Array.isArray(data) ? data : []); })
      .catch(err => {
        console.error('Failed to load assets:', err);
        const message = (err?.message || '').toLowerCase();
        if (message.includes('missing authorization') || message.includes('unauthorized') || message.includes('token')) {
          setError('Your session has expired. Please log in again.');
          clearStoredSession();
          navigate('/');
          return;
        }
        setError('Failed to load your assets. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => {
    if (!token) { clearStoredSession(); navigate('/'); return; }
    if (activeTab === 'my-assets') fetchMyAssets();
  }, [activeTab, fetchMyAssets, navigate, token]);

  const handleTabChange = (tab) => setActiveTab(tab);
  const handleLogout = () => { clearStoredSession(); navigate('/'); };

  const handleAddAsset = async (newAsset) => {
    try {
      const payload = { ...newAsset, assigned_to: loggedInUser.id || null, AssetCustodianECNO: newAsset.AssetCustodianECNO || employeeCode };
      const saved = await createAsset(payload);
      setAssets(prev => [...prev, saved]);
      return { success: true };
    } catch (err) { console.error('Failed to save asset:', err); throw err; }
  };

  const handleUpdateAsset = async (assetId, updatedData) => {
    try {
      const updated = await updateAsset(assetId, updatedData);
      setAssets(prev => prev.map(a => a.id === assetId ? updated : a));
      return { success: true };
    } catch (err) { console.error('Failed to update asset:', err); throw err; }
  };

  const switchToMyAssets = () => setActiveTab('my-assets');

  return (
    <div className="dashboard-layout">
      <aside className="sidebar glass-panel">
        <div className="sidebar-header">
          <Database className="dashboard-logo-icon" size={28} />
          <span className="sidebar-title">ACMS Systems Management</span>
        </div>

        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'approval-pending' ? 'active' : ''}`} onClick={() => handleTabChange('approval-pending')}>
            <Clock size={20} /><span>Approval Pending List</span>
          </button>
          <button className={`nav-item ${activeTab === 'pending-approvals' ? 'active' : ''}`} onClick={() => handleTabChange('pending-approvals')}>
            <ShieldCheck size={20} /><span>Pending Approvals</span>
          </button>
          <button className={`nav-item ${activeTab === 'my-assets' ? 'active' : ''}`} onClick={() => handleTabChange('my-assets')}>
            <LayoutDashboard size={20} /><span>My ACMS Systems List</span>
          </button>
          <button className={`nav-item ${activeTab === 'add-asset' ? 'active' : ''}`} onClick={() => handleTabChange('add-asset')}>
            <PlusCircle size={20} /><span>Add System to ACMS List</span>
          </button>
          <button className={`nav-item ${activeTab === 'coins-recommendations' ? 'active' : ''}`} onClick={() => handleTabChange('coins-recommendations')}>
            <Sparkles size={20} /><span>COINS Recommendations</span>
          </button>
        </nav>

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
              <span className="user-profile-role" style={{ fontSize: '0.78rem', opacity: 0.7 }}>{footerCode}</span>
              {footerDesignation && <span style={{ fontSize: '0.72rem', opacity: 0.55, marginTop: '1px' }}>{footerDesignation}</span>}
            </div>
          </div>
          <button onClick={handleLogout} className="logout-btn full-width" style={{ marginTop: '0.5rem' }}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      <main className="dashboard-main-content">
        {activeTab === 'approval-pending'   && <ApprovalPending />}
        {activeTab === 'pending-approvals'  && <PendingApprovals loggedInUser={loggedInUser} />}
        {activeTab === 'my-assets'          && (
          <MyAssets assets={assets} loading={loading} error={error} employeeCode={employeeCode} onRefresh={fetchMyAssets} />
        )}
        {(activeTab === 'add-asset' || activeTab === 'coins-recommendations') && (
          <AddAsset
            onAddAsset={handleAddAsset}
            onUpdateAsset={handleUpdateAsset}
            onSuccess={switchToMyAssets}
            activeTabMode={activeTab}
            setActiveTab={setActiveTab}
          />
        )}
      </main>
    </div>
  );
}
