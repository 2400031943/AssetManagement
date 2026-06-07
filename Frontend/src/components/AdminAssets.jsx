import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, ArrowLeft, Download, ChevronDown, ChevronUp, Columns, Check } from 'lucide-react';
import * as XLSX from 'xlsx';
import AssetDetailModal from './AssetDetailModal';
import '../pages/Dashboard.css';

const ALL_COLUMNS = [
  { key: 'assetNumber',  label: 'Asset Number' },
  { key: 'serialNumber', label: 'Serial Number' },
  { key: 'make',         label: 'Make' },
  { key: 'model',        label: 'Model' },
  { key: 'ipAddress',    label: 'IP Address' },
  { key: 'assignedTo',   label: 'Assigned To' },
  { key: 'location',     label: 'Location' },
  { key: 'acmsFms',      label: 'ACMS/FMS' },
];

export default function AdminAssets({ assets, loading, selectedUser, onClearUserSelection }) {
  const [searchTerm, setSearchTerm]           = useState('');
  const [categoryFilter, setCategoryFilter]   = useState('');
  const [selectedAsset, setSelectedAsset]     = useState(null);
  const [collapsed, setCollapsed]             = useState({});
  const [colPanelOpen, setColPanelOpen]       = useState(false);
  const [visibleCols, setVisibleCols]         = useState(
    Object.fromEntries(ALL_COLUMNS.map(c => [c.key, true]))
  );
  const colPanelRef = useRef(null);

  // Close panel on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (colPanelRef.current && !colPanelRef.current.contains(e.target)) {
        setColPanelOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleCol = (key) =>
    setVisibleCols(prev => ({ ...prev, [key]: !prev[key] }));

  const filteredAssets = assets.filter((asset) => {
    if (selectedUser && asset.assigned_to !== selectedUser.id) return false;
    const matchesSearch =
      (asset.assetNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.serialNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter
      ? (asset.CATEGORY === categoryFilter || asset.category === categoryFilter)
      : true;
    return matchesSearch && matchesCategory;
  });

  const grouped = filteredAssets.reduce((acc, asset) => {
    const cat = asset.CATEGORY || asset.category || 'Uncategorised';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(asset);
    return acc;
  }, {});

  const toggleCollapse = (cat) =>
    setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }));

  const exportToExcel = () => {
    const filename = selectedUser
      ? `assets_${(selectedUser.username || selectedUser.name || 'user').replace(' ', '_')}.xlsx`
      : 'all_assets.xlsx';
    const exportData = filteredAssets.map(asset => ({
      'Category':        asset.category || asset.CATEGORY || '',
      'Asset Number':    asset.assetNumber,
      'Serial Number':   asset.serialNumber,
      'Make':            asset.make,
      'Model':           asset.model,
      'Assigned To':     asset.assignedUserName || 'Unassigned',
      'IP Address':      asset.ipAddress || '',
      'ACMS/FMS':        asset.acmsFms || '',
      'FMS Expiry Date': asset.fmsExpiryDate || '',
      'Location':        asset.LOCATION || '',
      'Area':            asset.AREA || '',
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Assets');
    XLSX.writeFile(wb, filename);
  };

  const visibleCount = Object.values(visibleCols).filter(Boolean).length;

  return (
    <div className="admin-assets-container animate-fade-in">
      {/* ── Header ── */}
      <div className="section-header" style={{ marginBottom: selectedUser ? '1rem' : '2rem' }}>
        <h2 className="section-title">
          {selectedUser
            ? `Assets Assigned to ${selectedUser.username || selectedUser.name}`
            : 'All System Assets'}
        </h2>

        <div className="filters-container">
          {/* Search */}
          <div className="search-wrapper">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search by name or serial..."
              className="search-input login-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Category filter */}
          <div className="filter-wrapper">
            <Filter className="filter-icon" size={18} />
            <select
              className="filter-select login-input"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
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

          {/* ── Filter Fields dropdown ── */}
          <div className="col-filter-wrapper" ref={colPanelRef}>
            <button
              className={`col-filter-btn ${colPanelOpen ? 'active' : ''}`}
              onClick={() => setColPanelOpen(o => !o)}
              title="Show / hide columns"
            >
              <Columns size={16} />
              <span>Filter Fields</span>
              {visibleCount < ALL_COLUMNS.length && (
                <span className="col-filter-badge">{visibleCount}/{ALL_COLUMNS.length}</span>
              )}
              <ChevronDown size={14} className={`col-chevron ${colPanelOpen ? 'open' : ''}`} />
            </button>

            {colPanelOpen && (
              <div className="col-filter-panel glass-panel animate-fade-in">
                <p className="col-filter-title">Visible Columns</p>
                {ALL_COLUMNS.map(col => (
                  <label key={col.key} className="col-filter-item">
                    <span className={`col-checkbox ${visibleCols[col.key] ? 'checked' : ''}`}>
                      {visibleCols[col.key] && <Check size={11} strokeWidth={3} />}
                    </span>
                    <input
                      type="checkbox"
                      checked={visibleCols[col.key]}
                      onChange={() => toggleCol(col.key)}
                      style={{ display: 'none' }}
                    />
                    {col.label}
                  </label>
                ))}
                <div className="col-filter-actions">
                  <button className="col-action-btn" onClick={() =>
                    setVisibleCols(Object.fromEntries(ALL_COLUMNS.map(c => [c.key, true])))
                  }>Show All</button>
                  <button className="col-action-btn" onClick={() =>
                    setVisibleCols(Object.fromEntries(ALL_COLUMNS.map(c => [c.key, false])))
                  }>Hide All</button>
                </div>
              </div>
            )}
          </div>

          {/* Export */}
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

      {selectedUser && (
        <button
          onClick={onClearUserSelection}
          className="logout-btn"
          style={{ marginBottom: '1.5rem', border: 'none', padding: '0.5rem 0', color: 'var(--accent-primary)' }}
        >
          <ArrowLeft size={16} /> Back to All Users
        </button>
      )}

      {/* ── Body ── */}
      {loading ? (
        <div className="loading-state">Loading system assets...</div>
      ) : filteredAssets.length === 0 ? (
        <div className="empty-state"><p>No assets found matching your criteria.</p></div>
      ) : (
        <div className="category-table-wrapper">
          {Object.entries(grouped).map(([category, rows]) => (
            <div key={category} className="category-group glass-panel">
              <button className="category-group-header" onClick={() => toggleCollapse(category)}>
                <div className="category-group-title">
                  <span className="category-badge-pill">{category}</span>
                  <span className="category-count">{rows.length} asset{rows.length !== 1 ? 's' : ''}</span>
                </div>
                {collapsed[category] ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              </button>

              {!collapsed[category] && (
                <div className="category-table-scroll">
                  <table className="asset-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        {visibleCols.assetNumber  && <th>Asset Number</th>}
                        {visibleCols.serialNumber  && <th>Serial Number</th>}
                        {visibleCols.make          && <th>Make</th>}
                        {visibleCols.model         && <th>Model</th>}
                        {visibleCols.ipAddress     && <th>IP Address</th>}
                        {visibleCols.assignedTo    && <th>Assigned To</th>}
                        {visibleCols.location      && <th>Location</th>}
                        {visibleCols.acmsFms       && <th>ACMS/FMS</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((asset, idx) => (
                        <tr
                          key={asset.id}
                          className="asset-table-row"
                          onClick={() => setSelectedAsset(asset)}
                          title="Click to view full details"
                        >
                          <td className="row-index">{idx + 1}</td>
                          {visibleCols.assetNumber  && <td className="asset-name-cell">{asset.assetNumber}</td>}
                          {visibleCols.serialNumber  && <td>{asset.serialNumber}</td>}
                          {visibleCols.make          && <td>{asset.make}</td>}
                          {visibleCols.model         && <td>{asset.model}</td>}
                          {visibleCols.ipAddress     && <td>{asset.ipAddress || '—'}</td>}
                          {visibleCols.assignedTo    && (
                            <td>
                              <span style={{ color: asset.assignedUserName ? 'var(--text-main)' : 'var(--text-muted)', fontStyle: asset.assignedUserName ? 'normal' : 'italic' }}>
                                {asset.assignedUserName || 'Unassigned'}
                              </span>
                            </td>
                          )}
                          {visibleCols.location      && <td>{asset.LOCATION || asset.location || '—'}</td>}
                          {visibleCols.acmsFms       && (
                            <td>
                              <span className={`acms-badge ${(asset.acmsFms || '').toLowerCase()}`}>
                                {asset.acmsFms || '—'}
                              </span>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AssetDetailModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
    </div>
  );
}
