import React, { useState } from 'react';
import { Search, Filter, Monitor, FileText, ArrowLeft } from 'lucide-react';
import '../pages/Dashboard.css';

export default function AdminAssets({ assets, loading, selectedUser, onClearUserSelection }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const filteredAssets = assets.filter((asset) => {
    // If a user is selected, only show their assets
    if (selectedUser && asset.assignedUserId !== selectedUser.id) return false;

    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          asset.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter ? asset.category === categoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="admin-assets-container animate-fade-in">
      <div className="section-header" style={{ marginBottom: selectedUser ? '1rem' : '2rem' }}>
        <h2 className="section-title">
          {selectedUser ? `Assets Assigned to ${selectedUser.name}` : 'All System Assets'}
        </h2>
        
        <div className="filters-container">
          <div className="search-wrapper">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or serial..." 
              className="search-input login-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-wrapper">
            <Filter className="filter-icon" size={18} />
            <select 
              className="filter-select login-input"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="IT Systems">IT Systems</option>
              <option value="Furniture">Furniture</option>
              <option value="Electrical">Electrical</option>
              <option value="UPS">UPS</option>
              <option value="Others">Others</option>
            </select>
          </div>
        </div>
      </div>

      {selectedUser && (
        <button 
          onClick={onClearUserSelection}
          className="logout-btn" 
          style={{ marginBottom: '1.5rem', border: 'none', padding: '0.5rem 0', color: 'var(--accent-primary)' }}
        >
          <ArrowLeft size={16} /> Back to All Users
        </button>
      )}

      {loading ? (
        <div className="loading-state">Loading system assets...</div>
      ) : (
        <div className="assets-grid">
          {filteredAssets.length > 0 ? (
            filteredAssets.map(asset => (
              <div key={asset.id} className="asset-card glass-panel">
                <div className="asset-card-header">
                  <div className="asset-icon">
                    {asset.category === 'IT Systems' ? <Monitor size={20} /> : <FileText size={20} />}
                  </div>
                  <span className="asset-category-badge">{asset.category}</span>
                </div>
                <h3 className="asset-name">{asset.name}</h3>
                <div className="asset-details">
                  <p><strong>S/N:</strong> {asset.serialNumber}</p>
                  <p><strong>Make:</strong> {asset.make}</p>
                  <p><strong>Model:</strong> {asset.model}</p>
                  {!selectedUser && (
                    <p><strong>Assigned To:</strong> <span style={{ color: asset.assignedUserName ? 'var(--text-main)' : 'var(--text-muted)' }}>{asset.assignedUserName || 'Unassigned'}</span></p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <p>No assets found matching your criteria.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
