import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Clock, LogIn } from 'lucide-react';

/**
 * InactivityWarning
 * ─────────────────
 * Modal shown when the user has been inactive and logout is approaching.
 * Shows a live countdown. "Stay Logged In" resets the activity timer.
 *
 * Props:
 *   visible      - boolean, whether to show the modal
 *   secondsLeft  - initial seconds remaining before logout (default 300 = 5 min)
 *   onStayIn     - called when user clicks "Stay Logged In"
 *   onLogout     - called immediately if user clicks "Logout Now"
 */
export default function InactivityWarning({ visible, secondsLeft = 300, onStayIn, onLogout }) {
  const [remaining, setRemaining] = useState(secondsLeft);
  const intervalRef = useRef(null);

  // Reset and start countdown whenever the modal becomes visible
  useEffect(() => {
    if (!visible) {
      clearInterval(intervalRef.current);
      setRemaining(secondsLeft);
      return;
    }
    setRemaining(secondsLeft);
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [visible, secondsLeft]);

  if (!visible) return null;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const timeStr = mins > 0
    ? `${mins}m ${String(secs).padStart(2, '0')}s`
    : `${secs}s`;

  // Progress bar — goes from full to empty as time runs out
  const pct = Math.max(0, (remaining / secondsLeft) * 100);
  const barColour = pct > 50 ? '#f59e0b' : pct > 20 ? '#f97316' : '#ef4444';

  return (
    /* Backdrop */
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease',
    }}>
      {/* Card */}
      <div style={{
        background: '#1e1b2e',
        border: '1.5px solid rgba(245,158,11,0.45)',
        borderRadius: 18,
        padding: '2rem 2.2rem',
        maxWidth: 420,
        width: '90%',
        boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
        textAlign: 'center',
      }}>
        {/* Icon */}
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          background: 'rgba(245,158,11,0.15)',
          border: '2px solid rgba(245,158,11,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.2rem',
        }}>
          <AlertTriangle size={28} color="#f59e0b" />
        </div>

        {/* Title */}
        <h2 style={{ color: '#f1f5f9', fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Still there?
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          You've been inactive for a while. You'll be automatically logged out in:
        </p>

        {/* Countdown */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          marginBottom: '1rem',
        }}>
          <Clock size={18} color={barColour} />
          <span style={{
            fontFamily: 'monospace', fontSize: '2rem', fontWeight: 800,
            color: barColour, letterSpacing: '0.05em',
            transition: 'color 0.5s',
          }}>
            {timeStr}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{
          height: 6, background: 'rgba(255,255,255,0.08)',
          borderRadius: 99, overflow: 'hidden', marginBottom: '1.75rem',
        }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: `linear-gradient(90deg, ${barColour}, ${barColour}cc)`,
            borderRadius: 99, transition: 'width 1s linear, background 0.5s',
          }} />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onLogout}
            style={{
              flex: 1, padding: '0.65rem',
              background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.3)',
              borderRadius: 10, color: '#f87171', fontWeight: 600, fontSize: '0.88rem',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
          >
            Logout Now
          </button>
          <button
            onClick={onStayIn}
            style={{
              flex: 2, padding: '0.65rem',
              background: 'linear-gradient(135deg, #6c63ff, #a855f7)',
              border: 'none', borderRadius: 10,
              color: '#fff', fontWeight: 700, fontSize: '0.88rem',
              cursor: 'pointer', transition: 'opacity 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <LogIn size={16} /> Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
}
