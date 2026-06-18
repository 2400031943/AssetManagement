import React, { useState, useEffect, useCallback } from 'react';
import { LogOut, Database, LayoutDashboard, PlusCircle, Sparkles, Clock, ShieldCheck, MapPin, Trash2, Send } from 'lucide-react';
import { useNavigate } from '../routes';
import { getMyAssets, createAsset, updateAsset, getCurrentUserProfile } from '../api';
import { getStoredSession, clearStoredSession, setStoredSession } from '../authSession';
import MyAssets from '../components/MyAssets';
import AddAsset from '../components/AddAsset';
import ApprovalPending from '../components/ApprovalPending';
import PendingApprovals from '../components/PendingApprovals';
import WhereIsMyAsset from '../components/WhereIsMyAsset';
import DeleteAsset from '../components/DeleteAsset';
import ReadyToSend from '../components/ReadyToSend';
import './Dashboard.css';

export default function User() {
  const navigate = useNavigate();
  const { user: loggedInUser, token } = getStoredSession();
  const [currentUser, setCurrentUser] = useState(loggedInUser);

  const employeeCode = currentUser.emp_code || currentUser.empCode || '';
  const footerName        = currentUser.employeeName        || currentUser.EMPLOYEENAME  || currentUser.name     || currentUser.username || employeeCode;
  const footerCode        = currentUser.employeeCode        || currentUser.EMPLOYEECODE  || currentUser.emp_code || employeeCode;
  const footerDesignation = currentUser.employeeDesignation || currentUser.DESGFULLNAME  || '';
  
  const [activeTab, setActiveTab] = useState('approval-pending');
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sync user profile from remote DB on mount to get FUNCDESGCODE
  useEffect(() => {
    if (!token) return;
    getCurrentUserProfile()
      .then(profile => {
        if (profile && profile.emp_code) {
          setCurrentUser(profile);
          setStoredSession(profile, token);
        }
      })
      .catch(err => {
        console.error('Failed to sync user profile:', err);
      });
  }, [token]);

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
      const payload = { ...newAsset, assigned_to: currentUser.id || null, AssetCustodianECNO: newAsset.AssetCustodianECNO || employeeCode };
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

  // Check if current user is an approver based on FUNCDESGCODE
  const isApproverDesignation = () => {
    const code = currentUser.funcdesgcode;
    if (code === undefined || code === null) return false;
    const numericCode = Number(code);
    
    // Approver/Registrar/Admin designation codes + DD code (40)
    const ALLOWED_CODES = [
      40, 20, 30, 50, 55, 60, 61, 65, 70, 105, 
      300, 310, 400, 500, 501, 510, 530, 540, 
      550, 560, 600, 2060, 2090, 2091
    ];
    return ALLOWED_CODES.includes(numericCode);
  };

  const showPendingApprovalsTab = currentUser.role === 'Admin' || isApproverDesignation();

  // Redirect if they land on the tab but don't have access
  useEffect(() => {
    if (activeTab === 'pending-approvals' && !showPendingApprovalsTab) {
      setActiveTab('approval-pending');
    }
  }, [activeTab, showPendingApprovalsTab]);

  return (
    <div className="dashboard-layout">
      <aside className="sidebar glass-panel">
        <div className="sidebar-header">
          <Database className="dashboard-logo-icon" size={28} />
          <span className="sidebar-title">ACMS Systems Management</span>
        </div>

        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'approval-pending' ? 'active' : ''}`} onClick={() => handleTabChange('approval-pending')}>
            <Clock size={20} /><span>Sent To Approval List</span>
          </button>
          
          {showPendingApprovalsTab && (
            <button className={`nav-item ${activeTab === 'pending-approvals' ? 'active' : ''}`} onClick={() => handleTabChange('pending-approvals')}>
              <ShieldCheck size={20} /><span>Pending For My Approval</span>
            </button>
          )}

          <button className={`nav-item ${activeTab === 'my-assets' ? 'active' : ''}`} onClick={() => handleTabChange('my-assets')}>
            <LayoutDashboard size={20} /><span>My ACMS Systems List</span>
          </button>
          <button className={`nav-item ${activeTab === 'add-asset' ? 'active' : ''}`} onClick={() => handleTabChange('add-asset')}>
            <PlusCircle size={20} /><span>Add System to ACMS List</span>
          </button>
          <button className={`nav-item ${activeTab === 'coins-recommendations' ? 'active' : ''}`} onClick={() => handleTabChange('coins-recommendations')}>
            <Sparkles size={20} /><span>Add From Coins</span>
          </button>
          <button className={`nav-item ${activeTab === 'ready-to-send' ? 'active' : ''}`} onClick={() => handleTabChange('ready-to-send')}>
            <Send size={20} /><span>Ready to Send</span>
          </button>
          <button className={`nav-item ${activeTab === 'delete-asset' ? 'active' : ''}`} onClick={() => handleTabChange('delete-asset')}>
            <Trash2 size={20} /><span>Delete Asset from ACMS List</span>
          </button>
          <button className={`nav-item ${activeTab === 'where-is-my-asset' ? 'active' : ''}`} onClick={() => handleTabChange('where-is-my-asset')}>
            <MapPin size={20} /><span>Where is my Asset?</span>
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
        {activeTab === 'pending-approvals'  && showPendingApprovalsTab && <PendingApprovals loggedInUser={currentUser} />}
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
        {activeTab === 'where-is-my-asset' && <WhereIsMyAsset />}
        {activeTab === 'delete-asset'       && <DeleteAsset />}
        {activeTab === 'ready-to-send'      && <ReadyToSend />}
      </main>
    </div>
  );
}
