import React, { useState, useEffect, useRef } from 'react';
import { Save, Sparkles, Database, Loader2, ServerCrash, CheckCircle2, Search, X, Pencil, LayoutDashboard, ListChecks, Send, ChevronDown, Trash2, User } from 'lucide-react';
import { getAssetRecommendations, searchAssetRecommendations, getMyAssets, getMyAcms2027Assets, checkSerialInLists, requestAssetAdd, getDraftRequests, getPendingRequests, submitPendingRequests, getApprovers, getRegistrars, getDDs, predictCategory } from '../api';
import '../pages/Dashboard.css';

// ─────────────────────────────────────────────────────────────────────────────
// SearchablePersonSelect  — searchable dropdown for Approver / AFP / DD
// Props: label, list [{ecno, name, designation}], selected, setter, stopPropOnClick
// ─────────────────────────────────────────────────────────────────────────────
function SearchablePersonSelect({ label, list, selected, setter, stopPropOnClick = false }) {
  const [open, setOpen]     = React.useState(false);
  const [query, setQuery]   = React.useState('');
  const wrapRef             = React.useRef(null);
  const inputRef            = React.useRef(null);

  // Close on outside click
  React.useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus the search input whenever the dropdown opens
  React.useEffect(() => {
    if (open && inputRef.current) {
      // Small timeout ensures DOM is painted before focus
      setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 30);
    } else if (!open) {
      setQuery('');
    }
  }, [open]);

  // Search by name or EC no.
  const filtered = query.trim()
    ? list.filter(p =>
        (p.name || '').toLowerCase().includes(query.toLowerCase()) ||
        (p.ecno || '').toLowerCase().includes(query.toLowerCase())
      )
    : list;

  const handleSelect = (person) => {
    setter(person);
    setOpen(false);
    setQuery('');
  };

  const handleClear = (e) => {
    if (stopPropOnClick) e.stopPropagation();
    setter(null);
    setQuery('');
    setOpen(false);
  };

  const handleToggle = (e) => {
    if (stopPropOnClick) e.stopPropagation();
    setOpen(v => !v);
  };

  const baseBox = {
    width: '100%', padding: '0.42rem 2.2rem 0.42rem 0.7rem',
    background: 'rgba(15,12,40,0.75)', border: '1.5px solid rgba(99,102,241,0.35)',
    borderRadius: 7, color: '#e2e8f0', fontSize: '0.82rem', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    position: 'relative', userSelect: 'none', minHeight: '2rem',
    transition: 'border-color 0.2s',
    ...(open ? { borderColor: '#6c63ff' } : {}),
  };

  return (
    <div ref={wrapRef} style={{ marginBottom: '0.75rem', position: 'relative' }}>
      <label style={{ display: 'block', fontSize: '0.73rem', color: 'var(--text-muted)', marginBottom: '0.28rem', fontWeight: 600, letterSpacing: '0.04em' }}>
        {label}
      </label>

      {/* Trigger button */}
      <div style={baseBox} onClick={handleToggle}>
        {selected ? (
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
            <span style={{ fontWeight: 700, color: '#c4b5fd' }}>{selected.ecno}</span>
            <span style={{ color: '#f1f5f9', marginLeft: 4 }}>{selected.name}</span>
            {selected.designation && <span style={{ color: '#94a3b8', fontSize: '0.72rem', marginLeft: 4 }}> · {selected.designation}</span>}
          </span>
        ) : (
          <span style={{ color: 'rgba(226,232,240,0.45)', fontSize: '0.8rem' }}>-- Select {label} --</span>
        )}
        <span style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 2 }}>
          {selected && (
            <span onClick={handleClear} title="Clear" style={{ cursor: 'pointer', color: '#94a3b8', fontSize: '0.75rem', padding: '0 2px' }}>✕</span>
          )}
          <ChevronDown size={13} style={{ color: '#94a3b8', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </span>
      </div>

      {/* Dropdown panel */}
      {open && (
        <div
          onClick={stopPropOnClick ? e => e.stopPropagation() : undefined}
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 9999,
            background: '#1e1b2e', border: '1.5px solid rgba(108,99,255,0.4)',
            borderRadius: 9, boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
            maxHeight: 260, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}
        >
          {/* Search input */}
          <div style={{ padding: '0.5rem 0.65rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Search size={13} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onClick={stopPropOnClick ? e => e.stopPropagation() : undefined}
              onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } }}
              placeholder="Search by name or EC No…"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#e2e8f0', fontSize: '0.8rem',
              }}
            />
            {query && <span onClick={e => { if(stopPropOnClick) e.stopPropagation(); setQuery(''); }} style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>✕</span>}
          </div>

          {/* Options list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {list.length === 0 && (
              <div style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
                No personnel available (remote DB may be offline)
              </div>
            )}
            {filtered.length === 0 && list.length > 0 && (
              <div style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
                No matches for "{query}"
              </div>
            )}
            {filtered.map(p => (
              <div
                key={p.ecno}
                onClick={e => { if (stopPropOnClick) e.stopPropagation(); handleSelect(p); }}
                style={{
                  padding: '0.55rem 0.85rem', cursor: 'pointer', fontSize: '0.8rem',
                  background: selected?.ecno === p.ecno ? 'rgba(108,99,255,0.18)' : 'transparent',
                  borderLeft: selected?.ecno === p.ecno ? '3px solid var(--accent-primary, #6c63ff)' : '3px solid transparent',
                  transition: 'background 0.15s',
                  display: 'flex', flexDirection: 'column', gap: 2,
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                onMouseLeave={e => e.currentTarget.style.background = selected?.ecno === p.ecno ? 'rgba(108,99,255,0.18)' : 'transparent'}
              >
                {/* Row 1: EC No. + Name */}
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#a5b4fc', fontSize: '0.78rem', flexShrink: 0 }}>{p.ecno}</span>
                  <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{p.name}</span>
                </span>
                {/* Row 2: Designation */}
                {p.designation && (
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.48)', paddingLeft: 2 }}>{p.designation}</span>
                )}
                {/* Row 3: Group · Division · Section */}
                {(p.groupName || p.divisionName || p.sectionName) && (
                  <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.32)', paddingLeft: 2, display: 'flex', flexWrap: 'wrap', gap: '0 6px' }}>
                    {p.groupName    && <span>Grp: {p.groupName}</span>}
                    {p.divisionName && <span>Div: {p.divisionName}</span>}
                    {p.sectionName  && <span>Sec: {p.sectionName}</span>}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Footer count */}
          {list.length > 0 && (
            <div style={{ padding: '0.3rem 0.85rem', borderTop: '1px solid rgba(255,255,255,0.07)', fontSize: '0.68rem', color: 'rgba(255,255,255,0.28)' }}>
              {filtered.length} of {list.length} shown
            </div>
          )}
        </div>
      )}

      {/* Selected person detail card */}
      {selected && (
        <div style={{
          marginTop: '0.5rem',
          background: 'rgba(15,12,40,0.85)',
          border: '1.5px solid rgba(108,99,255,0.45)',
          borderRadius: 8,
          padding: '0.65rem 0.85rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.3rem',
        }}>
          {/* Header row: check icon + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={13} style={{ color: '#a5b4fc', flexShrink: 0 }} />
            <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.88rem' }}>{selected.name}</span>
          </div>
          {/* Detail rows */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', rowGap: '0.18rem', columnGap: '0.7rem', paddingLeft: 19 }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>EC No.</span>
            <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: 700, color: '#c4b5fd' }}>{selected.ecno}</span>

            {selected.designation && <>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>Designation</span>
              <span style={{ fontSize: '0.78rem', color: '#e2e8f0' }}>{selected.designation}</span>
            </>}

            {selected.groupName && <>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>Group</span>
              <span style={{ fontSize: '0.78rem', color: '#e2e8f0' }}>{selected.groupName}</span>
            </>}

            {selected.divisionName && <>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>Division</span>
              <span style={{ fontSize: '0.78rem', color: '#e2e8f0' }}>{selected.divisionName}</span>
            </>}

            {selected.sectionName && <>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>Section</span>
              <span style={{ fontSize: '0.78rem', color: '#e2e8f0' }}>{selected.sectionName}</span>
            </>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: map a COINS recommendation → form field values
// ─────────────────────────────────────────────────────────────────────────────
function recommendationToForm(rec) {
  // Helper: detect if a value is a non-standard option requiring "Others"
  const isCustomMake     = (v) => v && !['HP','Dell','Cisco','Sony','Toshiba','Konika','NetApp','HPE','NetASQ','D-link'].includes(v);
  const isCustomModel    = (v) => v && !['Power edge R 730','HP Compaq 8200 CM','HP ProDesk 600 G1'].includes(v);
  const isCustomDomain   = (v) => v && !['Internet','SpaceNet','ASDMLAN','RSAA Data','Not in any Network'].includes(v);
  const isCustomCategory = (v) => v && !['SERVER TYPE 1','SERVER TYPE 2','PC TYPE 1','PC TYPE 2','PC TYPE 3','PC TYPE 4','STORAGE TYPE 2','PRINTER TYPE 1','PRINTER TYPE 2','SP TYPE 1','SP TYPE 2'].includes(v);
  const isCustomDiv      = (v) => v && !['ITID','DPFD','ASAG','RSAA','ASCID'].includes(v);
  const isCustomGroup    = (v) => v && !['SISG','SPFPG','ASAG','RSAA'].includes(v);
  const isCustomArea     = (v) => v && !['DPA','RSA'].includes(v);
  const isCustomLoc      = (v) => v && !['Balanagar','ASAG','RSAA'].includes(v);

  const makeVal     = rec.make      || '';
  const modelVal    = rec.model     || '';
  const domainVal   = rec.networkDomain || '';
  const catVal      = rec.CATEGORY  || '';
  const divVal      = rec.UserDivision || '';
  const groupVal    = rec.GROUP     || '';
  const areaVal     = rec.AREA      || '';
  const locVal      = rec.LOCATION  || '';
  const monitorVal  = rec.Monitor   || '';

  return {
    ...EMPTY_FORM,
    assetNumber:        rec.assetNumber        || '',
    serialNumber:       rec.serialNumber       || '',
    configuration:      rec.configuration      || '',
    AssetCustodianECNO: rec.AssetCustodianECNO || rec.asset_custodian_ecno || '',
    // Make
    make:               isCustomMake(makeVal)      ? 'Others'  : makeVal,
    makeOther:          isCustomMake(makeVal)      ? makeVal   : '',
    // Model
    model:              isCustomModel(modelVal)    ? 'Others'  : modelVal,
    modelOther:         isCustomModel(modelVal)    ? modelVal  : '',
    // Network Domain
    networkDomain:      isCustomDomain(domainVal)  ? 'Others'  : domainVal,
    networkDomainOther: isCustomDomain(domainVal)  ? domainVal : '',
    ipAddress:          rec.ipAddress     || '',
    // Category
    CATEGORY:           isCustomCategory(catVal)   ? 'Others'  : catVal,
    CATEGORYOther:      isCustomCategory(catVal)   ? catVal    : '',
    // Monitor
    Monitor:            monitorVal && monitorVal !== 'NIL' && monitorVal !== 'Custom' ? 'Custom' : (monitorVal || ''),
    MonitorCustom:      monitorVal && monitorVal !== 'NIL' ? monitorVal : '',
    // Org fields
    UserDivision:       isCustomDiv(divVal)        ? 'Others'  : divVal,
    UserDivisionOther:  isCustomDiv(divVal)        ? divVal    : '',
    GROUP:              isCustomGroup(groupVal)     ? 'Others'  : groupVal,
    GROUPOther:         isCustomGroup(groupVal)     ? groupVal  : '',
    AREA:               isCustomArea(areaVal)       ? 'Others'  : areaVal,
    AREAOther:          isCustomArea(areaVal)       ? areaVal   : '',
    LOCATION:           isCustomLoc(locVal)         ? 'Others'  : locVal,
    LOCATIONOther:      isCustomLoc(locVal)         ? locVal    : '',
    // Compliance
    warranty:           rec.warranty      || 'No',
    warrantyExpiry:     rec.fmsExpiryDate || rec.warrantyExpiryDate || '',
    acmsFms:            rec.acmsFms       || '',
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// Recommendation Card — ASSETNO + EQSRLNO side-by-side, EQPTDESCP collapsible
// Three action buttons in top-right corner:
//   1. Check 2026 List  2. Check 2027 List  3. Request to Add (placeholder)
// ─────────────────────────────────────────────────────────────────────────────
const DESC_LIMIT = 120;

// Status values for each check button: null | 'loading' | true | false | 'error' | 'no-serial'
function ListCheckBtn({ label, year, color, serialNumber }) {
  const [status,  setStatus]  = React.useState(null);
  const [tooltip, setTooltip] = React.useState(false);

  const handleClick = async (e) => {
    e.stopPropagation();
    if (status === 'loading') return;
    if (!serialNumber) { setStatus('no-serial'); return; }
    setStatus('loading');
    try {
      const res = await checkSerialInLists(serialNumber);
      const val = year === 2026 ? res.in_2026 : res.in_2027;
      setStatus(val === null ? 'error' : val);
    } catch {
      setStatus('error');
    }
  };

  // Style varies by status
  let bg, textColor, border, btnLabel;
  if (status === null) {
    bg = 'rgba(255,255,255,0.06)'; textColor = color; border = `1px solid ${color}40`;
    btnLabel = label;
  } else if (status === 'loading') {
    bg = 'rgba(255,255,255,0.05)'; textColor = color; border = `1px solid ${color}40`;
    btnLabel = 'Checking…';
  } else if (status === true) {
    bg = 'rgba(34,197,94,0.15)'; textColor = '#16a34a'; border = '1.5px solid rgba(34,197,94,0.5)';
    btnLabel = year === 2027 ? '✓ In ACMS_list_2027' : `✓ In ${year} List`;
  } else if (status === false) {
    bg = 'rgba(239,68,68,0.12)'; textColor = '#dc2626'; border = '1.5px solid rgba(239,68,68,0.4)';
    btnLabel = year === 2027 ? '✗ Not in 2027 List' : `✗ Not in ${year}`;
  } else if (status === 'no-serial') {
    bg = 'rgba(251,191,36,0.1)'; textColor = '#d97706'; border = '1px solid rgba(251,191,36,0.3)';
    btnLabel = 'No Serial No.';
  } else {
    bg = 'rgba(251,191,36,0.1)'; textColor = '#d97706'; border = '1px solid rgba(251,191,36,0.3)';
    btnLabel = 'Unavailable';
  }

  const titleText = year === 2027
    ? `Check if serial number "${serialNumber || '—'}" exists in ACMS_list_2027 (local DB)`
    : `Check if serial number "${serialNumber || '—'}" is in the ${year} ACMS list`;

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setTooltip(true)}
        onMouseLeave={() => setTooltip(false)}
        title={titleText}
        style={{
          background: bg, color: textColor, border, borderRadius: '6px',
          padding: '3px 9px', fontSize: '0.68rem', fontWeight: 700,
          cursor: status === 'loading' ? 'wait' : 'pointer',
          transition: 'all 0.2s', whiteSpace: 'nowrap', letterSpacing: '0.02em',
          display: 'flex', alignItems: 'center', gap: '4px',
        }}
      >
        {status === 'loading' ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> : null}
        {btnLabel}
      </button>

      {/* Tooltip showing serial number */}
      {tooltip && status === null && serialNumber && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 5px)', left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15,12,40,0.97)', color: '#f1f5f9',
          border: '1px solid rgba(108,99,255,0.4)',
          borderRadius: 6, padding: '4px 8px',
          fontSize: '0.65rem', whiteSpace: 'nowrap',
          zIndex: 9999, pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          {year === 2027 ? 'Search in ACMS_list_2027' : `Search in ${year} list`}
          <br />
          <span style={{ color: '#a5b4fc', fontFamily: 'monospace' }}>SN: {serialNumber}</span>
        </div>
      )}

      {/* Result tooltip */}
      {tooltip && (status === true || status === false) && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 5px)', left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15,12,40,0.97)', color: '#f1f5f9',
          border: `1px solid ${status === true ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
          borderRadius: 6, padding: '4px 8px',
          fontSize: '0.65rem', whiteSpace: 'nowrap',
          zIndex: 9999, pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          <span style={{ fontFamily: 'monospace', color: '#a5b4fc' }}>{serialNumber}</span>
          <br />
          {status === true
            ? <span style={{ color: '#22c55e' }}>✓ Present in {year === 2027 ? 'ACMS_list_2027' : `${year} list`}</span>
            : <span style={{ color: '#f87171' }}>✗ Not found in {year === 2027 ? 'ACMS_list_2027' : `${year} list`}</span>
          }
        </div>
      )}
    </div>
  );
}

function RecommendationCard({ rec, isSelected, onClick }) {
  const [expanded, setExpanded]     = React.useState(false);

  const desc        = rec.configuration || '';
  const isLong      = desc.length > DESC_LIMIT;
  const displayDesc = expanded || !isLong ? desc : desc.slice(0, DESC_LIMIT) + '…';

  return (
    <div
      style={{
        width: '100%',
        background: isSelected
          ? 'linear-gradient(135deg, rgba(108,99,255,0.18), rgba(108,99,255,0.08))'
          : 'rgba(255,255,255,0.03)',
        border: isSelected
          ? '2px solid var(--accent-primary, #6c63ff)'
          : '1.5px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '0.75rem 1rem',
        transition: 'all 0.2s ease',
        marginBottom: '0.6rem',
      }}
    >
      {/* ── Top row: COINS badge + three action buttons ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        {/* Left: COINS badge + selected check */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{
            fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.05em',
            background: 'var(--accent-primary, #6c63ff)', color: '#fff',
            padding: '2px 8px', borderRadius: '20px',
          }}>COINS</span>
          {isSelected && <CheckCircle2 size={15} style={{ color: 'var(--accent-primary, #6c63ff)' }} />}
        </div>

        {/* Right: three action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          <ListCheckBtn label="2026 List?" year={2026} color="#60a5fa" serialNumber={rec.serialNumber} />
          <ListCheckBtn label="2027 List?" year={2027} color="#a78bfa" serialNumber={rec.serialNumber} />
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onClick(rec); }}
            style={{
              background: isSelected ? 'rgba(245,158,11,0.15)' : 'rgba(251,191,36,0.08)',
              color: '#f59e0b',
              border: `1px solid ${isSelected ? 'rgba(245,158,11,0.5)' : 'rgba(251,191,36,0.3)'}`,
              borderRadius: '6px', padding: '3px 9px',
              fontSize: '0.68rem', fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {isSelected ? '✕ Close Form' : 'add into your ACMS List'}
          </button>
        </div>
      </div>

      {/* Clickable body — pre-fills form */}
      <button
        type="button"
        onClick={() => onClick(rec)}
        style={{
          width: '100%', textAlign: 'left',
          background: 'none', border: 'none', padding: 0,
          cursor: 'pointer',
        }}
      >
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
          {isSelected ? '✓ Selected — All available fields pre-filled in the form below' : 'Click to open the full Add System form with all available fields pre-filled →'}
        </div>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Map an existing local asset back into form fields (for Edit mode)
// ─────────────────────────────────────────────────────────────────────────────
const STANDARD_MAKES = ['HP', 'Dell', 'Cisco', 'Sony', 'Toshiba', 'Konika', 'NetApp', 'HPE', 'NetASQ', 'D-link'];
const STANDARD_MODELS = ['Power edge R 730', 'HP Compaq 8200 CM', 'HP ProDesk 600 G1'];
const STANDARD_DOMAINS = ['Internet', 'SpaceNet', 'ASDMLAN', 'RSAA Data', 'Not in any Network'];
const STANDARD_CATEGORIES = ['SERVER TYPE 1', 'SERVER TYPE 2', 'PC TYPE 1', 'PC TYPE 2', 'PC TYPE 3', 'PC TYPE 4', 'STORAGE TYPE 2', 'PRINTER TYPE 1', 'PRINTER TYPE 2', 'SP TYPE 1', 'SP TYPE 2'];

function assetToForm(asset) {
  const makeVal = asset.make || '';
  const isCustomMake = makeVal !== '' && !STANDARD_MAKES.includes(makeVal);

  const modelVal = asset.model || '';
  const isCustomModel = modelVal !== '' && !STANDARD_MODELS.includes(modelVal);

  const domainVal = asset.networkDomain || '';
  const isCustomDomain = domainVal !== '' && !STANDARD_DOMAINS.includes(domainVal);

  const catVal = asset.CATEGORY || '';
  const isCustomCategory = catVal !== '' && !STANDARD_CATEGORIES.includes(catVal);

  return {
    ...EMPTY_FORM,
    assetNumber:        asset.assetNumber   || '',
    serialNumber:       asset.serialNumber  || '',
    make:               isCustomMake ? 'Others' : makeVal,
    makeOther:          isCustomMake ? makeVal : '',
    model:              isCustomModel ? 'Others' : modelVal,
    modelOther:         isCustomModel ? modelVal : '',
    configuration:      asset.configuration || '',
    networkDomain:      isCustomDomain ? 'Others' : domainVal,
    networkDomainOther: isCustomDomain ? domainVal : '',
    ipAddress:          asset.ipAddress     || '',
    Monitor:            asset.Monitor       || '',
    AssetCustodianECNO: asset.AssetCustodianECNO || '',
    UserDivision:       asset.UserDivision  || '',
    GROUP:              asset.GROUP         || '',
    AREA:               asset.AREA          || '',
    CATEGORY:           isCustomCategory ? 'Others' : catVal,
    CATEGORYOther:      isCustomCategory ? catVal : '',
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
  const [showDetails, setShowDetails] = React.useState(false);

  // Helper to render a field if it exists
  const DetailRow = ({ label, value }) => {
    if (!value || value === '—' || value === 'None' || value === 'null') return null;
    return (
      <div style={{ fontSize: '0.78rem', marginBottom: '0.3rem' }}>
        <strong style={{ color: 'var(--text-muted)' }}>{label}: </strong>
        <span style={{ color: 'var(--text-secondary, #a0aec0)' }}>{value}</span>
      </div>
    );
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1.5px solid rgba(255,255,255,0.08)',
      borderRadius: '10px',
      padding: '0.7rem 1rem',
      marginBottom: '0.5rem',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Top row: Asset Info + Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '1rem',
      }}>
        {/* Basic Asset info */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap', marginTop: '0.1rem' }}>
            {(asset.make || asset.model) && (
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                {[asset.make, asset.model].filter(Boolean).join(' · ')}
              </span>
            )}
            {asset.acmsFms && (
              <span style={{
                fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.04em',
                background: asset.acmsFms.includes('FMS') ? 'rgba(251,191,36,0.15)' : 'rgba(34,197,94,0.12)',
                color: asset.acmsFms.includes('FMS') ? '#f59e0b' : '#22c55e',
                padding: '1px 6px', borderRadius: '20px',
              }}>
                {asset.acmsFms}
              </span>
            )}
            {asset.status && (
              <span style={{
                fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)',
                border: '1px solid rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: '20px'
              }}>
                {asset.status}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
              padding: '0.35rem', transition: 'color 0.2s',
            }}
            title="Toggle Details"
          >
            {showDetails ? 'Hide Details ▲' : 'Show Details ▼'}
          </button>
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
            }}
          >
            <Pencil size={13} /> Add
          </button>
        </div>
      </div>

      {/* Expanded Details Section */}
      {showDetails && (
        <div style={{
          marginTop: '0.8rem', paddingTop: '0.8rem',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem'
        }}>
          <div>
            <DetailRow label="Network Domain" value={asset.networkDomain} />
            <DetailRow label="IP Address" value={asset.ipAddress} />
            <DetailRow label="Monitor" value={asset.Monitor || asset.monitor} />
            <DetailRow label="Custodian ECNO" value={asset.AssetCustodianECNO || asset.asset_custodian_ecno} />
          </div>
          <div>
            <DetailRow label="User Division" value={asset.UserDivision || asset.user_division} />
            <DetailRow label="Group" value={asset.GROUP || asset.group_name} />
            <DetailRow label="Area" value={asset.AREA || asset.area} />
            <DetailRow label="Location" value={asset.LOCATION || asset.location} />
          </div>
          <div>
            <DetailRow label="Warranty" value={asset.warranty} />
            {(asset.fmsExpiryDate || asset.warrantyExpiry) && (
              <DetailRow label="Expiry Date" value={asset.fmsExpiryDate || asset.warrantyExpiry} />
            )}
          </div>
          {asset.configuration && (
            <div style={{ gridColumn: '1 / -1', marginTop: '0.3rem' }}>
              <DetailRow label="Configuration" value={asset.configuration} />
            </div>
          )}
        </div>
      )}
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

export default function AddAsset({ onAddAsset, onUpdateAsset, onSuccess, activeTabMode, setActiveTab }) {
  const [formData, setFormData]           = useState(EMPTY_FORM);
  const [status, setStatus]               = useState({ type: null, message: '' });
  const [saved, setSaved]                 = useState(false);

  // ── Form mode: null = hidden | 'add' = new from COINS | 'edit' = editing existing
  const [formMode, setFormMode]           = useState(null);
  const [editingAsset, setEditingAsset]   = useState(null);
  const formRef                           = useRef(null);
  const [showCategoryGuide, setShowCategoryGuide] = useState(false);

  // ── ML Category Prediction
  const [predicting,   setPredicting]   = useState(false);
  const [prediction,   setPrediction]   = useState(null);  // { predicted, display, confidence, top3 }
  const [predError,    setPredError]    = useState(null);

  // ── COINS recommendations (remote DB)
  const [myRecs, setMyRecs]               = useState([]);
  const [recLoading, setRecLoading]       = useState(true);
  const [recError, setRecError]           = useState(false);

  // ── Draft requests (Ready to Send section)
  const [drafts, setDrafts]               = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [selectedDraftIds, setSelectedDraftIds] = useState(new Set());

  // ── Approval dropdowns
  const [approversList, setApproversList] = useState([]);
  const [registrarsList, setRegistrarsList] = useState([]);
  const [ddsList, setDdsList]             = useState([]);
  const [dropdownsLoading, setDropdownsLoading] = useState(false);
  const [selectedApprover, setSelectedApprover] = useState(null);
  const [selectedRegistrar, setSelectedRegistrar] = useState(null);
  const [selectedDD, setSelectedDD]       = useState(null);
  const [sendingForApproval, setSendingForApproval] = useState(false);
  const [sendResult, setSendResult]       = useState(null); // {success, message}

  const [acmsAssets, setAcmsAssets]       = useState([]);
  const [acmsLoading, setAcmsLoading]     = useState(true);

  // ── My ACMS List (from dbo.ACMS_list_2027)
  const [acms2027, setAcms2027]           = useState([]);
  const [acms2027Loading, setAcms2027Loading] = useState(true);

  // ── Pending requests (for exclusion filtering)
  const [pendingRequests, setPendingRequests] = useState([]);

  // ── Search state (COINS cards search bar)
  const [searchQ, setSearchQ]             = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]         = useState(false);
  const searchTimer                       = useRef(null);

  // ── Serial-number → Asset-number lookup (Add System form only)
  const [snLookupQ,       setSnLookupQ]       = useState('');
  const [snLookupResults, setSnLookupResults] = useState([]);
  const [snLookupLoading, setSnLookupLoading] = useState(false);
  const snLookupTimer                         = useRef(null);

  // ── Exclusion sets derived from drafts and pending requests
  // Items in drafts OR pending should not appear in 2026 ACMS Recommendations
  const draftAndPendingSerials = React.useMemo(() => {
    const all = [...drafts, ...pendingRequests];
    return new Set(
      all.map(r => (r.serialNumber || '').trim().toUpperCase()).filter(Boolean)
    );
  }, [drafts, pendingRequests]);

  const draftAndPendingAssets = React.useMemo(() => {
    const all = [...drafts, ...pendingRequests];
    return new Set(
      all.map(r => (r.assetNumber || '').trim().toUpperCase()).filter(Boolean)
    );
  }, [drafts, pendingRequests]);

  // Items in pending (submitted/in-review) should not appear in COINS Recommendations
  const pendingSerials = React.useMemo(() => new Set(
    pendingRequests.map(r => (r.serialNumber || '').trim().toUpperCase()).filter(Boolean)
  ), [pendingRequests]);

  const pendingAssets = React.useMemo(() => new Set(
    pendingRequests.map(r => (r.assetNumber || '').trim().toUpperCase()).filter(Boolean)
  ), [pendingRequests]);

  // Helper: is an item blocked from 2026 ACMS list (in drafts or pending)?
  const isInDraftOrPending = (item) => {
    const serial = (item.serialNumber || '').trim().toUpperCase();
    const asset  = (item.assetNumber  || '').trim().toUpperCase();
    return (serial && draftAndPendingSerials.has(serial)) ||
           (asset  && draftAndPendingAssets.has(asset));
  };

  // Helper: is an item blocked from COINS list (in pending approval)?
  const isInPending = (item) => {
    const serial = (item.serialNumber || '').trim().toUpperCase();
    const asset  = (item.assetNumber  || '').trim().toUpperCase();
    return (serial && pendingSerials.has(serial)) ||
           (asset  && pendingAssets.has(asset));
  };

  // Derived: what COINS cards to show — excluding items already in pending approval
  const baseRecs = searchQ.trim() ? searchResults : myRecs;
  const recommendations = baseRecs.filter(rec => !isInPending(rec));

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

  // Fetch user's existing ACMS assets on mount (dbo.assets)
  useEffect(() => {
    setAcmsLoading(true);
    getMyAssets()
      .then(data => setAcmsAssets(Array.isArray(data) ? data : []))
      .catch(() => setAcmsAssets([]))
      .finally(() => setAcmsLoading(false));
  }, []);

  // Fetch My ACMS List from dbo.ACMS_list_2027 on mount
  useEffect(() => {
    setAcms2027Loading(true);
    getMyAcms2027Assets()
      .then(data => setAcms2027(Array.isArray(data) ? data : []))
      .catch(() => setAcms2027([]))
      .finally(() => setAcms2027Loading(false));
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

  // Debounced serial-number → asset-number lookup (TBST_ASSETS EQSRLNO → ASSETNO)
  useEffect(() => {
    if (snLookupTimer.current) clearTimeout(snLookupTimer.current);
    if (!snLookupQ.trim()) { setSnLookupResults([]); setSnLookupLoading(false); return; }
    setSnLookupLoading(true);
    snLookupTimer.current = setTimeout(async () => {
      try {
        const data = await searchAssetRecommendations(snLookupQ.trim());
        setSnLookupResults(Array.isArray(data) ? data.filter(r => r.assetNumber) : []);
      } catch {
        setSnLookupResults([]);
      } finally {
        setSnLookupLoading(false);
      }
    }, 400);
    return () => clearTimeout(snLookupTimer.current);
  }, [snLookupQ]);

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

  const handleEditClick = (asset) => {
    setFormMode('edit');
    setEditingAsset(asset);
    setFormData(assetToForm(asset));
    setSelectedRecId(null);
    setStatus({ type: null, message: '' });
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  // ── COINS card → "+ Request Add" → save draft then immediately submit with selected approvers
  const handleCoinsRequestAdd = async (rec, approver, registrar, dd) => {
    // Step 1: save as Draft
    const draftRes = await requestAssetAdd({
      assetNumber:        rec.assetNumber   || '',
      serialNumber:       rec.serialNumber  || '',
      configuration:      rec.configuration || '',
      assetCustodianEcno: rec.asset_custodian_ecno || rec.AssetCustodianECNO || '',
      category: '', make: '', model: '', networkDomain: '',
      ipAddress: '', monitor: '', userDivision: '',
      group: '', area: '', location: '', acmsFms: '', warranty: 'No',
    });
    const draftId = draftRes?.id;
    if (!draftId) throw new Error('Failed to create draft.');

    // Step 2: immediately submit with approver/registrar/dd selected
    await submitPendingRequests({
      draftIds:             [draftId],
      approverEcno:         approver.ecno,
      approverName:         approver.name,
      approverDesignation:  approver.designation,
      registrarEcno:        registrar.ecno,
      registrarName:        registrar.name,
      registrarDesignation: registrar.designation,
      ddEcno:               dd.ecno,
      ddName:               dd.name,
      ddDesignation:        dd.designation,
    });
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
  // ── Fetch drafts
  const fetchDrafts = () => {
    setDraftsLoading(true);
    getDraftRequests()
      .then(data => setDrafts(Array.isArray(data) ? data : []))
      .catch(() => setDrafts([]))
      .finally(() => setDraftsLoading(false));
  };

  const fetchPending = () => {
    getPendingRequests()
      .then(data => setPendingRequests(Array.isArray(data) ? data : []))
      .catch(() => setPendingRequests([]));
  };

  // ── Load dropdowns once (on mount)
  useEffect(() => {
    setDropdownsLoading(true);
    Promise.all([getApprovers(), getRegistrars(), getDDs()])
      .then(([a, r, d]) => {
        setApproversList(Array.isArray(a) ? a : []);
        setRegistrarsList(Array.isArray(r) ? r : []);
        setDdsList(Array.isArray(d) ? d : []);
      })
      .catch(() => {})
      .finally(() => setDropdownsLoading(false));
  }, []);

  useEffect(() => { fetchDrafts(); }, []);

  useEffect(() => { fetchPending(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: 'loading', message: 'Saving as draft…' });

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
      // Both 'add' and 'edit' modes: save as Draft -> goes through approval workflow
      const draftPayload = {
        assetNumber:        payload.assetNumber        || '',
        serialNumber:       payload.serialNumber       || '',
        category:           payload.CATEGORY           || '',
        make:               payload.make               || '',
        model:              payload.model              || '',
        configuration:      payload.configuration      || '',
        networkDomain:      payload.networkDomain      || '',
        ipAddress:          payload.ipAddress          || '',
        monitor:            payload.Monitor            || '',
        assetCustodianEcno: payload.AssetCustodianECNO || '',
        userDivision:       payload.UserDivision       || '',
        group:              payload.GROUP              || '',
        area:               payload.AREA               || '',
        location:           payload.LOCATION           || '',
        acmsFms:            payload.acmsFms            || '',
        warranty:           payload.warranty           || 'No',
        fmsExpiryDate:      payload.fmsExpiryDate      || '',
        sourceAssetId:      formMode === 'edit' && editingAsset ? editingAsset.id : null,
      };
      await requestAssetAdd(draftPayload);
      setFormData(EMPTY_FORM);
      setSelectedRecId(null);
      setSearchQ('');
      setSearchResults([]);
      setFormMode(null);
      setEditingAsset(null);
      const successMsg = formMode === 'edit'
        ? '✓ Saved as draft! Go to "Ready to Send" in the sidebar to select it and send for approval.'
        : '✓ Saved as draft! Click "Ready to Send" in the sidebar to send for approval.';
      setStatus({ type: 'success', message: successMsg });
      fetchDrafts();
      setTimeout(() => setStatus({ type: null, message: '' }), 7000);
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Operation failed. Please try again.' });
    }
  };

  // ── Toggle draft selection
  const toggleDraft = (id) => {
    setSelectedDraftIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Send selected drafts for approval
  const handleSendForApproval = async () => {
    if (!selectedApprover || !selectedRegistrar || !selectedDD) {
      alert('Please select Approver, Area Focal Point and DD before sending.');
      return;
    }
    if (selectedDraftIds.size === 0) {
      alert('Please select at least one request.');
      return;
    }
    setSendingForApproval(true);
    setSendResult(null);
    try {
      const res = await submitPendingRequests({
        draftIds:             Array.from(selectedDraftIds),
        approverEcno:         selectedApprover.ecno,
        approverName:         selectedApprover.name,
        approverDesignation:  selectedApprover.designation,
        registrarEcno:        selectedRegistrar.ecno,
        registrarName:        selectedRegistrar.name,
        registrarDesignation: selectedRegistrar.designation,
        ddEcno:               selectedDD.ecno,
        ddName:               selectedDD.name,
        ddDesignation:        selectedDD.designation,
      });
      setSendResult({ success: true, message: res.message || 'Sent for approval!' });
      setSelectedDraftIds(new Set());
      setSelectedApprover(null); setSelectedRegistrar(null); setSelectedDD(null);
      fetchDrafts();
      fetchPending(); // refresh exclusion sets
    } catch (err) {
      setSendResult({ success: false, message: err.message || 'Failed to send.' });
    } finally {
      setSendingForApproval(false);
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
          <h2 className="section-title" style={{ marginBottom: '0.25rem' }}>
            {activeTabMode === 'coins-recommendations' ? 'Add From Coins' : 'Add System to ACMS List'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            {activeTabMode === 'coins-recommendations'
              ? 'Browse recommendations from COINS. Click a card to pre-fill the Add Asset form.'
              : 'Browse your Recommendations from 2026 ACMS List or complete the form below.'}
          </p>
        </div>
      </div>

      {/* ── Recommendations Cards Panel ─────────────────────────────────────── */}
      {activeTabMode === 'coins-recommendations' && (
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
                      background: currentPage === 1 ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #6c63ff, #a855f7)',
                      color: currentPage === 1 ? 'rgba(255,255,255,0.35)' : '#fff',
                      border: '1.5px solid ' + (currentPage === 1 ? 'rgba(255,255,255,0.1)' : 'transparent'),
                      borderRadius: '8px',
                      padding: '0.45rem 1rem', cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s',
                      opacity: currentPage === 1 ? 0.45 : 1,
                    }}
                  >
                    &#8592; Prev
                  </button>

                  <span style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    Page
                    <strong style={{ color: '#a5b4fc', background: 'rgba(108,99,255,0.18)', borderRadius: 5, padding: '1px 8px', fontFamily: 'monospace' }}>{currentPage}</strong>
                    of
                    <strong style={{ color: '#a5b4fc' }}>{totalPages}</strong>
                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>· {recommendations.length} records</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.3rem',
                      background: currentPage === totalPages ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #6c63ff, #a855f7)',
                      color: currentPage === totalPages ? 'rgba(255,255,255,0.35)' : '#fff',
                      border: '1.5px solid ' + (currentPage === totalPages ? 'rgba(255,255,255,0.1)' : 'transparent'),
                      borderRadius: '8px',
                      padding: '0.45rem 1rem', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s',
                      opacity: currentPage === totalPages ? 0.5 : 1,
                    }}
                  >
                    Next &#8594;
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Recommendations from Current ACMS List ────────────────────── */}
      {activeTabMode === 'add-asset' && (
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
            // Exclude items already in drafts or pending approval
            const visibleAssets = acmsAssets.filter(asset => !isInDraftOrPending(asset));
            const hiddenCount   = acmsAssets.length - visibleAssets.length;

            if (visibleAssets.length === 0) {
              return (
                <div className="rec-empty" style={{ padding: '1rem' }}>
                  All systems are already in your drafts or pending approval.
                  {hiddenCount > 0 && (
                    <span style={{ display: 'block', marginTop: '0.3rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {hiddenCount} system{hiddenCount !== 1 ? 's' : ''} hidden — already submitted or in drafts.
                    </span>
                  )}
                </div>
              );
            }

            // Group by category, sorted alphabetically
            const groups = visibleAssets.reduce((acc, asset) => {
              const cat = asset.CATEGORY || asset.category || 'Uncategorized';
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(asset);
              return acc;
            }, {});
            return (
              <div style={{ padding: '0 1rem 1rem' }}>
                {hiddenCount > 0 && (
                  <div style={{
                    fontSize: '0.75rem', color: 'var(--text-muted)',
                    background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                    borderRadius: '8px', padding: '0.45rem 0.8rem', marginBottom: '0.75rem',
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                  }}>
                    ⚠️ {hiddenCount} system{hiddenCount !== 1 ? 's' : ''} hidden — already in drafts or pending approval.
                  </div>
                )}
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
        </div>
      )}

      {/* ── My ACMS List (from dbo.ACMS_list_2027) ──────────────────────── */}
      {activeTabMode === 'add-asset' && (
        <div className="rec-panel glass-panel" style={{ marginBottom: '2rem' }}>
          <div className="rec-panel-header">
            <div className="rec-panel-title">
              <ListChecks size={18} className="rec-panel-db-icon" />
              <span>My ACMS List</span>
              <span className="rec-panel-subtitle">From ACMS_list_2027 · Grouped by Category</span>
            </div>
            {!acms2027Loading && (
              <span style={{
                fontSize: '0.72rem', fontWeight: 700,
                background: 'rgba(108,99,255,0.15)',
                color: 'var(--accent-primary, #6c63ff)',
                padding: '2px 10px', borderRadius: '20px',
              }}>
                {acms2027.length} record{acms2027.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Loading */}
          {acms2027Loading && (
            <div className="rec-loading">
              <Loader2 size={20} className="rec-spinner" />
              <span>Loading from ACMS_list_2027…</span>
            </div>
          )}

          {/* Empty */}
          {!acms2027Loading && acms2027.length === 0 && (
            <div className="rec-empty">
              No records found in ACMS_list_2027 for your employee code.
            </div>
          )}

          {/* Records grouped by category */}
          {!acms2027Loading && acms2027.length > 0 && (() => {
            const groups = acms2027.reduce((acc, asset) => {
              const cat = asset.CATEGORY || 'Uncategorized';
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(asset);
              return acc;
            }, {});
            return (
              <div style={{ padding: '0 1rem 1rem' }}>
                {Object.entries(groups)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([cat, items]) => (
                    <div key={cat} style={{ marginBottom: '1.2rem' }}>
                      {/* Category header */}
                      <div style={{
                        fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em',
                        color: 'var(--accent-primary, #6c63ff)', textTransform: 'uppercase',
                        padding: '0.35rem 0', marginBottom: '0.5rem',
                        borderBottom: '1px solid rgba(108,99,255,0.2)',
                      }}>
                        {cat}&nbsp;<span style={{ opacity: 0.55, fontWeight: 500 }}>({items.length})</span>
                      </div>
                      {items.map(asset => (
                        <div key={asset.id} style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1.5px solid rgba(255,255,255,0.08)',
                          borderRadius: '10px',
                          padding: '0.65rem 1rem',
                          marginBottom: '0.45rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1.2rem',
                          flexWrap: 'wrap',
                        }}>
                          {/* Asset No */}
                          {asset.assetNumber && (
                            <span style={{ fontSize: '0.8rem' }}>
                              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Asset No: </span>
                              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{asset.assetNumber}</span>
                            </span>
                          )}
                          {/* Serial No */}
                          {asset.serialNumber && (
                            <span style={{ fontSize: '0.8rem' }}>
                              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Serial: </span>
                              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{asset.serialNumber}</span>
                            </span>
                          )}
                          {/* Make · Model */}
                          {(asset.make || asset.model) && (
                            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                              {[asset.make, asset.model].filter(Boolean).join(' · ')}
                            </span>
                          )}
                          {/* ACMS/FMS badge */}
                          {asset.acmsFms && (
                            <span style={{
                              fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em',
                              background: asset.acmsFms.includes('FMS') ? 'rgba(251,191,36,0.15)' : 'rgba(34,197,94,0.12)',
                              color: asset.acmsFms.includes('FMS') ? '#f59e0b' : '#22c55e',
                              padding: '2px 8px', borderRadius: '20px',
                              marginLeft: 'auto', flexShrink: 0,
                            }}>
                              {asset.acmsFms}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Form — only visible when formMode is set ('add' or 'edit') ──── */}
      {(activeTabMode === 'add-asset' || activeTabMode === 'coins-recommendations') && formMode && (
        <div ref={formRef}>
          {/* Form mode header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '1rem',
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                {formMode === 'edit'
                  ? `✏️ Request Update: ${editingAsset?.assetNumber || editingAsset?.serialNumber || 'Asset'}`
                  : '➕ Add New System'}
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {formMode === 'edit'
                  ? 'Update the fields below and click "Save as Draft" — it will appear in the Ready to Send section for approval.'
                  : 'All available fields have been pre-filled from COINS data. Review, complete any remaining fields, then save as Draft.'}
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

            {/* ── Find Asset Number from COINS (only on Add System page) ── */}
            {activeTabMode === 'add-asset' && (
              <div style={{
                marginBottom: '1.2rem',
                padding: '1rem 1.1rem',
                background: 'rgba(99,102,241,0.07)',
                border: '1.5px solid rgba(99,102,241,0.28)',
                borderRadius: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.55rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#a5b4fc', letterSpacing: '0.03em' }}>
                    🔍 Find Asset Number from COINS
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    — enter Serial Number to auto-fill Asset Number
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={snLookupQ}
                    onChange={e => { setSnLookupQ(e.target.value); setSnLookupResults([]); }}
                    placeholder="Enter Serial Number (EQSRLNO)…"
                    className="login-input"
                    style={{ paddingRight: snLookupLoading ? '2.4rem' : undefined }}
                  />
                  {snLookupLoading && (
                    <span style={{
                      position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)',
                      fontSize: '0.75rem', color: 'var(--text-muted)',
                    }}>⏳</span>
                  )}
                </div>

                {/* Results dropdown */}
                {snLookupResults.length > 0 && (
                  <div style={{
                    marginTop: '0.4rem',
                    background: 'rgba(15,12,40,0.95)',
                    border: '1.5px solid rgba(99,102,241,0.4)',
                    borderRadius: 8,
                    overflow: 'hidden',
                    boxShadow: '0 6px 24px rgba(0,0,0,0.4)',
                  }}>
                    {snLookupResults.map((r, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, assetNumber: r.assetNumber || '' }));
                          setSnLookupQ('');
                          setSnLookupResults([]);
                        }}
                        style={{
                          padding: '0.55rem 0.9rem',
                          cursor: 'pointer',
                          borderBottom: i < snLookupResults.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                          transition: 'background 0.15s',
                          display: 'flex', flexDirection: 'column', gap: '0.15rem',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.18)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Asset No.</span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.9rem', color: '#c4b5fd' }}>{r.assetNumber}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>· SN: {r.serialNumber}</span>
                        </div>
                        {r.configuration && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', paddingLeft: 2 }}>{r.configuration}</span>
                        )}
                        <span style={{ fontSize: '0.65rem', color: '#6c63ff', fontWeight: 600 }}>↵ Click to fill Asset Number</span>
                      </div>
                    ))}
                  </div>
                )}

                {snLookupQ.trim() && !snLookupLoading && snLookupResults.length === 0 && (
                  <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.3rem 0.2rem' }}>
                    No matching asset found for that serial number.
                  </div>
                )}
              </div>
            )}

        <div className="form-grid">

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
            {formData.make === 'Others' ? (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  name="makeOther"
                  value={formData.makeOther}
                  onChange={handleChange}
                  required
                  className="login-input"
                  placeholder="Enter Make manually..."
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, make: '', makeOther: '' }));
                  }}
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                  title="Choose from list"
                >
                  ✕
                </button>
              </div>
            ) : (
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
                <option value="Others">enter manually</option>
              </select>
            )}
          </div>

          {/* Model */}
          <div className="form-group">
            <label>Model *</label>
            {formData.model === 'Others' ? (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  name="modelOther"
                  value={formData.modelOther}
                  onChange={handleChange}
                  required
                  className="login-input"
                  placeholder="Enter Model manually..."
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, model: '', modelOther: '' }));
                  }}
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                  title="Choose from list"
                >
                  ✕
                </button>
              </div>
            ) : (
              <select name="model" value={formData.model} onChange={handleChange} required className="login-input">
                <option value="">Select Model...</option>
                <option>Power edge R 730</option>
                <option>HP Compaq 8200 CM</option>
                <option>HP ProDesk 600 G1</option>
                <option value="Others">enter manually</option>
              </select>
            )}
          </div>

          {/* Network Domain */}
          <div className="form-group">
            <label>Network Domain</label>
            {formData.networkDomain === 'Others' ? (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  name="networkDomainOther"
                  value={formData.networkDomainOther}
                  onChange={handleChange}
                  className="login-input"
                  placeholder="Enter Domain manually..."
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, networkDomain: '', networkDomainOther: '' }));
                  }}
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                  title="Choose from list"
                >
                  ✕
                </button>
              </div>
            ) : (
              <select name="networkDomain" value={formData.networkDomain} onChange={handleChange} className="login-input">
                <option value="">Select Domain...</option>
                <option>Internet</option>
                <option>SpaceNet</option>
                <option>ASDMLAN</option>
                <option>RSAA Data</option>
                <option>Not in any Network</option>
                <option value="Others">enter manually</option>
              </select>
            )}
          </div>

          {/* IP Address — hidden when Not in any Network */}
          {formData.networkDomain !== 'Not in any Network' && (
            <div className="form-group">
              <label>IP Address</label>
              <input type="text" name="ipAddress" value={formData.ipAddress} onChange={handleChange} className="login-input" placeholder="e.g. 192.168.1.1" />
            </div>
          )}

          {/* Brief Configuration */}
          <div className="form-group full-width">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ margin: 0 }}>Brief Configuration</label>
              <button
                type="button"
                disabled={!formData.configuration || predicting}
                onClick={async () => {
                  if (!formData.configuration.trim()) return;
                  setPredicting(true); setPredError(null); setPrediction(null);
                  try {
                    const res = await predictCategory(formData.configuration);
                    setPrediction(res);
                  } catch (e) {
                    setPredError(e.message || 'Prediction failed.');
                  } finally {
                    setPredicting(false);
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  background: predicting ? 'rgba(99,102,241,0.1)' : 'linear-gradient(135deg,rgba(99,102,241,0.18),rgba(139,92,246,0.18))',
                  border: '1.5px solid rgba(99,102,241,0.45)',
                  color: (!formData.configuration || predicting) ? '#6b7280' : '#a5b4fc',
                  borderRadius: '7px', fontSize: '0.72rem', fontWeight: 700,
                  cursor: (!formData.configuration || predicting) ? 'not-allowed' : 'pointer',
                  padding: '4px 11px', transition: 'all 0.2s',
                }}
              >
                {predicting
                  ? <><Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Predicting…</>
                  : <><Sparkles size={11} /> Predict System Category</>
                }
              </button>
            </div>

            <textarea
              name="configuration"
              value={formData.configuration}
              onChange={e => { handleChange(e); setPrediction(null); setPredError(null); }}
              className="login-input"
              rows="3"
              placeholder="Describe the asset configuration… (e.g. 'HP EliteBook laptop i5 SSD 8GB' or 'Cisco Nexus 10G TOR switch')"
            />

            {/* ─ Prediction result card ─ */}
            {predError && (
              <div style={{
                marginTop: '0.5rem', padding: '0.55rem 0.8rem',
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8, fontSize: '0.78rem', color: '#fca5a5',
              }}>
                {predError}
              </div>
            )}

            {prediction && (
              <div style={{
                marginTop: '0.6rem',
                background: '#ffffff',
                border: '1.5px solid #e0e7ff',
                borderRadius: 10,
                overflow: 'hidden',
                boxShadow: '0 4px 16px rgba(99,102,241,0.1)',
              }}>
                {/* Header */}
                <div style={{
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  padding: '0.6rem 1rem',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Sparkles size={14} style={{ color: '#c4b5fd' }} />
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.82rem' }}>ML Category Prediction</span>
                  </div>
                  <button type="button" onClick={() => setPrediction(null)}
                    style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 5, padding: '2px 8px', cursor: 'pointer', fontSize: '0.7rem' }}
                  >✕</button>
                </div>

                {/* Top prediction */}
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.67rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Best Match</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1rem', color: '#4f46e5' }}>{prediction.predicted}</span>
                    <span style={{ fontSize: '0.75rem', color: '#475569' }}>{prediction.display}</span>
                    {/* Confidence bar */}
                    <div style={{ flex: 1, minWidth: 80 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#94a3b8', marginBottom: 2 }}>
                        <span>Confidence</span>
                        <span style={{ fontWeight: 700, color: prediction.confidence >= 70 ? '#22c55e' : prediction.confidence >= 45 ? '#f59e0b' : '#ef4444' }}>
                          {prediction.confidence}%
                        </span>
                      </div>
                      <div style={{ height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 3, transition: 'width 0.5s',
                          width: `${prediction.confidence}%`,
                          background: prediction.confidence >= 70 ? '#22c55e' : prediction.confidence >= 45 ? '#f59e0b' : '#ef4444',
                        }} />
                      </div>
                    </div>
                    {/* Apply button */}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, CATEGORY: prediction.display }));
                        setPrediction(null);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                        color: '#fff', border: 'none', borderRadius: 7,
                        padding: '5px 14px', fontSize: '0.74rem', fontWeight: 700,
                        cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      Apply Category
                    </button>
                  </div>
                </div>

                {/* Top 3 */}
                {prediction.top3 && prediction.top3.length > 1 && (
                  <div style={{ padding: '0.6rem 1rem' }}>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Other Possibilities</div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {prediction.top3.slice(1).map((alt, i) => (
                        <button
                          key={i} type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, CATEGORY: alt.display }));
                            setPrediction(null);
                          }}
                          style={{
                            background: '#f8fafc', border: '1px solid #e2e8f0',
                            borderRadius: 6, padding: '4px 10px',
                            fontSize: '0.7rem', cursor: 'pointer',
                            color: '#475569', fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: '0.3rem',
                          }}
                        >
                          <span style={{ color: '#6366f1', fontFamily: 'monospace', fontWeight: 700 }}>{alt.label}</span>
                          <span style={{ color: '#94a3b8' }}>{alt.confidence}%</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CATEGORY */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ margin: 0 }}>CATEGORY *</label>
              <button
                type="button"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                  background: showCategoryGuide ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.07)',
                  border: '1px solid rgba(99,102,241,0.35)',
                  color: '#a5b4fc',
                  borderRadius: '6px',
                  fontSize: '0.72rem', fontWeight: 700,
                  cursor: 'pointer',
                  padding: '3px 10px',
                  transition: 'all 0.2s',
                }}
                onClick={() => setShowCategoryGuide(v => !v)}
              >
                {showCategoryGuide ? '✕ Hide' : '📋 Click to know your system category'}
              </button>
            </div>
            <input
              type="text"
              name="CATEGORY"
              value={formData.CATEGORY}
              readOnly
              required
              className="login-input"
              placeholder="Use Predictor or Guide below to select..."
              style={{
                background: '#f8fafc',
                color: formData.CATEGORY ? '#4f46e5' : '#94a3b8',
                fontWeight: formData.CATEGORY ? 700 : 400,
                cursor: 'not-allowed'
              }}
            />
          </div>

          {/* ── Category Reference Guide Card (full-width) ── */}
          {showCategoryGuide && (
            <div style={{
              gridColumn: '1 / -1',
              background: '#ffffff',
              border: '1.5px solid #e2e8f0',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              marginBottom: '0.5rem',
            }}>
              {/* Card header */}
              <div style={{
                background: 'linear-gradient(135deg, #4f46e5, #6c63ff)',
                padding: '0.75rem 1rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.9rem' }}>📋 System Category Reference</div>
                  <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem', marginTop: '0.1rem' }}>
                    Identify your system type from the list below
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCategoryGuide(false)}
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                >
                  ✕ Close
                </button>
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: 700, color: '#475569', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap', width: '48px' }}>SL No</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left',   fontWeight: 700, color: '#475569', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>Category</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left',   fontWeight: 700, color: '#475569', borderBottom: '2px solid #e2e8f0' }}>System Configuration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      [1,  'PC Type-1',        'Thin Clients'],
                      [2,  'PC Type-2',        'All low end PCs like Core2duo / dual Core or equivalent PCs'],
                      [3,  'PC Type-3',        'All desktops / industrial PCs with i3/i5/i7 or any equivalent or latest processors.'],
                      [4,  'PC Type-4',        'Laptops, All-in-one PCs, Panel mount PCs with i3/i5/i7 or any equivalent or latest processors.'],
                      [5,  'SP Type-1',        'Standalone LTO drives, LCD projectors, KVM switch with console'],
                      [6,  'SP Type-2',        'A3 Plotters & A0 Plotters'],
                      [7,  'Printer Type-1',   'A4 Black & White laser jet printers/scanners'],
                      [8,  'Printer Type-2',   'A4 Color Laser jet Printers, Multi-function printers'],
                      [9,  'Printer Type-3',   'A3 and other heavy-duty printers'],
                      [10, 'WS Type-1',        'Workstations with 4 GB graphic cards or less'],
                      [11, 'WS Type-2',        'Workstations with more than 4 GB graphic cards'],
                      [12, 'Server Type-1',    'Rack Mount / Tower / Blade Servers'],
                      [13, 'Server Type-2',    'Rack Mount / Tower / Blade Servers with 4 CPUs or more, Blade Chassis'],
                      [14, 'Storage Type-1',   'Portable NAS systems and JBODs'],
                      [15, 'Storage Type-2',   'Storage systems up to 100 TB capacity, Tape library with up to 50 media slots'],
                      [16, 'Storage Type-3',   'Storage systems with more than 100 TB & up to 500 TB capacity, Tape library with more than 50 and up to 100 media slots'],
                      [17, 'Storage Type-4',   'Storage systems with more than 500 TB capacity, Tape library with more than 100 media slots'],
                      [18, 'NW Type-1',        '100/1000 Mbps Network switches'],
                      [19, 'NW Type-2',        '100/1000 Mbps Network switches populated with 10G uplink'],
                      [20, 'NW Type-3',        'Standalone 10G Edge Switches, TOR switches, Routers, SAN Switches'],
                      [21, 'NW Type-4',        'Standalone Edge/TOR Switches with more than 10G port speed'],
                      [22, 'NW Type-5',        'Chassis Core Switches, Chassis SAN Switches, Chassis Routers'],
                      [23, 'NW Type-6',        'Network and Security Appliances viz., Network Firewall, IPS, Web Application Firewalls, Load Balancers'],
                    ].map(([sl, cat, config], i) => (
                      <tr
                        key={sl}
                        onClick={() => {
                          const formattedCategory = cat.toUpperCase().replace('-', ' ');
                          setFormData(prev => ({ ...prev, CATEGORY: formattedCategory }));
                          setShowCategoryGuide(false);
                        }}
                        style={{ background: i % 2 === 0 ? '#ffffff' : '#f8fafc', cursor: 'pointer', transition: 'background 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#ede9fe'}
                        onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#ffffff' : '#f8fafc'}
                      >
                        <td style={{ padding: '0.45rem 0.75rem', textAlign: 'center', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}>{sl}</td>
                        <td style={{ padding: '0.45rem 0.75rem', color: '#4f46e5', fontWeight: 700, borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{cat}</td>
                        <td style={{ padding: '0.45rem 0.75rem', color: '#334155', borderBottom: '1px solid #f1f5f9', lineHeight: 1.45 }}>{config}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}


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
              <option>ITID</option>
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
              <option>SISG</option>
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
            <label>ACMS/FMS</label>
            <select name="acmsFms" value={formData.acmsFms} onChange={handleChange} className="login-input">
              <option value="">Select ACMS/FMS...</option>
              {formData.warranty === 'Yes' ? (
                <>
                  <option value="System proposed for ACMS">System proposed for ACMS</option>
                  <option value="FMS Alone">FMS Alone</option>
                  <option value="ACMS+FMS">ACMS+FMS</option>
                </>
              ) : (
                <>
                  <option value="ACMS">ACMS</option>
                  <option value="FMS Alone">FMS Alone</option>
                  <option value="ACMS+FMS">ACMS+FMS</option>
                </>
              )}
            </select>
          </div>

        </div>{/* /form-grid */}

        <div className="form-actions">
            <button type="submit" className="submit-btn login-btn" disabled={status.type === 'loading'}>
              <Save size={18} />
              <span>{status.type === 'loading' ? 'Saving Draft…' : 'Save as Draft'}</span>
            </button>
        </div>

          </form>
        </div>
      )}{/* /formMode */}

    </div>
  );
}
