import { useEffect, useState } from 'react';

export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const update = () => setNow(new Date());
    const interval = window.setInterval(update, intervalMs);

    window.addEventListener('focus', update);
    window.addEventListener('pageshow', update);
    document.addEventListener('visibilitychange', update);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', update);
      window.removeEventListener('pageshow', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [intervalMs]);

  return now;
}
