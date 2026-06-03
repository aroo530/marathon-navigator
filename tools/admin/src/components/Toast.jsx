import { useEffect } from 'react';

export default function Toast({ message, type = 'success', onDismiss }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [message]);

  if (!message) return null;

  return (
    <div className={`toast ${type}`} onClick={onDismiss}>
      <span>{type === 'success' ? '✓' : '✗'}</span>
      <span>{message}</span>
    </div>
  );
}
