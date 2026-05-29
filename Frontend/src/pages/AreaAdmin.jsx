import React, { useState, useEffect } from 'react';
import { LogOut, Database, Users, Monitor, ArrowLeft, Search, Filter, Eye, FileText, MapPin } from 'lucide-react';
import { useNavigate } from '../routes';
import { getUsersByArea, getAssetsByArea } from '../api';
import './Dashboard.css';

export default function AreaAdmin() {
  const navigate = useNavigate();
  const loggedInUser = JSON.parse(localStorage.getItem('user') || '{"name": "Area Admin", "area": ""}');
  const footerName = loggedInUser.employeeName || loggedInUser.name || loggedInUser.username || 'Area Admin';
  const footerDesignation = loggedInUser.designation || 'Area Admin';
  const assignedArea = loggedInUser.area || 'All Areas';

  const [activeTab, setActiveTab] = useState('users');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [allAssets, setAllAssets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([getUsersByArea(assignedArea), getAssetsByArea(assignedArea)])
      .then(([usersData, assetsData]) => {
        setUsers(usersData);
        setAllAssets(assetsData);
      })
      .catch(err => console.error('Failed to load area data:', err))
      .finally(() => setLoading(false));
  }, [assignedArea]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleSelectUser = (userId) => {
    setSelectedUserId(userId);
    setActiveTab('assets');
    setSearchTerm('');
  };

  const handleClearUserSelection = () => {
    setSelectedUserId(null);
    setActiveTab('users');
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

  const filteredAssets = allAssets.filter(asset => {
    if (selectedUser && asset.assigned_to !== selectedUser.id) return false;
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          asset.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter ? asset.CATEGORY === categoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="dashboard-layout">
      <aside className="sidebar glass-panel">
        <div className="sidebar-header">
          <Database className="dashboard-logo-icon" size={28} />
          <span className="sidebar-title">
            Asset Manager <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500' }}>| Area Admin</span>
          </span>
        </div>

        <div style={{ padding: '0.5rem 1.5rem', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(99,102,241,0.12)', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
            <MapPin size={14} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: '600' }}>{assignedArea}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => { setActiveTab('users'); setSelectedUserId(null); setSearchTerm(''); }}>
            <Users size={20} /><span>Users in Area</span>
          </button>
          <button className={`nav-item ${activeTab === 'assets' && !selectedUserId ? 'active' : ''}`}
            onClick={() => { setActiveTab('assets'); setSelectedUserId(null); setSearchTerm(''); }}>
            <Monitor size={20} /><span>All Area Assets</span>
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

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="admin-users-container animate-fade-in">
            <div className="section-header">
              <h2 className="section-title">Users in {assignedArea}</h2>
              <div className="filters-container">
                <div className="search-wrapper">
                  <Search className="search-icon" size={18} />
                  <input type="text" placeholder="Search by name or email..." className="search-input login-input"
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>
            </div>

            {loading ? <div className="loading-state">Loading users...</div> : (
              <div className="assets-grid">
                {filteredUsers.length > 0 ? filteredUsers.map(user => (
                  <div key={user.id} className="asset-card glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div className="asset-card-header">
                        <div className="asset-icon" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                          <Users size={20} />
                        </div>
                        <span className="asset-category-badge">{user.role}</span>
                      </div>
                      <h3 className="asset-name">{user.username}</h3>
                      <div className="asset-details">
                        <p><strong>Email:</strong> {user.email}</p>
                        <p><strong>Area:</strong> {user.area}</p>
                        <p><strong>Assigned Assets:</strong> {user.assetCount}</p>
                      </div>
                    </div>
                    <div style={{ marginTop: '1.5rem' }}>
                      <button onClick={() => handleSelectUser(user.id)} className="submit-btn full-width"
                        style={{ justifyContent: 'center', padding: '0.6rem' }}>
                        <Eye size={16} /> View Assets
                      </button>
                    </div>
                  </div>
                )) : <div className="empty-state"><p>No users found in {assignedArea}.</p></div>}
              </div>
            )}
          </div>
        )}

        {/* ASSETS TAB */}
        {activeTab === 'assets' && (
          <div className="admin-assets-container animate-fade-in">
            <div className="section-header" style={{ marginBottom: selectedUser ? '1rem' : '2rem' }}>
              <h2 className="section-title">
                {selectedUser ? `Assets of ${selectedUser.username}` : `All Assets in ${assignedArea}`}
              </h2>
              <div className="filters-container">
                <div className="search-wrapper">
                  <Search className="search-icon" size={18} />
                  <input type="text" placeholder="Search by name or serial..." className="search-input login-input"
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="filter-wrapper">
                  <Filter className="filter-icon" size={18} />
                  <select className="filter-select login-input" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                    <option value="">All Categories</option>
                    <option value="SERVER TYPE 1">SERVER TYPE 1</option>
                    <option value="SERVER TYPE 2">SERVER TYPE 2</option>
                    <option value="PC TYPE 1">PC TYPE 1</option>
                    <option value="PC TYPE 2">PC TYPE 2</option>
                    <option value="PC TYPE 3">PC TYPE 3</option>
                    <option value="PC TYPE 4">PC TYPE 4</option>
                    <option value="STORAGE TYPE 2">STORAGE TYPE 2</option>
                    <option value="PRINTER TYPE 1">PRINTER TYPE 1</option>
                    <option value="PRINTER TYPE 2">PRINTER TYPE 2</option>
                    <option value="SP TYPE 1">SP TYPE 1</option>
                    <option value="SP TYPE 2">SP TYPE 2</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
              </div>
            </div>

            {selectedUser && (
              <button onClick={handleClearUserSelection} className="logout-btn"
                style={{ marginBottom: '1.5rem', border: 'none', padding: '0.5rem 0', color: 'var(--accent-primary)' }}>
                <ArrowLeft size={16} /> Back to All Users
              </button>
            )}

            {loading ? <div className="loading-state">Loading assets...</div> : (
              <div className="assets-grid">
                {filteredAssets.length > 0 ? filteredAssets.map(asset => (
                  <div key={asset.id} className="asset-card glass-panel">
                    <div className="asset-card-header">
                      <div className="asset-icon">
                        {asset.CATEGORY?.includes('SERVER') ? <Monitor size={20} /> : <FileText size={20} />}
                      </div>
                      <span className="asset-category-badge">{asset.CATEGORY}</span>
                    </div>
                    <h3 className="asset-name">{asset.name}</h3>
                    <div className="asset-details">
                      <p><strong>S/N:</strong> {asset.serialNumber}</p>
                      <p><strong>Make:</strong> {asset.make}</p>
                      <p><strong>Model:</strong> {asset.model}</p>
                      {!selectedUser && (
                        <p><strong>Assigned To:</strong> <span style={{ color: asset.assignedUserName ? 'var(--text-main)' : 'var(--text-muted)' }}>
                          {asset.assignedUserName || 'Unassigned'}
                        </span></p>
                      )}
                    </div>
                  </div>
                )) : <div className="empty-state"><p>No assets found.</p></div>}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
