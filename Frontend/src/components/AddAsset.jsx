import React, { useState, useEffect } from 'react';
import { Save, Sparkles, Database, ChevronRight, Loader2, ServerCrash, CheckCircle2 } from 'lucide-react';
import { getAssetRecommendations } from '../api';
import '../pages/Dashboard.css';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: map a remote cowmis recommendation → form field values
// ─────────────────────────────────────────────────────────────────────────────
function recommendationToForm(rec) {
  // Known dropdown options per field
  const MAKE_OPTIONS = ['HP', 'Dell', 'Cisco', 'Sony', 'Toshiba', 'Konika', 'NetApp', 'HPE', 'NetASQ', 'D-link'];
  const MODEL_OPTIONS = ['Power edge R 730', 'HP Compaq 8200 CM', 'HP ProDesk 600 G1'];
  const DOMAIN_OPTIONS = ['Internet', 'SpaceNet', 'ASDMLAN', 'RSAA Data', 'Not in any Network'];
  const DIVISION_OPTIONS = ['DPFD', 'ASAG', 'RSAA', 'ASCID'];
  const GROUP_OPTIONS = ['SPFPG', 'ASAG', 'RSAA'];
  const AREA_OPTIONS = ['DPA', 'RSA'];
  const LOCATION_OPTIONS = ['Balanagar', 'ASAG', 'RSAA'];
  const CATEGORY_OPTIONS = [
    'SERVER TYPE 1', 'SERVER TYPE 2', 'PC TYPE 1', 'PC TYPE 2', 'PC TYPE 3', 'PC TYPE 4',
    'STORAGE TYPE 2', 'PRINTER TYPE 1', 'PRINTER TYPE 2', 'SP TYPE 1', 'SP TYPE 2',
  ];

  const pick = (val, options) => {
    if (!val) return { selected: '', other: '' };
    const match = options.find(o => o.toUpperCase() === val.toUpperCase());
    return match ? { selected: match, other: '' } : { selected: 'Others', other: val };
  };

  const make = pick(rec.make, MAKE_OPTIONS);
  const model = pick(rec.model, MODEL_OPTIONS);
  const domain = pick(rec.networkDomain, DOMAIN_OPTIONS);
  const division = pick(rec.UserDivision, DIVISION_OPTIONS);
  const group = pick(rec.GROUP, GROUP_OPTIONS);
  const area = pick(rec.AREA, AREA_OPTIONS);
  const location = pick(rec.LOCATION, LOCATION_OPTIONS);
  const category = pick(rec.CATEGORY, CATEGORY_OPTIONS);

  return {
    name: rec.name || rec.assetNumber || '',
    serialNumber: rec.serialNumber || '',
    make: make.selected,
    makeOther: make.other,
    model: model.selected,
    modelOther: model.other,
    configuration: rec.configuration || '',
    networkDomain: domain.selected,
    networkDomainOther: domain.other,
    ipAddress: rec.ipAddress || '',
    acmsFms: rec.acmsFms || rec.sourceTable || '',
    fmsExpiryDate: rec.fmsExpiryDate || rec.warrantyExpiryDate || '',
    Monitor: '',
    MonitorCustom: rec.Monitor || '',
    AssetCustodianECNO: rec.AssetCustodianECNO || '',
    UserDivision: division.selected,
    UserDivisionOther: division.other,
    GROUP: group.selected,
    GROUPOther: group.other,
    AREA: area.selected,
    AREAOther: area.other,
    CATEGORY: category.selected,
    CATEGORYOther: category.other,
    LOCATION: location.selected,
    LOCATIONOther: location.other,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Recommendation Card component
// ─────────────────────────────────────────────────────────────────────────────
function RecommendationCard({ rec, isSelected, onClick }) {
  const source = rec.sourceTable || rec.acmsFms || 'ACMS';
  const badgeClass = source.toLowerCase().includes('fms') ? 'fms' : 'acms';

  return (
    <button
      type="button"
      className={`rec-card ${isSelected ? 'rec-card--selected' : ''}`}
      onClick={() => onClick(rec)}
      title={`Click to auto-fill form with this ${source} asset`}
    >
      <div className="rec-card-header">
        <span className={`acms-badge ${badgeClass}`}>{source}</span>
        {isSelected && <CheckCircle2 size={16} className="rec-card-check" />}
      </div>
      <div className="rec-card-name">{rec.name || rec.assetNumber || '—'}</div>
      <div className="rec-card-meta">
        {rec.CATEGORY && <span>{rec.CATEGORY}</span>}
        {rec.make && <span>{rec.make}</span>}
        {rec.model && <span>{rec.model}</span>}
      </div>
      {rec.serialNumber && (
        <div className="rec-card-serial">S/N: {rec.serialNumber}</div>
      )}
      <div className="rec-card-cta">
        Auto-fill form <ChevronRight size={14} />
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main AddAsset component
// ─────────────────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: '',
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

export default function AddAsset({ onAddAsset }) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [status, setStatus] = useState({ type: null, message: '' });

  // ── Recommendations state ──────────────────────────────────────────────────
  const [recommendations, setRecommendations] = useState([]);
  const [recLoading, setRecLoading] = useState(true);
  const [recError, setRecError] = useState(false);
  const [selectedRecId, setSelectedRecId] = useState(null);

  // Fetch recommendations from remote cowmis DB on mount
  useEffect(() => {
    setRecLoading(true);
    setRecError(false);
    getAssetRecommendations()
      .then(data => {
        setRecommendations(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setRecError(true);
      })
      .finally(() => setRecLoading(false));
  }, []);

  // ── Auto-fill form when a recommendation card is clicked ───────────────────
  const handleRecommendationClick = (rec) => {
    if (selectedRecId === rec.id) {
      // Deselect — clear form
      setSelectedRecId(null);
      setFormData(EMPTY_FORM);
    } else {
      setSelectedRecId(rec.id);
      setFormData(recommendationToForm(rec));
    }
  };

  // ── Form handlers ──────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
      setStatus({ type: 'success', message: 'Asset saved to Asset Manager successfully!' });
      setFormData(EMPTY_FORM);
      setSelectedRecId(null);
      setTimeout(() => setStatus({ type: null, message: '' }), 3000);
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Failed to save asset. Please try again.' });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="add-asset-container animate-fade-in">

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="section-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 className="section-title" style={{ marginBottom: '0.25rem' }}>Add Asset</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Select a recommendation from the <strong>cowmis</strong> database or fill in the form manually.
          </p>
        </div>
      </div>

      {/* ── Recommendations Panel ──────────────────────────────────────────── */}
      <div className="rec-panel glass-panel" style={{ marginBottom: '2rem' }}>
        <div className="rec-panel-header">
          <div className="rec-panel-title">
            <Database size={18} className="rec-panel-db-icon" />
            <span>Recommendations from cowmis</span>
            <span className="rec-panel-subtitle">Remote Database</span>
          </div>
          <Sparkles size={16} style={{ color: 'var(--accent-primary)', opacity: 0.7 }} />
        </div>

        {/* Loading */}
        {recLoading && (
          <div className="rec-loading">
            <Loader2 size={20} className="rec-spinner" />
            <span>Fetching your assets from cowmis database…</span>
          </div>
        )}

        {/* Error — remote DB unreachable */}
        {!recLoading && recError && (
          <div className="rec-error">
            <ServerCrash size={18} />
            <span>Could not reach the cowmis database. You can still fill the form manually.</span>
          </div>
        )}

        {/* Empty — no assets found for this employee */}
        {!recLoading && !recError && recommendations.length === 0 && (
          <div className="rec-empty">
            No assets found for your employee code in cowmis.
            Please fill in the form below manually.
          </div>
        )}

        {/* Recommendation cards */}
        {!recLoading && !recError && recommendations.length > 0 && (
          <>
            <p className="rec-hint">
              Click a card to auto-fill the form below. Click again to deselect.
            </p>
            <div className="rec-scroll">
              {recommendations.map(rec => (
                <RecommendationCard
                  key={rec.id}
                  rec={rec}
                  isSelected={selectedRecId === rec.id}
                  onClick={handleRecommendationClick}
                />
              ))}
            </div>
          </>
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

        {selectedRecId && (
          <div className="rec-autofill-notice">
            <CheckCircle2 size={16} />
            Form auto-filled from cowmis — review the values below and save.
          </div>
        )}

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

          {/* Asset Name */}
          <div className="form-group">
            <label>Asset Name *</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required className="login-input" placeholder="Enter Asset Name" />
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

          {/* IP Address */}
          <div className="form-group">
            <label>IP Address</label>
            <input type="text" name="ipAddress" value={formData.ipAddress} onChange={handleChange} className="login-input" placeholder="e.g. 192.168.1.1" />
          </div>

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
            <span>{status.type === 'loading' ? 'Saving…' : 'Save to Asset Manager'}</span>
          </button>
        </div>

      </form>
    </div>
  );
}
