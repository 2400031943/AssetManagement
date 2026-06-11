import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, AlertCircle, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { getPendingRequests, withdrawPendingRequest } from '../api';
import '../pages/Dashboard.css';

// ─── Status badge config ───────────────────────────────────────────────────
const STATUS_CONFIG = {
  'Submitted':          { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: Clock,          label: 'Submitted' },
  'Approver Approved':  { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  icon: CheckCircle2,   label: 'Approver Approved' },
  'Registrar Approved': { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', icon: CheckCircle2,   label: 'Registrar Approved' },
  'DD Approved':        { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  icon: CheckCircle2,   label: 'DD Approved' },
  'Approved':           { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   icon: CheckCircle2,   label: 'Fully Approved' },
  'Rejected':           { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: XCircle,        label: 'Rejected' },
  'Withdrawn':          { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', icon: RotateCcw,      label: 'Withdrawn' },
};

// ─── Progress steps ────────────────────────────────────────────────────────
const LEVELS = [
  { level: 1, label: 'Approver' },
  { level: 2, label: 'Registrar' },
  { level: 3, label: 'DD' },
  { level: 4, label: 'Admin' },
];

function levelFromStatus(status) {
  if (status === 'Approved')           return 5;
  if (status === 'DD Approved')        return 4;
  if (status === 'Registrar Approved') return 3;
  if (status === 'Approver Approved')  return 2;
  return 1;
}

// ─── Progress bar ──────────────────────────────────────────────────────────
function ProgressBar({ status }) {
  const done = levelFromStatus(status);
  const rejected = status === 'Rejected' || status === 'Withdrawn';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginTop: '0.75rem' }}>
      {LEVELS.map((step, i) => {
        const stepDone = done > step.level;
        const stepActive = done === step.level && !rejected;
        const stepRejected = rejected && done === step.level;
        const color = rejected ? '#ef4444' : stepDone ? '#22c55e' : stepActive ? '#f59e0b' : '#374151';
        return (
          <React.Fragment key={step.level}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: stepDone ? '#22c55e' : stepActive ? '#f59e0b' : 'rgba(255,255,255,0.07)',
                border: `2px solid ${color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.7rem', fontWeight: 700, color: stepDone || stepActive ? '#fff' : color,
                transition: 'all 0.3s',
              }}>
                {stepDone ? '✓' : step.level}
              </div>
              <span style={{ fontSize: '0.62rem', color: color, marginTop: 3, whiteSpace: 'nowrap' }}>
                {step.label}
              </span>
            </div>
            {i < LEVELS.length - 1 && (
              <div style={{
                height: 2, flex: 2,
                background: stepDone ? '#22c55e' : 'rgba(255,255,255,0.08)',
                marginBottom: 16, transition: 'background 0.3s',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Single request card ───────────────────────────────────────────────────
function RequestCard({ req, onWithdraw }) {
  const [expanded, setExpanded] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG['Submitted'];
  const Icon = cfg.icon;
  const canWithdraw = req.status === 'Submitted' || req.status === 'Approver Approved';

  const handleWithdraw = async () => {
    if (!window.confirm('Are you sure you want to withdraw this request?')) return;
    setWithdrawing(true);
    try {
      await onWithdraw(req.id);
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: `1.5px solid ${cfg.color}33`,
      borderRadius: 14,
      padding: '1rem 1.2rem',
      marginBottom: '1rem',
      transition: 'all 0.2s',
    }}>
      {/* ── Top row ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.95rem' }}>
              {req.assetNumber || req.serialNumber || `Request #${req.id}`}
            </span>
            {req.serialNumber && req.assetNumber && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>· {req.serialNumber}</span>
            )}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {req.category && <span style={{ marginRight: '0.8rem' }}>📂 {req.category}</span>}
            {req.make && <span style={{ marginRight: '0.8rem' }}>🏭 {req.make} {req.model || ''}</span>}
            {req.area && <span>📍 {req.area}</span>}
          </div>
        </div>

        {/* Status badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            background: cfg.bg, color: cfg.color,
            border: `1px solid ${cfg.color}44`,
            borderRadius: 20, padding: '3px 10px',
            fontSize: '0.72rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <Icon size={12} /> {cfg.label}
          </span>
          {canWithdraw && (
            <button
              onClick={handleWithdraw}
              disabled={withdrawing}
              title="Withdraw this request"
              style={{
                background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 6, padding: '3px 10px',
                fontSize: '0.7rem', fontWeight: 700,
                cursor: withdrawing ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <RotateCcw size={11} /> {withdrawing ? 'Withdrawing…' : 'Withdraw'}
            </button>
          )}
        </div>
      </div>

      {/* ── Progress bar ── */}
      {req.status !== 'Withdrawn' && req.status !== 'Rejected' && (
        <ProgressBar status={req.status} />
      )}

      {/* ── Approval chain summary ── */}
      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Approver', ecno: req.approverEcno, name: req.approverName, remarks: req.approverRemarks, at: req.approverActionAt },
          { label: 'Registrar', ecno: req.registrarEcno, name: req.registrarName, remarks: req.registrarRemarks, at: req.registrarActionAt },
          { label: 'DD', ecno: req.ddEcno, name: req.ddName, remarks: req.ddRemarks, at: req.ddActionAt },
        ].map(lvl => lvl.ecno && (
          <span key={lvl.label} style={{
            fontSize: '0.68rem', background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6, padding: '2px 8px', color: 'var(--text-muted)',
          }}>
            {lvl.label}: <strong style={{ color: '#e2e8f0' }}>{lvl.name || lvl.ecno}</strong>
          </span>
        ))}
      </div>

      {/* ── Expand/collapse full details ── */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          marginTop: '0.6rem', background: 'none', border: 'none',
          color: 'var(--accent-primary, #6c63ff)', fontSize: '0.75rem',
          fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0,
        }}
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? 'Hide details' : 'Show all details'}
      </button>

      {expanded && (
        <div style={{
          marginTop: '0.75rem', padding: '0.75rem',
          background: 'rgba(255,255,255,0.03)', borderRadius: 8,
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.4rem',
        }}>
          {[
            ['Asset No', req.assetNumber],
            ['Serial No', req.serialNumber],
            ['Category', req.category],
            ['Make', req.make],
            ['Model', req.model],
            ['IP Address', req.ipAddress],
            ['Network Domain', req.networkDomain],
            ['Monitor', req.monitor],
            ['Division', req.userDivision],
            ['Group', req.group],
            ['Area', req.area],
            ['Location', req.location],
            ['ACMS/FMS', req.acmsFms],
            ['Warranty', req.warranty],
            ['Warranty Expiry', req.fmsExpiryDate],
            ['Custodian ECNO', req.assetCustodianEcno],
            ['Submitted On', req.createdAt ? new Date(req.createdAt).toLocaleDateString('en-IN') : null],
          ].filter(([, v]) => v).map(([label, val]) => (
            <div key={label} style={{ fontSize: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem' }}>{label}</span>
              <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{val}</span>
            </div>
          ))}
          {req.configuration && (
            <div style={{ fontSize: '0.75rem', gridColumn: '1 / -1' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem' }}>Configuration</span>
              <span style={{ color: '#e2e8f0', fontWeight: 500, wordBreak: 'break-word' }}>{req.configuration}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────
export default function ApprovalPending() {
  const [requests, setRequests]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [showWithdrawn, setShowWithdrawn] = useState(false);

  const fetchRequests = async (withWithdrawn = showWithdrawn) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPendingRequests(withWithdrawn);
      setRequests(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Failed to load pending requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleToggleWithdrawn = () => {
    const next = !showWithdrawn;
    setShowWithdrawn(next);
    fetchRequests(next);
  };

  const handleWithdraw = async (id) => {
    await withdrawPendingRequest(id);
    fetchRequests();
  };

  const active    = requests.filter(r => r.status !== 'Withdrawn');
  const withdrawn = requests.filter(r => r.status === 'Withdrawn');

  return (
    <div className="add-asset-container animate-fade-in">
      {/* Header */}
      <div className="section-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 className="section-title" style={{ marginBottom: '0.25rem' }}>
            Approval Pending List
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Systems you have requested to add to the ACMS list, awaiting multi-level approval.
          </p>
        </div>
        <button
          onClick={() => fetchRequests()}
          style={{
            background: 'rgba(108,99,255,0.12)', color: 'var(--accent-primary, #6c63ff)',
            border: '1px solid rgba(108,99,255,0.3)',
            borderRadius: 8, padding: '6px 14px',
            fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
          Loading your pending requests…
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 10, padding: '1rem 1.5rem', color: '#ef4444',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && active.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '4rem 2rem',
          background: 'rgba(255,255,255,0.03)', borderRadius: 14,
          border: '1.5px dashed rgba(255,255,255,0.1)',
        }}>
          <Clock size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ color: '#e2e8f0', marginBottom: '0.5rem' }}>No Pending Requests</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            You have no systems awaiting approval. Go to <strong>COINS Recommendations</strong> and click
            "+ Request Add" on a system to submit a request.
          </p>
        </div>
      )}

      {/* Active requests */}
      {!loading && !error && active.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.2rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#e2e8f0' }}>
              Active Requests
              <span style={{
                marginLeft: '0.5rem', background: 'rgba(108,99,255,0.15)',
                color: 'var(--accent-primary, #6c63ff)',
                borderRadius: 20, padding: '1px 8px', fontSize: '0.75rem', fontWeight: 700,
              }}>{active.length}</span>
            </h3>
          </div>
          {active.map(req => (
            <RequestCard key={req.id} req={req} onWithdraw={handleWithdraw} />
          ))}
        </div>
      )}

      {/* Toggle withdrawn */}
      {!loading && !error && (
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleToggleWithdrawn}
            style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8, padding: '6px 16px',
              color: 'var(--text-muted)', fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            {showWithdrawn ? '▲ Hide Withdrawn Requests' : `▼ Show Withdrawn Requests${withdrawn.length ? ` (${withdrawn.length})` : ''}`}
          </button>
          {showWithdrawn && withdrawn.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              {withdrawn.map(req => (
                <RequestCard key={req.id} req={req} onWithdraw={handleWithdraw} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
