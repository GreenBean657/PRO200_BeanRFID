import React, { useEffect, useState } from 'react';
import { checkHealth } from '../services/api';
import './BackendStatus.css';

export default function BackendStatus() {
  const [dead, setDead] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkHealth().then(ok => { if (!ok) setDead(true); });
  }, []);

  if (!dead || dismissed) return null;

  return (
    <div className="backend-banner" role="alert">
      <span>
        <strong>Backend unavailable</strong> — could not reach the server. Some features may not work.
      </span>
      <button onClick={() => setDismissed(true)} aria-label="Dismiss">✕</button>
    </div>
  );
}
