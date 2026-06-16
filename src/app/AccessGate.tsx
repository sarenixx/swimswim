import { FormEvent, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import logoUrl from '../assets/logo.webp';

const configuredAccessHash = (import.meta.env.VITE_SITE_ACCESS_SHA256 as string | undefined)?.trim().toLowerCase();
const defaultBypass = import.meta.env.MODE === 'test';

type AccessGateProps = {
  accessHash?: string;
  bypass?: boolean;
  children: ReactNode;
};

async function sha256Hex(value: string) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Secure password check is unavailable in this browser.');
  }

  const bytes = new TextEncoder().encode(value);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function getSessionKey(accessHash: string) {
  return accessHash ? `swim-california-access-${accessHash.slice(0, 12)}` : 'swim-california-access-unconfigured';
}

function hasSessionUnlock(accessHash: string, sessionKey: string) {
  try {
    return Boolean(accessHash && globalThis.sessionStorage?.getItem(sessionKey) === 'true');
  } catch {
    return false;
  }
}

function saveSessionUnlock(sessionKey: string) {
  try {
    globalThis.sessionStorage?.setItem(sessionKey, 'true');
  } catch {
    // The access gate still unlocks for this page load if session storage is unavailable.
  }
}

export function AccessGate({ accessHash = configuredAccessHash, bypass = defaultBypass, children }: AccessGateProps) {
  const normalizedAccessHash = accessHash?.trim().toLowerCase() ?? '';
  const sessionKey = useMemo(() => getSessionKey(normalizedAccessHash), [normalizedAccessHash]);
  const [entry, setEntry] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [unlocked, setUnlocked] = useState(() => bypass || hasSessionUnlock(normalizedAccessHash, sessionKey));
  const isConfigured = Boolean(normalizedAccessHash);

  const statusCopy = useMemo(() => {
    if (!isConfigured) {
      return 'Access code is not configured.';
    }

    return 'Enter access code';
  }, [isConfigured]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isConfigured || checking) {
      return;
    }

    setChecking(true);
    setError('');

    try {
      const candidateHash = await sha256Hex(entry);
      if (candidateHash === normalizedAccessHash) {
        saveSessionUnlock(sessionKey);
        setUnlocked(true);
        return;
      }

      setError('Incorrect access code.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to check access code.');
    } finally {
      setChecking(false);
    }
  };

  if (unlocked) {
    return children;
  }

  return (
    <main className="access-gate">
      <form className="access-card" onSubmit={submit}>
        <img src={logoUrl} alt="Swim California" />
        <div>
          <p className="page-kicker">Protected Record</p>
          <h1 className="access-title">Swim California</h1>
        </div>
        <label className="field-label">
          {statusCopy}
          <input
            autoComplete="current-password"
            autoFocus
            className="input"
            disabled={!isConfigured}
            onChange={(event) => setEntry(event.target.value)}
            type="password"
            value={entry}
          />
        </label>
        {error ? <p className="access-error">{error}</p> : null}
        <button className="button primary" disabled={!isConfigured || checking || !entry} type="submit">
          {checking ? 'Checking' : 'Unlock'}
        </button>
      </form>
    </main>
  );
}
