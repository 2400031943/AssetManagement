import React, { useState, useEffect, useRef } from 'react';
import { Save, Sparkles, Database, Loader2, ServerCrash, CheckCircle2, Search, X } from 'lucide-react';
import { getAssetRecommendations, searchAssetRecommendations } from '../api';
import '../pages/Dashboard.css';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: map a COINS recommendation → form field values
// ─────────────────────────────────────────────────────────────────────────────
function recommendationToForm(rec) {
  return {
    ...EMPTY_FORM,
    serialNumber:  rec.serialNumber  || '',
    configuration: rec.configuration || '',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Recommendation Card — shows ASSETNO, EQSRLNO, EQPTDESCP
// ─────────────────────────────────────────────────────────────────────────────
function RecommendationCard({ rec, isSelected, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(rec)}
      style={{
        width: '100%',
        textAlign: 'left',
        background: isSelected
          ? 'linear-gradient(135deg, rgba(108,99,255,0.18), rgba(108,99,255,0.08))'
          : 'rgba(255,255,255,0.03)',
        border: isSelected
          ? '2px solid var(--accent-primary, #6c63ff)'
          : '1.5px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '1rem 1.1rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        marginBottom: '0.75rem',
      }}
    >
      {/* Header row: COINS badge + checkmark */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <span style={{
          fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em',
          background: 'var(--accent-primary, #6c63ff)', color: '#fff',
          padding: '2px 8px', borderRadius: '20px',
        }}>COINS</span>
        {isSelected && <CheckCircle2 size={16} style={{ color: 'var(--accent-primary, #6c63ff)' }} />}
      </div>

      {/* ASSETNO */}
      {rec.assetNumber && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
          <strong>Asset No: </strong>
          <span style={{ fontFamily: 'monospace' }}>{rec.assetNumber}</span>
        </div>
      )}

      {/* EQSRLNO */}
      <div style={{ fontSize: '0.92rem', fontWeight: 600, marginBottom: '0.4rem' }}>
        <strong style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.8rem' }}>Serial No: </strong>
        <span style={{ fontFamily: 'monospace' }}>{rec.serialNumber || '—'}</span>
      </div>

      {/* EQPTDESCP */}
      {rec.configuration && (
        <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary, #a0aec0)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          <strong style={{ color: 'var(--text-muted)' }}>EQPTDESCP: </strong>
          {rec.configuration}
        </div>
      )}

      {/* CTA */}
      <div style={{ marginTop: '0.65rem', fontSize: '0.8rem', color: 'var(--accent-primary, #6c63ff)', fontWeight: 600 }}>
        {isSelected ? '✓ Selected — Serial No. & Configuration pre-filled' : 'Click to pre-fill Serial No. & Configuration →'}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main AddAsset component
// ─────────────────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  assetNumber: '',
  serialNumber: '',
  make: '', makeOther: '',
  model: '', modelOther: '',
  configuration: '',
  networkDomain: '', networkDomainOther: '',
  ipAddress: '',
  acmsFms: '',
  fmsExpiryDate: '',
  Monitor: '', MonitorCustom: '',
  AssetCustodianECNO: '',
  UserDivision: '', UserDivisionOther: '',
  GROUP: '', GROUPOther: '',
  AREA: '', AREAOther: '',
  CATEGORY: '', CATEGORYOther: '',
  LOCATION: '', LOCATIONOther: '',
};

export default function AddAsset({ onAddAsset, onSuccess }) {
  const [formData, setFormData]           = useState(EMPTY_FORM);
  const [status, setStatus]               = useState({ type: null, message: '' });
  const [saved, setSaved]                 = useState(false);  // controls success overlay

  // ── My recommendations (emp_code filtered) ───────────────────────────
  const [myRecs, setMyRecs]               = useState([]);
  const [recLoading, setRecLoading]       = useState(true);
  const [recError, setRecError]           = useState(false);

  // ── Search state ───────────────────────────────────────────────
  const [searchQ, setSearchQ]             = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]         = useState(false);
  const searchTimer                       = useRef(null);

  // Derived: what cards to show
  const recommendations = searchQ.trim() ? searchResults : myRecs;

  // ── Pagination ───────────────────────────────────────────────────────────
  const CARDS_PER_PAGE = 4;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 whenever the recommendation list changes
  useEffect(() => { setCurrentPage(1); }, [recommendations.length, searchQ]);

  const totalPages  = Math.ceil(recommendations.length / CARDS_PER_PAGE);
  const pagedRecs   = recommendations.slice(
    (currentPage - 1) * CARDS_PER_PAGE,
    currentPage * CARDS_PER_PAGE
  );

  const [selectedRecId, setSelectedRecId] = useState(null);

  // Fetch MY recommendations on mount
  useEffect(() => {
    setRecLoading(true);
    setRecError(false);
    getAssetRecommendations()
      .then(data => setMyRecs(Array.isArray(data) ? data : []))
      .catch(() => setRecError(true))
      .finally(() => setRecLoading(false));
  }, []);

  // Debounced search — fires 400ms after user stops typing
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!searchQ.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const data = await searchAssetRecommendations(searchQ.trim());
        setSearchResults(Array.isArray(data) ? data : []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [searchQ]);

  // ── Form handlers ──────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Auto-clear IP when Not in any Network is selected
      ...(name === 'networkDomain' && value === 'Not in any Network' ? { ipAddress: '' } : {}),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: 'loading', message: 'Saving asset...' });

    const payload = {
      ...formData,
      make:          formData.make          === 'Others' ? formData.makeOther          : formData.make,
      model:         formData.model         === 'Others' ? formData.modelOther         : formData.model,
      networkDomain: formData.networkDomain === 'Others' ? formData.networkDomainOther : formData.networkDomain,
      Monitor:       formData.Monitor       === 'Custom' ? formData.MonitorCustom      : formData.Monitor,
      UserDivision:  formData.UserDivision  === 'Others' ? formData.UserDivisionOther  : formData.UserDivision,
      GROUP:         formData.GROUP         === 'Others' ? formData.GROUPOther         : formData.GROUP,
      AREA:          formData.AREA          === 'Others' ? formData.AREAOther          : formData.AREA,
      CATEGORY:      formData.CATEGORY      === 'Others' ? formData.CATEGORYOther      : formData.CATEGORY,
      LOCATION:      formData.LOCATION      === 'Others' ? formData.LOCATIONOther      : formData.LOCATION,
      fmsExpiryDate: formData.acmsFms === 'FMS' ? formData.fmsExpiryDate : '',
    };

    try {
      await onAddAsset(payload);
      setFormData(EMPTY_FORM);
      setSelectedRecId(null);
      setSearchQ('');
      setSearchResults([]);
      setSaved(true);   // show success overlay
      setTimeout(() => {
        setSaved(false);
        if (onSuccess) onSuccess();  // switch to My ACMS Systems List
      }, 2500);
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Failed to save asset. Please try again.' });
    }
  };

  // ── Card click handler ────────────────────────────────────────────────────
  const handleCardClick = (rec) => {
    if (selectedRecId === rec.id) {
      setSelectedRecId(null);
      setFormData(prev => ({ ...prev, serialNumber: '', configuration: '' }));
    } else {
      setSelectedRecId(rec.id);
      setFormData(recommendationToForm(rec));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="add-asset-container animate-fade-in">

      {/* ── SUCCESS OVERLAY ───────────────────────────────────────────────── */}
      {saved && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(10, 10, 30, 0.82)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.3s ease',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #0f2027, #1a3a2a)',
            border: '2px solid #22c55e',
            borderRadius: '20px',
            padding: '3rem 4rem',
            textAlign: 'center',
            boxShadow: '0 0 60px rgba(34,197,94,0.3)',
            maxWidth: '420px',
            width: '90%',
          }}>
            {/* Animated checkmark */}
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'rgba(34,197,94,0.15)',
              border: '3px solid #22c55e',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem',
              animation: 'pulse 1.5s ease infinite',
            }}>
              <CheckCircle2 size={40} style={{ color: '#22c55e' }} />
            </div>

            <h2 style={{ color: '#22c55e', fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Asset Saved Successfully!
            </h2>
            <p style={{ color: '#a0aec0', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              The asset has been added to <strong style={{ color: '#fff' }}>ACMS Systems Management</strong>.
            </p>
            <p style={{ color: '#718096', fontSize: '0.82rem' }}>
              Redirecting to My ACMS Systems List…
            </p>
          </div>
        </div>
      )}

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="section-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 className="section-title" style={{ marginBottom: '0.25rem' }}>Add System to ACMS List</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Select a recommendation from <strong>COINS</strong> to pre-fill Serial Number &amp; Configuration, then fill in the remaining fields.
          </p>
        </div>
      </div>

      {/* ── Recommendations Cards Panel ─────────────────────────────────────── */}
      <div className="rec-panel glass-panel" style={{ marginBottom: '2rem' }}>
        <div className="rec-panel-header">
          <div className="rec-panel-title">
            <Database size={18} className="rec-panel-db-icon" />
            <span>Recommendations from COINS</span>
            <span className="rec-panel-subtitle">ASSETNO · EQSRLNO · EQPTDESCP</span>
          </div>
          <Sparkles size={16} style={{ color: 'var(--accent-primary)', opacity: 0.7 }} />
        </div>

        {/* Loading */}
        {recLoading && (
          <div className="rec-loading">
            <Loader2 size={20} className="rec-spinner" />
            <span>Fetching your assets from COINS database…</span>
          </div>
        )}

        {/* Error */}
        {!recLoading && recError && (
          <div className="rec-error">
            <ServerCrash size={18} />
            <span>Could not reach the COINS database. You can still fill the form manually.</span>
          </div>
        )}

        {/* Empty — no MY assets found, but search still available */}
        {!recLoading && !recError && myRecs.length === 0 && !searchQ.trim() && (
          <div className="rec-empty">
            No assets found for your employee code in COINS.
            Use the search bar below to find an asset by serial number.
          </div>
        )}

        {/* Search bar + Cards — always visible once loaded */}
        {!recLoading && !recError && (
          <div style={{ padding: '0 1rem 1rem' }}>

            {/* ── Search bar ── */}
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <Search size={15} style={{
                position: 'absolute', left: '0.75rem', top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none',
              }} />
              <input
                type="text"
                value={searchQ}
                onChange={e => { setSearchQ(e.target.value); setSelectedRecId(null); }}
                placeholder="Search by Serial Number (EQSRLNO)…"
                className="login-input"
                style={{ paddingLeft: '2.2rem', paddingRight: '2.2rem', width: '100%' }}
              />
              {searchQ && (
                <button
                  type="button"
                  onClick={() => { setSearchQ(''); setSearchResults([]); setSelectedRecId(null); }}
                  style={{
                    position: 'absolute', right: '0.75rem', top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0,
                  }}
                ><X size={15} /></button>
              )}
            </div>

            {/* Label */}
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              {searchQ.trim()
                ? searching
                  ? 'Searching COINS…'
                  : `${recommendations.length} result(s) for "${searchQ}"`
                : 'Your assets from COINS — click a card to pre-fill the form.'}
            </p>

            {/* Searching spinner */}
            {searching && (
              <div className="rec-loading" style={{ padding: '0.5rem 0' }}>
                <Loader2 size={16} className="rec-spinner" />
                <span>Searching COINS…</span>
              </div>
            )}

            {/* No search results */}
            {!searching && searchQ.trim() && recommendations.length === 0 && (
              <div className="rec-empty">No assets found matching "{searchQ}" in COINS.</div>
            )}

            {/* Cards — paginated */}
            {!searching && pagedRecs.map(rec => (
              <RecommendationCard
                key={rec.id}
                rec={rec}
                isSelected={selectedRecId === rec.id}
                onClick={handleCardClick}
              />
            ))}

            {/* Pagination controls */}
            {!searching && totalPages > 1 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginTop: '0.75rem', padding: '0.6rem 0.2rem',
                borderTop: '1px solid rgba(255,255,255,0.08)',
              }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                    background: currentPage === 1 ? 'rgba(255,255,255,0.04)' : 'var(--accent-primary, #6c63ff)',
                    color: currentPage === 1 ? 'var(--text-muted)' : '#fff',
                    border: 'none', borderRadius: '8px',
                    padding: '0.45rem 1rem', cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s',
                    opacity: currentPage === 1 ? 0.45 : 1,
                  }}
                >
                  &#8592; Prev
                </button>

                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Page <strong style={{ color: 'var(--text-primary, #fff)' }}>{currentPage}</strong> of{' '}
                  <strong style={{ color: 'var(--text-primary, #fff)' }}>{totalPages}</strong>
                  <span style={{ marginLeft: '0.5rem', opacity: 0.6 }}>({recommendations.length} total)</span>
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                    background: currentPage === totalPages ? 'rgba(255,255,255,0.04)' : 'var(--accent-primary, #6c63ff)',
                    color: currentPage === totalPages ? 'var(--text-muted)' : '#fff',
                    border: 'none', borderRadius: '8px',
                    padding: '0.45rem 1rem', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s',
                    opacity: currentPage === totalPages ? 0.45 : 1,
                  }}
                >
                  Next &#8594;
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Status banner ─────────────────────────────────────────────────── */}
      {status.message && (
        <div className={`status-banner ${status.type}`} style={{ marginBottom: '1.5rem' }}>
          {status.message}
        </div>
      )}

      {/* ── Asset Form ────────────────────────────────────────────────────── */}
      <form className="asset-form glass-panel" onSubmit={handleSubmit}>

        <div className="form-grid">

          {/* CATEGORY */}
          <div className="form-group">
            <label>CATEGORY *</label>
            <select name="CATEGORY" value={formData.CATEGORY} onChange={handleChange} required className="login-input">
              <option value="">Select CATEGORY...</option>
              <option>SERVER TYPE 1</option>
              <option>SERVER TYPE 2</option>
              <option>PC TYPE 1</option>
              <option>PC TYPE 2</option>
              <option>PC TYPE 3</option>
              <option>PC TYPE 4</option>
              <option>STORAGE TYPE 2</option>
              <option>PRINTER TYPE 1</option>
              <option>PRINTER TYPE 2</option>
              <option>SP TYPE 1</option>
              <option>SP TYPE 2</option>
              <option value="Others">Others</option>
            </select>
          </div>
          {formData.CATEGORY === 'Others' && (
            <div className="form-group">
              <label>Specify CATEGORY *</label>
              <input type="text" name="CATEGORYOther" value={formData.CATEGORYOther} onChange={handleChange} required className="login-input" />
            </div>
          )}

          {/* Asset Number */}
          <div className="form-group">
            <label>Asset Number *</label>
            <input type="text" name="assetNumber" value={formData.assetNumber} onChange={handleChange} required className="login-input" placeholder="Enter Asset Number" />
          </div>

          {/* Serial Number */}
          <div className="form-group">
            <label>System Serial Number *</label>
            <input type="text" name="serialNumber" value={formData.serialNumber} onChange={handleChange} required className="login-input" />
          </div>

          {/* Make */}
          <div className="form-group">
            <label>Make *</label>
            <select name="make" value={formData.make} onChange={handleChange} required className="login-input">
              <option value="">Select Make...</option>
              <option>HP</option>
              <option>Dell</option>
              <option>Cisco</option>
              <option>Sony</option>
              <option>Toshiba</option>
              <option>Konika</option>
              <option>NetApp</option>
              <option>HPE</option>
              <option>NetASQ</option>
              <option>D-link</option>
              <option value="Others">Others</option>
            </select>
          </div>
          {formData.make === 'Others' && (
            <div className="form-group">
              <label>Specify Make *</label>
              <input type="text" name="makeOther" value={formData.makeOther} onChange={handleChange} required className="login-input" />
            </div>
          )}

          {/* Model */}
          <div className="form-group">
            <label>Model *</label>
            <select name="model" value={formData.model} onChange={handleChange} required className="login-input">
              <option value="">Select Model...</option>
              <option>Power edge R 730</option>
              <option>HP Compaq 8200 CM</option>
              <option>HP ProDesk 600 G1</option>
              <option value="Others">Others</option>
            </select>
          </div>
          {formData.model === 'Others' && (
            <div className="form-group">
              <label>Specify Model *</label>
              <input type="text" name="modelOther" value={formData.modelOther} onChange={handleChange} required className="login-input" />
            </div>
          )}

          {/* Network Domain */}
          <div className="form-group">
            <label>Network Domain</label>
            <select name="networkDomain" value={formData.networkDomain} onChange={handleChange} className="login-input">
              <option value="">Select Domain...</option>
              <option>Internet</option>
              <option>SpaceNet</option>
              <option>ASDMLAN</option>
              <option>RSAA Data</option>
              <option>Not in any Network</option>
              <option value="Others">Others</option>
            </select>
          </div>
          {formData.networkDomain === 'Others' && (
            <div className="form-group">
              <label>Specify Domain</label>
              <input type="text" name="networkDomainOther" value={formData.networkDomainOther} onChange={handleChange} className="login-input" />
            </div>
          )}

          {/* IP Address — hidden when Not in any Network */}
          {formData.networkDomain !== 'Not in any Network' && (
            <div className="form-group">
              <label>IP Address</label>
              <input type="text" name="ipAddress" value={formData.ipAddress} onChange={handleChange} className="login-input" placeholder="e.g. 192.168.1.1" />
            </div>
          )}

          {/* Brief Configuration */}
          <div className="form-group full-width">
            <label>Brief Configuration</label>
            <textarea
              name="configuration"
              value={formData.configuration}
              onChange={handleChange}
              className="login-input"
              rows="3"
              placeholder="Describe the asset configuration…"
            />
          </div>

          {/* Monitor */}
          <div className="form-group">
            <label>Monitor</label>
            <select name="Monitor" value={formData.Monitor} onChange={handleChange} className="login-input">
              <option value="">Select Monitor...</option>
              <option value="NIL">NIL</option>
              <option value="Custom">Custom</option>
            </select>
          </div>
          {formData.Monitor === 'Custom' && (
            <div className="form-group">
              <label>Monitor (custom)</label>
              <input type="text" name="MonitorCustom" value={formData.MonitorCustom} onChange={handleChange} className="login-input" />
            </div>
          )}

          {/* Asset Custodian ECNO */}
          <div className="form-group">
            <label>Asset Custodian ECNO *</label>
            <input type="text" name="AssetCustodianECNO" value={formData.AssetCustodianECNO} onChange={handleChange} required className="login-input" />
          </div>

          {/* User Division */}
          <div className="form-group">
            <label>User Division</label>
            <select name="UserDivision" value={formData.UserDivision} onChange={handleChange} className="login-input">
              <option value="">Select User Division...</option>
              <option>DPFD</option>
              <option>ASAG</option>
              <option>RSAA</option>
              <option>ASCID</option>
              <option value="Others">Others</option>
            </select>
          </div>
          {formData.UserDivision === 'Others' && (
            <div className="form-group">
              <label>Specify User Division</label>
              <input type="text" name="UserDivisionOther" value={formData.UserDivisionOther} onChange={handleChange} className="login-input" />
            </div>
          )}

          {/* GROUP */}
          <div className="form-group">
            <label>GROUP</label>
            <select name="GROUP" value={formData.GROUP} onChange={handleChange} className="login-input">
              <option value="">Select GROUP...</option>
              <option>SPFPG</option>
              <option>ASAG</option>
              <option>RSAA</option>
              <option value="Others">Others</option>
            </select>
          </div>
          {formData.GROUP === 'Others' && (
            <div className="form-group">
              <label>Specify GROUP</label>
              <input type="text" name="GROUPOther" value={formData.GROUPOther} onChange={handleChange} className="login-input" />
            </div>
          )}

          {/* AREA */}
          <div className="form-group">
            <label>AREA</label>
            <select name="AREA" value={formData.AREA} onChange={handleChange} className="login-input">
              <option value="">Select AREA...</option>
              <option>DPA</option>
              <option>RSA</option>
              <option value="Others">Others</option>
            </select>
          </div>
          {formData.AREA === 'Others' && (
            <div className="form-group">
              <label>Specify AREA</label>
              <input type="text" name="AREAOther" value={formData.AREAOther} onChange={handleChange} className="login-input" />
            </div>
          )}

          {/* LOCATION */}
          <div className="form-group">
            <label>LOCATION</label>
            <select name="LOCATION" value={formData.LOCATION} onChange={handleChange} className="login-input">
              <option value="">Select LOCATION...</option>
              <option value="Balanagar">Balanagar</option>
              <option value="ASAG">Shadnagar</option>
              <option value="RSAA">RSAA Datacentre Balanagar</option>
              <option value="Others">Others</option>
            </select>
          </div>
          {formData.LOCATION === 'Others' && (
            <div className="form-group">
              <label>Specify LOCATION</label>
              <input type="text" name="LOCATIONOther" value={formData.LOCATIONOther} onChange={handleChange} className="login-input" />
            </div>
          )}

          {/* ACMS / FMS */}
          <div className="form-group">
            <label>ACMS / FMS</label>
            <select name="acmsFms" value={formData.acmsFms} onChange={handleChange} className="login-input">
              <option value="">Select ACMS/FMS...</option>
              <option>ACMS</option>
              <option>FMS</option>
            </select>
          </div>
          {formData.acmsFms === 'FMS' && (
            <div className="form-group">
              <label>Date of Expiry *</label>
              <input
                type="date"
                name="fmsExpiryDate"
                value={formData.fmsExpiryDate}
                onChange={handleChange}
                required
                className="login-input"
              />
            </div>
          )}

        </div>{/* /form-grid */}

        <div className="form-actions">
          <button type="submit" className="submit-btn login-btn" disabled={status.type === 'loading'}>
            <Save size={18} />
            <span>{status.type === 'loading' ? 'Saving…' : 'Save to ACMS Systems Management'}</span>
          </button>
        </div>

      </form>
    </div>
  );
}
