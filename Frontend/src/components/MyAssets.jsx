import React, { useState } from 'react';
import { Search, Filter, Monitor, FileText, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import '../pages/Dashboard.css';

export default function MyAssets({ assets, loading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          asset.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter ? asset.CATEGORY === categoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  const exportToExcel = () => {
    const exportData = filteredAssets.map(asset => ({
      'Asset Name':        asset.name,
      'Category':         asset.CATEGORY || '',
      'Serial Number':    asset.serialNumber,
      'Make':             asset.make,
      'Model':            asset.model,
      'IP Address':       asset.ipAddress || '',
      'Network Domain':   asset.networkDomain || '',
      'ACMS/FMS':         asset.acmsFms || '',
      'FMS Expiry Date':  asset.fmsExpiryDate || '',
      'Location':         asset.LOCATION || '',
      'Area':             asset.AREA || '',
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'My Assets');
    XLSX.writeFile(wb, 'my_assets.xlsx');
  };

  return (
    <div className="my-assets-container animate-fade-in">
      <div className="section-header">
        <h2 className="section-title">My Assets</h2>
        
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

          <button
            onClick={exportToExcel}
            className="submit-btn"
            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            title="Export to Excel"
          >
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading your assets from MSSQL database...</div>
      ) : (
        <div className="assets-grid">
          {filteredAssets.length > 0 ? (
            filteredAssets.map(asset => (
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
                  {asset.ipAddress && asset.ipAddress !== 'N/A' && (
                    <p><strong>IP:</strong> {asset.ipAddress}</p>
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
