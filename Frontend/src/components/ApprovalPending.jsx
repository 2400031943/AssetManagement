import React from 'react';
import { Clock } from 'lucide-react';
import './Dashboard.css';

export default function ApprovalPending() {
  return (
    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
      <Clock size={48} style={{ color: 'var(--accent-primary, #6c63ff)', marginBottom: '1rem' }} />
      <h2>Approval Pending List</h2>
      <p style={{ color: 'var(--text-muted)' }}>
        Your pending requests will appear here. This feature is currently under development.
      </p>
    </div>
  );
}
