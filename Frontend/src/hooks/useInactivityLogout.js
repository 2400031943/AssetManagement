import { useEffect, useRef, useCallback } from 'react';

/**
 * useInactivityLogout
 * ───────────────────
 * Tracks user activity (mouse, keyboard, touch, scroll).
 * After `timeoutMs` of inactivity, calls `onLogout`.
 * At `warningMs` before logout, calls `onWarn` so the UI can show a countdown.
 * Any user activity resets the timer and calls `onActive` to dismiss the warning.
 *
 * @param {object} opts
 * @param {number}   opts.timeoutMs  - Total inactivity time before logout  (default 30 min)
 * @param {number}   opts.warningMs  - How early to show the warning         (default 5 min)
 * @param {function} opts.onLogout   - Called when the timeout fires
 * @param {function} opts.onWarn     - Called when the warning period starts
 * @param {function} opts.onActive   - Called when activity resets the timer
 */
export default function useInactivityLogout({
  timeoutMs = 30 * 60 * 1000,   // 30 minutes
  warningMs = 5  * 60 * 1000,   //  5 minutes before logout
  onLogout,
  onWarn,
  onActive,
}) {
  const logoutTimer  = useRef(null);
  const warningTimer = useRef(null);
  const warned       = useRef(false);

  const clearTimers = useCallback(() => {
    if (logoutTimer.current)  clearTimeout(logoutTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);
  }, []);

  const resetTimers = useCallback(() => {
    clearTimers();

    // If warning was showing, dismiss it
    if (warned.current) {
      warned.current = false;
      onActive?.();
    }

    // Schedule warning
    warningTimer.current = setTimeout(() => {
      warned.current = true;
      onWarn?.();
    }, timeoutMs - warningMs);

    // Schedule logout
    logoutTimer.current = setTimeout(() => {
      onLogout?.();
    }, timeoutMs);
  }, [clearTimers, timeoutMs, warningMs, onLogout, onWarn, onActive]);

  useEffect(() => {
    // Activity events that reset the timer
    const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click', 'wheel'];

    const handleActivity = () => resetTimers();

    // Add listeners (passive for performance)
    EVENTS.forEach(ev =>
      window.addEventListener(ev, handleActivity, { passive: true })
    );

    // Start the timers immediately on mount
    resetTimers();

    return () => {
      EVENTS.forEach(ev => window.removeEventListener(ev, handleActivity));
      clearTimers();
    };
  }, [resetTimers, clearTimers]);
}
