import React, { useState, useEffect, useRef } from 'react';
import { Save, Sparkles, Database, Loader2, ServerCrash, CheckCircle2, Search, X, Pencil, LayoutDashboard } from 'lucide-react';
import { getAssetRecommendations, searchAssetRecommendations, getMyAssets } from '../api';
import '../pages/Dashboard.css';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: map a COINS recommendation → form field values
// ─────────────────────────────────────────────────────────────────────────────
function recommendationToForm(rec) {
  return {
    ...EMPTY_FORM,
    assetNumber:   rec.assetNumber   || '',
    serialNumber:  rec.serialNumber  || '',
    configuration: rec.configuration || '',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Recommendation Card — ASSETNO + EQSRLNO side-by-side, EQPTDESCP collapsible
// ─────────────────────────────────────────────────────────────────────────────
const DESC_LIMIT = 120;

function RecommendationCard({ rec, isSelected, onClick }) {
  const [expanded, setExpanded] = React.useState(false);
  const desc        = rec.configuration || '';
  const isLong      = desc.length > DESC_LIMIT;
  const displayDesc = expanded || !isLong ? desc : desc.slice(0, DESC_LIMIT) + '…';

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
        padding: '0.75rem 1rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        marginBottom: '0.6rem',
      }}
    >
      {/* Header: COINS badge + checkmark */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{
          fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.05em',
          background: 'var(--accent-primary, #6c63ff)', color: '#fff',
          padding: '2px 8px', borderRadius: '20px',
        }}>COINS</span>
        {isSelected && <CheckCircle2 size={15} style={{ color: 'var(--accent-primary, #6c63ff)' }} />}
      </div>

      {/* Asset No + Serial No — side by side */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: desc ? '0.4rem' : 0 }}>
        {rec.assetNumber && (
          <div style={{ fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Asset No: </span>
            <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{rec.assetNumber}</span>
          </div>
        )}
        <div style={{ fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Serial No: </span>
          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{rec.serialNumber || '—'}</span>
        </div>
      </div>

      {/* EQPTDESCP — collapsible */}
      {desc && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #a0aec0)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--text-muted)' }}>EQPTDESCP: </strong>
          <span style={{ wordBreak: 'break-word' }}>{displayDesc}</span>
          {isLong && (
            <span
              onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
              style={{
                marginLeft: '0.3rem', color: 'var(--accent-primary, #6c63ff)',
                fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {expanded ? ' show less ▲' : ' show more ▼'}
            </span>
          )}
        </div>
      )}

      {/* CTA */}
      <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--accent-primary, #6c63ff)', fontWeight: 600 }}>
        {isSelected ? '✓ Selected — Asset No., Serial No. & Configuration pre-filled' : 'Click to pre-fill Asset No., Serial No. & Configuration →'}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Map an existing local asset back into form fields (for Edit mode)
// ─────────────────────────────────────────────────────────────────────────────
function assetToForm(asset) {
  return {
    ...EMPTY_FORM,
    assetNumber:        asset.assetNumber   || '',
    serialNumber:       asset.serialNumber  || '',
    make:               asset.make          || '',
    model:              asset.model         || '',
    configuration:      asset.configuration || '',
    networkDomain:      asset.networkDomain || '',
    ipAddress:          asset.ipAddress     || '',
    Monitor:            asset.Monitor       || '',
    AssetCustodianECNO: asset.AssetCustodianECNO || '',
    UserDivision:       asset.UserDivision  || '',
    GROUP:              asset.GROUP         || '',
    AREA:               asset.AREA          || '',
    CATEGORY:           asset.CATEGORY      || '',
    LOCATION:           asset.LOCATION      || '',
    acmsFms:            asset.acmsFms       || '',
    warranty:           asset.warranty      || 'No',
    warrantyExpiry:     asset.fmsExpiryDate || '',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ACMS List Card — shows existing asset with Edit button
// ─────────────────────────────────────────────────────────────────────────────
function AcmsCard({ asset, onEdit }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1.5px solid rgba(255,255,255,0.08)',
      borderRadius: '10px',
      padding: '0.7rem 1rem',
      marginBottom: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
    }}>
      {/* Asset info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
          {asset.assetNumber && (
            <span style={{ fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Asset No: </span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{asset.assetNumber}</span>
            </span>
          )}
          {asset.serialNumber && (
            <span style={{ fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Serial: </span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{asset.serialNumber}</span>
            </span>
          )}
        </div>
        {(asset.make || asset.model) && (
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
            {[asset.make, asset.model].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>

      {/* Edit button */}
      <button
        type="button"
        onClick={() => onEdit(asset)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.3rem',
          background: 'rgba(108,99,255,0.15)',
          border: '1px solid rgba(108,99,255,0.4)',
          borderRadius: '7px',
          padding: '0.35rem 0.75rem',
          color: 'var(--accent-primary, #6c63ff)',
          fontWeight: 600, fontSize: '0.8rem',
          cursor: 'pointer', transition: 'all 0.2s',
          flexShrink: 0,
        }}
      >
        <Pencil size={13} /> Edit
      </button>
    </div>
  );
}
const EMPTY_FORM = {
  assetNumber: '',
  serialNumber: '',
  make: '', makeOther: '',
  model: '', modelOther: '',
  configuration: '',
  networkDomain: '', networkDomainOther: '',
  ipAddress: '',
  acmsFms: '',
  warranty: 'No',
  warrantyExpiry: '',
  fmsExpiryDate: '',
  Monitor: '', MonitorCustom: '',
  AssetCustodianECNO: '',
  UserDivision: '', UserDivisionOther: '',
  GROUP: '', GROUPOther: '',
  AREA: '', AREAOther: '',
  CATEGORY: '', CATEGORYOther: '',
  LOCATION: '', LOCATIONOther: '',
};

export default function AddAsset({ onAddAsset, onUpdateAsset, onSuccess }) {
  const [formData, setFormData]           = useState(EMPTY_FORM);
  const [status, setStatus]               = useState({ type: null, message: '' });
  const [saved, setSaved]                 = useState(false);

  // ── Form mode: null = hidden | 'add' = new from COINS | 'edit' = editing existing
  const [formMode, setFormMode]           = useState(null);
  const [editingAsset, setEditingAsset]   = useState(null);
  const formRef                           = useRef(null);

  // ── COINS recommendations (remote DB)
  const [myRecs, setMyRecs]               = useState([]);
  const [recLoading, setRecLoading]       = useState(true);
  const [recError, setRecError]           = useState(false);

  // ── ACMS list (local DB — user's existing assets)
  const [acmsAssets, setAcmsAssets]       = useState([]);
  const [acmsLoading, setAcmsLoading]     = useState(true);

  // ── Search state
  const [searchQ, setSearchQ]             = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]         = useState(false);
  const searchTimer                       = useRef(null);

  // Derived: what COINS cards to show
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

  // Fetch MY COINS recommendations on mount
  useEffect(() => {
    setRecLoading(true);
    setRecError(false);
    getAssetRecommendations()
      .then(data => setMyRecs(Array.isArray(data) ? data : []))
      .catch(() => setRecError(true))
      .finally(() => setRecLoading(false));
  }, []);

  // Fetch user's existing ACMS assets on mount
  useEffect(() => {
    setAcmsLoading(true);
    getMyAssets()
      .then(data => setAcmsAssets(Array.isArray(data) ? data : []))
      .catch(() => setAcmsAssets([]))
      .finally(() => setAcmsLoading(false));
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
      // Auto-clear warranty expiry when warranty switches to No
      ...(name === 'warranty' && value === 'No' ? { warrantyExpiry: '', acmsFms: '' } : {}),
    }));
  };


  // ── Card click handler: COINS card → open form in Add mode
  const handleCardClick = (rec) => {
    if (selectedRecId === rec.id) {
      setSelectedRecId(null);
      setFormData(prev => ({ ...prev, assetNumber: '', serialNumber: '', configuration: '' }));
      setFormMode(null);
    } else {
      setSelectedRecId(rec.id);
      setFormData(recommendationToForm(rec));
      setFormMode('add');
      setEditingAsset(null);
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  };

  // ── Edit button click: ACMS card → open form in Edit mode
  const handleEditClick = (asset) => {
    setFormMode('edit');
    setEditingAsset(asset);
    setFormData(assetToForm(asset));
    setSelectedRecId(null);
    setStatus({ type: null, message: '' });
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  // ── Close form
  const handleFormClose = () => {
    setFormMode(null);
    setEditingAsset(null);
    setFormData(EMPTY_FORM);
    setSelectedRecId(null);
    setStatus({ type: null, message: '' });
  };

  // ── Form submit: Add (POST) or Edit (PUT)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: 'loading', message: formMode === 'edit' ? 'Updating asset…' : 'Saving asset…' });

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
      fmsExpiryDate: formData.warranty === 'Yes' ? formData.warrantyExpiry : '',
      acmsFms:       formData.acmsFms || '',
    };

    try {
      if (formMode === 'edit' && editingAsset) {
        // — UPDATE existing asset
        await onUpdateAsset(editingAsset.id, payload);
        // Refresh local ACMS list
        const refreshed = await getMyAssets();
        setAcmsAssets(Array.isArray(refreshed) ? refreshed : []);
        setStatus({ type: 'success', message: '✓ Asset updated successfully!' });
        setTimeout(() => {
          setStatus({ type: null, message: '' });
          setFormMode(null);
          setEditingAsset(null);
          setFormData(EMPTY_FORM);
        }, 2000);
      } else {
        // — ADD new asset
        await onAddAsset(payload);
        setFormData(EMPTY_FORM);
        setSelectedRecId(null);
        setSearchQ('');
        setSearchResults([]);
        setSaved(true);
        setTimeout(() => {
          setSaved(false);
          if (onSuccess) onSuccess();
        }, 2500);
      }
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Operation failed. Please try again.' });
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
              System successfully saved to Your ACMS list!
            </h2>
            <p style={{ color: '#a0aec0', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              The system has been added to your <strong style={{ color: '#fff' }}>ACMS Systems Management</strong> list.
            </p>
            <p style={{ color: '#718096', fontSize: '0.82rem' }}>
              Redirecting to My ACMS Systems List…
            </p>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="section-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 className="section-title" style={{ marginBottom: '0.25rem' }}>Add System to ACMS List</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Browse <strong>COINS</strong> or your <strong>Current ACMS List</strong> below. Click a card to open the form.
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
                : 'Your assets from COINS — click a card to open the Add form.'}
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
      </div>{/* /COINS panel */}

      {/* ── Recommendations from Current ACMS List ────────────────────── */}
      <div className="rec-panel glass-panel" style={{ marginBottom: '2rem' }}>
        <div className="rec-panel-header">
          <div className="rec-panel-title">
            <LayoutDashboard size={18} className="rec-panel-db-icon" />
            <span>Recommendations from 2026 ACMS List</span>
            <span className="rec-panel-subtitle">Sorted by Category</span>
          </div>
        </div>

        {acmsLoading && (
          <div className="rec-loading">
            <Loader2 size={20} className="rec-spinner" />
            <span>Loading your ACMS systems…</span>
          </div>
        )}

        {!acmsLoading && acmsAssets.length === 0 && (
          <div className="rec-empty">No assets in your ACMS list yet. Add one using the form below.</div>
        )}

        {!acmsLoading && acmsAssets.length > 0 && (() => {
          // Group by category, sorted alphabetically
          const groups = acmsAssets.reduce((acc, asset) => {
            const cat = asset.CATEGORY || asset.category || 'Uncategorized';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(asset);
            return acc;
          }, {});
          return (
            <div style={{ padding: '0 1rem 1rem' }}>
              {Object.entries(groups)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([cat, items]) => (
                  <div key={cat} style={{ marginBottom: '1rem' }}>
                    {/* Category header */}
                    <div style={{
                      fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em',
                      color: 'var(--accent-primary, #6c63ff)', textTransform: 'uppercase',
                      padding: '0.35rem 0', marginBottom: '0.5rem',
                      borderBottom: '1px solid rgba(108,99,255,0.2)',
                    }}>
                      {cat} &nbsp;<span style={{ opacity: 0.55, fontWeight: 500 }}>({items.length})</span>
                    </div>
                    {items.map(asset => (
                      <AcmsCard key={asset.id} asset={asset} onEdit={handleEditClick} />
                    ))}
                  </div>
                ))}
            </div>
          );
        })()}
      </div>{/* /ACMS panel */}

      {/* ── Form — appears only when formMode is set ────────────────────── */}
      {formMode && (
        <div ref={formRef}>
          {/* Form mode header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '1rem',
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                {formMode === 'edit'
                  ? `✏️ Edit Asset: ${editingAsset?.assetNumber || editingAsset?.serialNumber || 'Asset'}`
                  : '➕ Add New System'}
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {formMode === 'edit'
                  ? 'Update the fields below and click Update Asset.'
                  : 'Fields pre-filled from COINS. Complete remaining details.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleFormClose}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px', padding: '0.4rem 0.85rem',
                color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, fontSize: '0.83rem',
              }}
            >
              <X size={14} /> Close
            </button>
          </div>

          {/* Status banner inside form wrapper */}
          {status.message && (
            <div className={`status-banner ${status.type}`} style={{ marginBottom: '1.5rem' }}>
              {status.message}
            </div>
          )}

          {/* ── Asset Form ─────────────────────────────────────────── */}
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

          {/* System Under Warranty */}
          <div className="form-group">
            <label>System Under Warranty</label>
            <select name="warranty" value={formData.warranty} onChange={handleChange} className="login-input">
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>

          {/* Warranty Expiry Date — only if warranty = Yes */}
          {formData.warranty === 'Yes' && (
            <div className="form-group">
              <label>Warranty Expiry Date *</label>
              <input
                type="date"
                name="warrantyExpiry"
                value={formData.warrantyExpiry}
                onChange={handleChange}
                required
                className="login-input"
              />
            </div>
          )}

          {/* Select Category (ACMS/FMS) — options change based on warranty */}
          <div className="form-group">
            <label>Select Category</label>
            <select name="acmsFms" value={formData.acmsFms} onChange={handleChange} className="login-input">
              <option value="">Select Category...</option>
              {formData.warranty === 'Yes' ? (
                <>
                  <option value="System proposed for ACMS">System proposed for ACMS</option>
                  <option value="FMS Alone">FMS Alone</option>
                </>
              ) : (
                <>
                  <option value="ACMS">ACMS</option>
                  <option value="FMS Alone">FMS Alone</option>
                </>
              )}
            </select>
          </div>

        </div>{/* /form-grid */}

        <div className="form-actions">
            <button type="submit" className="submit-btn login-btn" disabled={status.type === 'loading'}>
              <Save size={18} />
              <span>{status.type === 'loading'
                ? (formMode === 'edit' ? 'Updating…' : 'Saving…')
                : (formMode === 'edit' ? 'Update Asset' : 'Save to ACMS Systems Management')}
              </span>
            </button>
        </div>

          </form>
        </div>
      )}{/* /formMode */}

    </div>
  );
}
