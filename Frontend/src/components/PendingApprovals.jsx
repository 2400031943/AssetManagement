import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { getAssignedApprovals, approveOrRejectRequest } from '../api';
import '../pages/Dashboard.css';

const STATUS_COLORS = {
  'Submitted':          '#f59e0b',
  'Approver Approved':  '#60a5fa',
  'Registrar Approved': '#a78bfa',
  'DD Approved':        '#34d399',
};

function AssignedCard({ req, myRole, onAction }) {
  const [expanded, setExpanded]   = useState(false);
  const [remarks, setRemarks]     = useState('');
  const [acting, setActing]       = useState(false); // 'approve'|'reject'|false
  const [done, setDone]           = useState(null);  // {success, message}

  const handleAct = async (action) => {
    setActing(action);
    try {
      const res = await approveOrRejectRequest(req.id, action, remarks);
      setDone({ success: action === 'approve', message: res.message || `${action === 'approve' ? 'Approved' : 'Rejected'} successfully.` });
      onAction();
    } catch (err) {
      setDone({ success: false, message: err.message || 'Action failed.' });
    } finally {
      setActing(false);
    }
  };

  const accentColor = STATUS_COLORS[req.status] || '#6c63ff';

  if (done) {
    return (
      <div style={{
        padding: '0.9rem 1.2rem', borderRadius: 12, marginBottom: '0.9rem',
        background: done.success ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
        border: `1.5px solid ${done.success ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
        display: 'flex', alignItems: 'center', gap: '0.6rem',
        fontSize: '0.88rem', fontWeight: 600,
        color: done.success ? '#22c55e' : '#ef4444',
      }}>
        {done.success ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
        {done.message} — <span style={{ fontFamily: 'monospace' }}>{req.assetNumber || req.serialNumber || `#${req.id}`}</span>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: `1.5px solid ${accentColor}33`,
      borderRadius: 14, padding: '1rem 1.2rem', marginBottom: '1rem',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div>
          <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.95rem', color: '#e2e8f0', marginBottom: '0.2rem' }}>
            {req.assetNumber || req.serialNumber || `Request #${req.id}`}
            {req.serialNumber && req.assetNumber && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>· SN: {req.serialNumber}</span>}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            {req.category && <span>📂 {req.category}</span>}
            {req.make && <span>🏭 {req.make} {req.model || ''}</span>}
            {req.area && <span>📍 {req.area}</span>}
            {req.userDivision && <span>🏢 {req.userDivision}</span>}
          </div>
          <div style={{ marginTop: '0.3rem', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
            Requested by: <strong style={{ color: '#e2e8f0' }}>{req.requesterName || req.requesterEcno}</strong>
            {req.createdAt && <span style={{ marginLeft: '0.5rem' }}>· {new Date(req.createdAt).toLocaleDateString('en-IN')}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
          <span style={{
            background: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}44`,
            borderRadius: 20, padding: '2px 10px', fontSize: '0.7rem', fontWeight: 700,
          }}>{req.status}</span>
          <span style={{ fontSize: '0.72rem', color: '#a5b4fc', fontWeight: 600 }}>Awaiting: {myRole}</span>
        </div>
      </div>

      {/* Expand details */}
      <button onClick={() => setExpanded(v => !v)} style={{
        background: 'none', border: 'none', color: 'var(--accent-primary, #6c63ff)',
        fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 4, padding: 0, marginBottom: expanded ? '0.75rem' : 0,
      }}>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? 'Hide details' : 'Show all details'}
      </button>

      {expanded && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
          gap: '0.4rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: '0.75rem',
        }}>
          {[
            ['Asset No', req.assetNumber], ['Serial No', req.serialNumber],
            ['Category', req.category], ['Make', req.make], ['Model', req.model],
            ['IP Address', req.ipAddress], ['Network Domain', req.networkDomain],
            ['Monitor', req.monitor], ['Division', req.userDivision], ['Group', req.group],
            ['Area', req.area], ['Location', req.location], ['ACMS/FMS', req.acmsFms],
            ['Warranty', req.warranty], ['Warranty Expiry', req.fmsExpiryDate],
            ['Custodian ECNO', req.assetCustodianEcno],
          ].filter(([, v]) => v).map(([label, val]) => (
            <div key={label} style={{ fontSize: '0.73rem' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.67rem' }}>{label}</span>
              <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{val}</span>
            </div>
          ))}
          {req.configuration && (
            <div style={{ fontSize: '0.73rem', gridColumn: '1 / -1' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.67rem' }}>Configuration</span>
              <span style={{ color: '#e2e8f0', fontWeight: 500, wordBreak: 'break-word' }}>{req.configuration}</span>
            </div>
          )}
        </div>
      )}

      {/* Remarks input */}
      <textarea
        placeholder="Remarks (optional)…"
        value={remarks}
        onChange={e => setRemarks(e.target.value)}
        rows={2}
        style={{
          width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8, color: '#e2e8f0', fontSize: '0.82rem', padding: '0.5rem 0.7rem',
          resize: 'vertical', marginBottom: '0.75rem', boxSizing: 'border-box',
        }}
      />

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={() => handleAct('approve')}
          disabled={!!acting}
          style={{
            flex: 1, padding: '0.6rem', background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.88rem',
            cursor: acting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            opacity: acting === 'approve' ? 0.7 : 1,
          }}
        >
          {acting === 'approve' ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={15} />}
          Approve
        </button>
        <button
          onClick={() => handleAct('reject')}
          disabled={!!acting}
          style={{
            flex: 1, padding: '0.6rem', background: 'rgba(239,68,68,0.12)',
            color: '#ef4444', border: '1.5px solid rgba(239,68,68,0.35)', borderRadius: 8, fontWeight: 700, fontSize: '0.88rem',
            cursor: acting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            opacity: acting === 'reject' ? 0.7 : 1,
          }}
        >
          {acting === 'reject' ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <XCircle size={15} />}
          Reject
        </button>
      </div>
    </div>
  );
}

function levelLabel(req, myEcno, isAdmin) {
  const ecno = (myEcno || '').trim().toUpperCase();
  if (req.status === 'Submitted'           && (req.approverEcno  || '').trim().toUpperCase() === ecno) return 'Approver';
  if (req.status === 'Approver Approved'   && (req.registrarEcno || '').trim().toUpperCase() === ecno) return 'Area Focal Point';
  if (req.status === 'Registrar Approved'  && (req.ddEcno        || '').trim().toUpperCase() === ecno) return 'Deputy Director';
  if (req.status === 'DD Approved'         && isAdmin) return 'Admin';
  return 'Reviewer';
}

export default function PendingApprovals({ loggedInUser }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const myEcno  = (loggedInUser?.emp_code || '').trim().toUpperCase();
  const isAdmin = (loggedInUser?.role || '').toLowerCase() === 'admin';

  const fetch = () => {
    setLoading(true);
    setError(null);
    getAssignedApprovals()
      .then(data => setRequests(Array.isArray(data) ? data : []))
      .catch(e => setError(e.message || 'Failed to load.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  return (
    <div className="add-asset-container animate-fade-in">
      <div className="section-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 className="section-title" style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={24} style={{ color: '#6c63ff' }} /> Pending Approvals
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Requests waiting for your action as Approver, Area Focal Point, DD or Admin.
          </p>
        </div>
        <button onClick={fetch} style={{
          background: 'rgba(108,99,255,0.12)', color: 'var(--accent-primary, #6c63ff)',
          border: '1px solid rgba(108,99,255,0.3)', borderRadius: 8,
          padding: '6px 14px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
        }}>↻ Refresh</button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.75rem' }} />
          <div>Loading pending approvals…</div>
        </div>
      )}

      {!loading && error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '1rem 1.5rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {!loading && !error && requests.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '1.5px dashed rgba(255,255,255,0.1)' }}>
          <ShieldCheck size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ color: '#e2e8f0', marginBottom: '0.5rem' }}>No Pending Approvals</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No requests are currently assigned to you for approval.
          </p>
        </div>
      )}

      {!loading && !error && requests.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#e2e8f0' }}>
              Awaiting Your Action
              <span style={{ marginLeft: '0.5rem', background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: 20, padding: '1px 8px', fontSize: '0.75rem', fontWeight: 700 }}>{requests.length}</span>
            </h3>
          </div>
          {requests.map(req => (
            <AssignedCard
              key={req.id}
              req={req}
              myRole={levelLabel(req, myEcno, isAdmin)}
              onAction={fetch}
            />
          ))}
        </div>
      )}
    </div>
  );
}
