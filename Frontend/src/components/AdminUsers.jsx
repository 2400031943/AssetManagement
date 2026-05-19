import React, { useState } from 'react';
import { Search, User, Eye } from 'lucide-react';
import '../pages/Dashboard.css';

export default function AdminUsers({ users, loading, onSelectUser }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter((u) => 
    (u.username || u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-users-container animate-fade-in">
      <div className="section-header">
        <h2 className="section-title">User Management</h2>
        <div className="filters-container">
          <div className="search-wrapper">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              className="search-input login-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading users...</div>
      ) : (
        <div className="assets-grid">
          {filteredUsers.length > 0 ? (
            filteredUsers.map(user => (
              <div key={user.id} className="asset-card glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div className="asset-card-header">
                    <div className="asset-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                      <User size={20} />
                    </div>
                    <span className="asset-category-badge">{user.role}</span>
                  </div>
                  <h3 className="asset-name">{user.username || user.name}</h3>
                  <div className="asset-details">
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Assigned Assets:</strong> {user.assetCount}</p>
                  </div>
                </div>
                <div style={{ marginTop: '1.5rem' }}>
                  <button 
                    onClick={() => onSelectUser(user.id)}
                    className="submit-btn full-width"
                    style={{ justifyContent: 'center', padding: '0.6rem' }}
                  >
                    <Eye size={16} /> View Assets
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <p>No users found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
