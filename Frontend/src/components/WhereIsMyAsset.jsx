import React, { useState, useRef, useCallback } from 'react';
import { Search, MapPin, Hash, Tag, User, X, Loader2, AlertCircle, Info } from 'lucide-react';
import { searchWhereIsMyAsset } from '../api';

/* ─────────────────────────── helpers ─────────────────────────── */
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ─────────────────────────── component ───────────────────────── */
export default function WhereIsMyAsset() {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus]   = useState('idle'); // idle | loading | done | error
  const [errorMsg, setErrorMsg] = useState('');
  const [searched, setSearched] = useState(false);

  /* debounced live search */
  const doSearch = useCallback(
    debounce(async (q) => {
      if (!q.trim()) {
        setResults([]);
        setStatus('idle');
        setSearched(false);
        return;
      }
      setStatus('loading');
      setErrorMsg('');
      try {
        const data = await searchWhereIsMyAsset(q.trim());
        setResults(Array.isArray(data) ? data : []);
        setStatus('done');
        setSearched(true);
      } catch (err) {
        const msg = err?.message || 'Search failed. Please try again.';
        setErrorMsg(msg);
        setStatus('error');
        setSearched(true);
      }
    }, 400),
    []
  );

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    doSearch(val);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setStatus('idle');
    setSearched(false);
    setErrorMsg('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') handleClear();
  };

  return (
    <div className="wima-wrapper animate-fade-in">
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="wima-header">
        <div className="wima-header-icon">
          <MapPin size={28} strokeWidth={1.8} />
        </div>
        <div>
          <h1 className="wima-title">Where is my Asset?</h1>
          <p className="wima-subtitle">
            Search the COWMIS asset registry by serial number to locate any system.
          </p>
        </div>
      </div>

      {/* ── Search bar ──────────────────────────────────────── */}
      <div className="wima-search-card glass-panel">
        <div className="wima-search-row">
          <div className="wima-search-input-wrap">
            <Search className="wima-search-icon" size={20} />
            <input
              id="wima-search-input"
              className="wima-search-input"
              type="text"
              value={query}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Enter serial number (e.g. SRL12345)…"
              autoComplete="off"
              spellCheck="false"
            />
            {query && (
              <button className="wima-clear-btn" onClick={handleClear} title="Clear search">
                <X size={16} />
              </button>
            )}
          </div>

          {status === 'loading' && (
            <div className="wima-spinner">
              <Loader2 size={22} className="spin" />
            </div>
          )}
        </div>

        <p className="wima-hint">
          <Info size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
          Type at least a few characters — results appear automatically.
        </p>
      </div>

      {/* ── Error state ─────────────────────────────────────── */}
      {status === 'error' && (
        <div className="wima-error glass-panel">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Results ─────────────────────────────────────────── */}
      {status === 'done' && (
        <>
          <div className="wima-results-meta">
            {results.length > 0
              ? <span><strong>{results.length}</strong> record{results.length !== 1 ? 's' : ''} found for <em>"{query}"</em></span>
              : <span>No records found for <em>"{query}"</em> in COWMIS.</span>
            }
          </div>

          {results.length > 0 && (
            <div className="wima-results-grid">
              {results.map((asset) => (
                <div key={asset.id} className="wima-card glass-panel">
                  {/* Card header — serial number */}
                  <div className="wima-card-header">
                    <div className="wima-card-serial-badge">
                      <Hash size={14} />
                      <span>{asset.serialNumber || '—'}</span>
                    </div>
                  </div>

                  {/* Fields */}
                  <div className="wima-card-body">
                    <div className="wima-field">
                      <span className="wima-field-label">
                        <Tag size={13} /> Asset No.
                      </span>
                      <span className="wima-field-value">
                        {asset.assetNumber || <em className="wima-na">N/A</em>}
                      </span>
                    </div>

                    <div className="wima-field">
                      <span className="wima-field-label">
                        <Hash size={13} /> Serial No.
                      </span>
                      <span className="wima-field-value">
                        {asset.serialNumber || <em className="wima-na">N/A</em>}
                      </span>
                    </div>

                    <div className="wima-field wima-field-description">
                      <span className="wima-field-label">
                        <Info size={13} /> Description
                      </span>
                      <span className="wima-field-value wima-description-text">
                        {asset.description || <em className="wima-na">N/A</em>}
                      </span>
                    </div>

                    <div className="wima-field wima-field-custodian">
                      <span className="wima-field-label">
                        <User size={13} /> Custodian (EC No.)
                      </span>
                      <span className="wima-field-value wima-custodian-badge">
                        {asset.custodian || <em className="wima-na">N/A</em>}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {results.length === 0 && (
            <div className="wima-empty glass-panel">
              <MapPin size={40} strokeWidth={1.2} className="wima-empty-icon" />
              <p className="wima-empty-title">Asset not found</p>
              <p className="wima-empty-sub">
                No asset matching <strong>"{query}"</strong> was found in the COWMIS registry.
                <br />Try a different serial number or a partial match.
              </p>
            </div>
          )}
        </>
      )}

      {/* ── Idle / pre-search state ─────────────────────────── */}
      {status === 'idle' && !searched && (
        <div className="wima-idle glass-panel">
          <MapPin size={48} strokeWidth={1.1} className="wima-idle-icon" />
          <p className="wima-idle-title">Find any asset in COWMIS</p>
          <p className="wima-idle-sub">
            Enter a serial number in the search box above.<br />
            Results show Asset No., Serial No., Description and Custodian Employee Code.
          </p>
        </div>
      )}
    </div>
  );
}
