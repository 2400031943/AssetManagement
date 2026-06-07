import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, Download, ChevronDown, ChevronUp, Columns, Check, RefreshCw, AlertCircle, UserCheck } from 'lucide-react';
import * as XLSX from 'xlsx';
import AssetDetailModal from './AssetDetailModal';
import '../pages/Dashboard.css';

const ALL_COLUMNS = [
  { key: 'sourceTable',  label: 'Source' },
  { key: 'slNo',         label: 'SL No' },
  { key: 'acmsCode',     label: 'ACMS Code' },
  { key: 'assetNumber',  label: 'Asset Number_(Refer PIS Database)' },
  { key: 'category',     label: 'Category' },
  { key: 'assetNumber',   label: 'Asset Number' },
  { key: 'serialNumber', label: 'System Serial Number' },
  { key: 'make',         label: 'Make' },
  { key: 'model',        label: 'Model' },
  { key: 'configuration', label: 'Brief Configuration' },
  { key: 'networkDomain', label: 'Network Domain (Interent/Spacenet/NRSCVRF/DP etc)' },
  { key: 'ipAddress',    label: 'IP' },
  { key: 'monitor',      label: 'Monitor' },
  { key: 'assetCustodianEcno', label: 'Asset Custodian ECNO_(Refer PIS Database)' },
  { key: 'currentUserEcno', label: 'System-Current-User ECNO_(Refer Employee Directory)' },
  { key: 'userDivision', label: 'User-Division _(Refer Employee Directory)' },
  { key: 'group',        label: 'Group' },
  { key: 'area',         label: 'Area' },
  { key: 'location',     label: 'Location' },
  { key: 'acmsFms',      label: 'ACMS, FMS, FMS + ACMS' },
  { key: 'warrantyExpiryDate', label: 'Warranty  _Expiry Date' },
  { key: 'remarks',      label: 'Remarks' },
  { key: 'status',       label: 'Status' },
];

function getAssetValue(asset, key) {
  switch (key) {
    case 'assetNumber':
      return asset.assetNumber || asset.asset_number;
    case 'category':
      return asset.CATEGORY || asset.category;
    case 'serialNumber':
      return asset.serialNumber || asset.serial_number;
    case 'networkDomain':
      return asset.networkDomain || asset.network_domain;
    case 'monitor':
      return asset.Monitor || asset.monitor;
    case 'assetCustodianEcno':
      return asset.AssetCustodianECNO || asset.assetCustodianECNO || asset.asset_custodian_ecno;
    case 'currentUserEcno':
      return asset.SystemCurrentUserECNO || asset['System-Current-User ECNO_(Refer Employee Directory)'] || asset.current_user_ecno || asset.AssetCustodianECNO || asset.asset_custodian_ecno;
    case 'userDivision':
      return asset.UserDivision || asset.user_division;
    case 'group':
      return asset.GROUP || asset.group_name;
    case 'area':
      return asset.AREA || asset.area;
    case 'location':
      return asset.LOCATION || asset.location;
    case 'acmsFms':
      return asset.acmsFms || asset.acms_fms;
    case 'fmsExpiryDate':
      return asset.fmsExpiryDate || asset.fms_expiry_date;
    case 'warrantyExpiryDate':
      return asset.warrantyExpiryDate || asset.fmsExpiryDate || asset.fms_expiry_date;
    default:
      return asset[key];
  }
}

function formatAssetValue(asset, key) {
  const value = getAssetValue(asset, key);
  return value || value === 0 ? value : '-';
}

export default function MyAssets({ assets, loading, error, employeeCode, onRefresh }) {
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
    const matchesSearch =
      (asset.assetNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.serialNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (getAssetValue(asset, 'currentUserEcno') || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter
      ? (asset.CATEGORY || asset.category) === categoryFilter
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
    const exportData = filteredAssets.map(asset =>
      Object.fromEntries(ALL_COLUMNS.map(({ key, label }) => [label, formatAssetValue(asset, key)]))
    );
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'My Assets');
    XLSX.writeFile(wb, 'my_assets.xlsx');
  };

  const visibleCount = Object.values(visibleCols).filter(Boolean).length;

  return (
    <div className="my-assets-container animate-fade-in">
      {/* ── Header ── */}
      <div className="section-header">
        <div className="section-title-block">
          <h2 className="section-title">My ACMS Systems List</h2>
          {employeeCode && (
            <span className="section-ecno-tag">
              <UserCheck size={14} />
              Filtered by ECNO: <strong>{employeeCode.toUpperCase()}</strong>
            </span>
          )}
        </div>

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

          {/* Refresh */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="submit-btn"
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.08)' }}
              title="Refresh assets from database"
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'spin-icon' : ''} /> Refresh
            </button>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      {error ? (
        <div className="error-state glass-panel">
          <AlertCircle size={40} style={{ color: 'var(--accent-red, #f87171)', marginBottom: '0.75rem' }} />
          <p style={{ marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>{error}</p>
          {onRefresh && (
            <button className="submit-btn" onClick={onRefresh} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <RefreshCw size={16} /> Try Again
            </button>
          )}
        </div>
      ) : loading ? (
        <div className="loading-state">
          <RefreshCw size={32} className="spin-icon" style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
          <p>Loading assets for <strong>{employeeCode ? employeeCode.toUpperCase() : 'your account'}</strong>...</p>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="empty-state">
          <p>No assets found{employeeCode ? ` for ECNO <strong>${employeeCode.toUpperCase()}</strong>` : ''} matching your criteria.</p>
        </div>
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
                        {ALL_COLUMNS.map(col => (
                          visibleCols[col.key] && <th key={col.key}>{col.label}</th>
                        ))}
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
                          {ALL_COLUMNS.map(col => {
                            if (!visibleCols[col.key]) return null;
                            const value = formatAssetValue(asset, col.key);
                            if (col.key === 'acmsFms') {
                              return (
                                <td key={col.key}>
                                  <span className={`acms-badge ${(getAssetValue(asset, col.key) || '').toLowerCase()}`}>
                                    {value}
                                  </span>
                                </td>
                              );
                            }
                            return (
                              <td
                                key={col.key}
                                className={`${col.key === 'name' ? 'asset-name-cell' : ''} ${col.key === 'configuration' ? 'asset-config-cell' : ''}`}
                                title={value}
                              >
                                {value}
                              </td>
                            );
                          })}
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
