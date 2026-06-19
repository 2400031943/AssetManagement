import React, { useState, useEffect, useCallback } from 'react';
import {
  LogOut, Database, Users, Server, Activity,
  LayoutDashboard, Monitor, Laptop, MapPin,
  PlusCircle, Sparkles, Clock, ShieldCheck,
  Trash2, Send, Shield,
} from 'lucide-react';
import { useNavigate } from '../routes';
import { getAllUsers, getAllAssets, getMyAssets, createAsset, updateAsset, getCurrentUserProfile } from '../api';
import { getStoredSession, clearStoredSession, setStoredSession } from '../authSession';
import AdminUsers    from '../components/AdminUsers';
import AdminAssets   from '../components/AdminAssets';
import MyAssets      from '../components/MyAssets';
import AddAsset      from '../components/AddAsset';
import ApprovalPending   from '../components/ApprovalPending';
import PendingApprovals  from '../components/PendingApprovals';
import WhereIsMyAsset    from '../components/WhereIsMyAsset';
import DeleteAsset       from '../components/DeleteAsset';
import ReadyToSend       from '../components/ReadyToSend';
import './Dashboard.css';

export default function Admin() {
  const navigate = useNavigate();
  const { user: loggedInUser, token } = getStoredSession();
  const [currentUser, setCurrentUser] = useState(loggedInUser);

  const employeeCode      = currentUser.emp_code || currentUser.empCode || '';
  const footerName        = currentUser.employeeName        || currentUser.EMPLOYEENAME  || currentUser.name     || currentUser.username || employeeCode;
  const footerCode        = currentUser.employeeCode        || currentUser.EMPLOYEECODE  || currentUser.emp_code || employeeCode;
  const footerDesignation = currentUser.employeeDesignation || currentUser.DESGFULLNAME  || '';

  const [activeTab,       setActiveTab]       = useState('my-assets');
  const [selectedUserId,  setSelectedUserId]  = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [users,           setUsers]           = useState([]);
  const [allAssets,       setAllAssets]       = useState([]);
  const [myAssets,        setMyAssets]        = useState([]);
  const [myAssetsLoading, setMyAssetsLoading] = useState(false);
  const [error,           setError]           = useState(null);

  // ── Sync user profile from remote DB (to get FUNCDESGCODE) ───────────────
  useEffect(() => {
    if (!token) return;
    getCurrentUserProfile()
      .then(profile => {
        if (profile && profile.emp_code) {
          setCurrentUser(profile);
          setStoredSession(profile, token);
        }
      })
      .catch(err => console.error('Failed to sync admin profile:', err));
  }, [token]);

  // ── Load admin-only data (users + all assets) ─────────────────────────────
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

  // ── Load my ACMS list ─────────────────────────────────────────────────────
  const fetchMyAssets = useCallback(() => {
    setMyAssetsLoading(true);
    setError(null);
    getMyAssets()
      .then(data => setMyAssets(Array.isArray(data) ? data : []))
      .catch(err => {
        const msg = (err?.message || '').toLowerCase();
        if (msg.includes('missing authorization') || msg.includes('unauthorized') || msg.includes('token')) {
          clearStoredSession(); navigate('/'); return;
        }
        setError('Failed to load your assets.');
      })
      .finally(() => setMyAssetsLoading(false));
  }, [navigate]);

  useEffect(() => {
    if (!token) { clearStoredSession(); navigate('/'); return; }
    if (activeTab === 'my-assets') fetchMyAssets();
  }, [activeTab, fetchMyAssets, navigate, token]);

  const handleLogout = () => { clearStoredSession(); navigate('/'); };

  const handleAddAsset = async (newAsset) => {
    try {
      const payload = { ...newAsset, assigned_to: currentUser.id || null, AssetCustodianECNO: newAsset.AssetCustodianECNO || employeeCode };
      const saved = await createAsset(payload);
      setMyAssets(prev => [...prev, saved]);
      return { success: true };
    } catch (err) { console.error('Failed to save asset:', err); throw err; }
  };

  const handleUpdateAsset = async (assetId, updatedData) => {
    try {
      const updated = await updateAsset(assetId, updatedData);
      setMyAssets(prev => prev.map(a => a.id === assetId ? updated : a));
      return { success: true };
    } catch (err) { console.error('Failed to update asset:', err); throw err; }
  };

  const handleSelectUser = (userId) => { setSelectedUserId(userId); setActiveTab('all-assets'); };
  const handleClearUserSelection = () => { setSelectedUserId(null); setActiveTab('users'); };

  const handleTabChange = (tab) => {
    if (tab !== 'all-assets') setSelectedUserId(null);
    setActiveTab(tab);
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

  // Admins always see pending-approvals tab (they have all approver codes by role)
  const showPendingApprovalsTab = true;

  return (
    <div className="dashboard-layout">
      <aside className="sidebar glass-panel">
        <div className="sidebar-header">
          <Database className="dashboard-logo-icon" size={28} />
          <span className="sidebar-title">
            ACMS Systems Management{' '}
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>| Admin</span>
          </span>
        </div>

        <nav className="sidebar-nav">

          {/* ── Admin-exclusive section ─────────────────────────── */}
          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', padding: '0.5rem 0.75rem 0.25rem', textTransform: 'uppercase' }}>
            Admin
          </div>
          <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => handleTabChange('dashboard')}>
            <Activity size={20} /><span>Overview</span>
          </button>
          <button className={`nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => handleTabChange('users')}>
            <Users size={20} /><span>Manage Users</span>
          </button>
          <button className={`nav-item ${activeTab === 'all-assets' && !selectedUserId ? 'active' : ''}`} onClick={() => handleTabChange('all-assets')}>
            <Monitor size={20} /><span>All Assets</span>
          </button>

          {/* ── Same as User section ────────────────────────────── */}
          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', padding: '0.75rem 0.75rem 0.25rem', textTransform: 'uppercase', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '0.5rem' }}>
            Workflow
          </div>
          <button className={`nav-item ${activeTab === 'pending-approvals' ? 'active' : ''}`} onClick={() => handleTabChange('pending-approvals')}>
            <ShieldCheck size={20} /><span>Pending For My Approval</span>
          </button>
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
          <button className={`nav-item ${activeTab === 'approval-pending' ? 'active' : ''}`} onClick={() => handleTabChange('approval-pending')}>
            <Clock size={20} /><span>Sent To Approval List</span>
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

        {/* ── Admin-exclusive panels ─────────────────────────────────────── */}
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
                <div className="stat-icon-wrapper"><Laptop size={24} /></div>
                <div className="stat-info"><h3>My Assets</h3><p>{myAssets.length}</p></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <AdminUsers users={users} loading={loading} onSelectUser={handleSelectUser} />
        )}

        {activeTab === 'all-assets' && (
          <AdminAssets
            assets={allAssets} loading={loading}
            selectedUser={selectedUser}
            onClearUserSelection={handleClearUserSelection}
          />
        )}

        {/* ── Shared workflow panels (same as User.jsx) ──────────────────── */}
        {activeTab === 'pending-approvals' && (
          <PendingApprovals loggedInUser={currentUser} />
        )}

        {activeTab === 'my-assets' && (
          <MyAssets assets={myAssets} loading={myAssetsLoading} error={error} employeeCode={employeeCode} onRefresh={fetchMyAssets} />
        )}

        {(activeTab === 'add-asset' || activeTab === 'coins-recommendations') && (
          <AddAsset
            onAddAsset={handleAddAsset}
            onUpdateAsset={handleUpdateAsset}
            onSuccess={() => setActiveTab('my-assets')}
            activeTabMode={activeTab}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'ready-to-send'    && <ReadyToSend />}
        {activeTab === 'delete-asset'     && <DeleteAsset />}
        {activeTab === 'approval-pending' && <ApprovalPending />}
        {activeTab === 'where-is-my-asset'&& <WhereIsMyAsset />}
      </main>
    </div>
  );
}
