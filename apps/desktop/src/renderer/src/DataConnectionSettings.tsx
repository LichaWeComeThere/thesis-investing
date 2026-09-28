import { Button, Card, DraftLeaveDialog } from '@thesis-investing/ui';
import { useEffect, useId, useRef, useState } from 'react';
import type { ConnectionErrorCode, ConnectionStatus, DataConnectionApi } from '../../shared/companyDetails';
import './data-connection-settings.css';

export type DataConnectionNavigationRequest = {
  destination: string;
  onLeave: () => void;
  onStay: () => void;
};

type DataConnectionSettingsProps = {
  api?: DataConnectionApi | null;
  navigationRequest?: DataConnectionNavigationRequest;
};

function getDefaultApi(): DataConnectionApi | null {
  return typeof window === 'undefined' ? null : window.thesisInvesting?.dataConnection ?? null;
}

function connectionError(code?: ConnectionErrorCode): string {
  if (code === 'invalid-key') return 'Enter your API key again using 1–256 characters with no spaces.';
  if (code === 'secure-storage-unavailable') return 'Protected key storage is unavailable. Try again when it is available, then enter your key again.';
  return 'The connection settings could not be updated. Your saved research is unaffected. Try again.';
}

/** Keys stay in this transient input until submitted through the narrow preload API. */
export function DataConnectionSettings({ api = getDefaultApi(), navigationRequest }: DataConnectionSettingsProps): JSX.Element {
  const inputId = useId();
  const helpId = useId();
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [key, setKey] = useState('');
  const [activity, setActivity] = useState<'status' | 'save' | 'remove' | null>(api ? 'status' : null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [failedSubmission, setFailedSubmission] = useState(false);
  const [statusAttempt, setStatusAttempt] = useState(0);
  const sequence = useRef(0);
  const writeInFlight = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const current = ++sequence.current;
    let disposed = false;
    // Invalidate every async operation started in this component, including writes.
    const invalidatePendingOperations = (): void => { sequence.current++; };
    setKey('');
    setStatus(null);
    setError(null);
    setNotice(null);
    setFailedSubmission(false);
    setActivity(api ? 'status' : null);
    if (api) {
      void api.status().then((result) => {
        if (disposed || current !== sequence.current) return;
        if (result.ok) setStatus(result.value);
        else setError(connectionError(result.error.code));
      }).catch(() => {
        if (!disposed && current === sequence.current) setError('Connection status could not be read. Your saved research is unaffected. Try again.');
      }).finally(() => {
        if (!disposed && current === sequence.current) setActivity(null);
      });
    }
    return () => { disposed = true; invalidatePendingOperations(); };
  }, [api, statusAttempt]);

  const isWriting = activity === 'save' || activity === 'remove';
  const hasDraft = key.length > 0;
  const hasGuard = hasDraft || isWriting || failedSubmission;
  useEffect(() => {
    if (navigationRequest && !hasGuard) navigationRequest.onLeave();
  }, [navigationRequest, hasGuard]);

  useEffect(() => {
    if (!hasDraft && !isWriting) return;
    const preventUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', preventUnload);
    return () => window.removeEventListener('beforeunload', preventUnload);
  }, [hasDraft, isWriting]);

  const canSave = Boolean(api && status?.secureStorageAvailable && !activity && hasDraft);
  const canRemove = Boolean(api && !activity && (status?.configured || error || status?.secureStorageAvailable === false));

  async function saveKey(): Promise<void> {
    if (!canSave || !api || writeInFlight.current) return;
    const submittedKey = key;
    // Clear on submission, including rejected format; never repopulate from a result.
    setKey('');
    setError(null);
    setNotice(null);
    if (!/^[\x21-\x7e]{1,256}$/.test(submittedKey)) {
      setError(connectionError('invalid-key'));
      setFailedSubmission(true);
      inputRef.current?.focus();
      return;
    }
    writeInFlight.current = true;
    setActivity('save');
    setFailedSubmission(false);
    const current = ++sequence.current;
    try {
      const result = await api.saveKey(submittedKey);
      if (current !== sequence.current) return;
      if (result.ok) {
        setStatus(result.value);
        setNotice('Key saved on this device. It has not been checked with Alpha Vantage.');
      } else {
        setError(connectionError(result.error.code));
        setFailedSubmission(true);
      }
    } catch {
      if (current !== sequence.current) return;
      setError('The key could not be saved. Enter it again and retry. Your saved research is unaffected.');
      setFailedSubmission(true);
    } finally {
      writeInFlight.current = false;
      if (current === sequence.current) setActivity(null);
    }
  }

  async function removeConnection(): Promise<void> {
    if (!canRemove || !api || writeInFlight.current) return;
    writeInFlight.current = true;
    setKey('');
    setError(null);
    setNotice(null);
    setFailedSubmission(false);
    setActivity('remove');
    const current = ++sequence.current;
    try {
      const result = await api.remove();
      if (current !== sequence.current) return;
      if (result.ok) {
        setStatus(result.value);
        setNotice('Connection removed. Your saved research is unchanged.');
      } else {
        setError(connectionError(result.error.code));
        setFailedSubmission(true);
      }
    } catch {
      if (current !== sequence.current) return;
      setError('The connection could not be removed. Your saved research is unaffected. Try again.');
      setFailedSubmission(true);
    } finally {
      writeInFlight.current = false;
      if (current === sequence.current) setActivity(null);
    }
  }

  return (
    <Card title="Data connection" className="data-connection-settings">
      <div className="data-connection-settings-content">
        <p>Optional company details from Alpha Vantage. Your theses work without a connection.</p>
        <p>For personal research with your own Alpha Vantage key. Check that your account permits this use.</p>
        {!api ? <p className="local-data-status-message" role="status">Data connection settings are available in the desktop app.</p> : (
          <>
            <p role="status"><strong>{activity === 'status' ? 'Checking saved connection…' : status?.configured ? 'Key saved on this device' : status ? 'No key saved' : 'Connection status unavailable'}</strong></p>
            {status?.secureStorageAvailable === false ? <p className="local-data-status-error">Protected key storage is unavailable on this device. Key entry is disabled; you can still remove the connection.</p> : null}
            {status?.adapterAvailable === false ? <p>Company lookups are not available in this version.</p> : null}
            <form className="data-connection-key-form" onSubmit={(event) => { event.preventDefault(); void saveKey(); }}>
              <label htmlFor={inputId}>Alpha Vantage API key</label>
              <input id={inputId} ref={inputRef} type="password" value={key} autoComplete="off" autoCapitalize="none" spellCheck={false}
                aria-describedby={helpId} disabled={!status?.secureStorageAvailable || Boolean(activity)} maxLength={256}
                onChange={(event) => { setKey(event.target.value); setFailedSubmission(false); setError(null); setNotice(null); }} />
              <p id={helpId}>Stored encrypted on this device. Saving checks the key’s format, not provider access. To replace a saved key, enter the new one.</p>
              <div className="data-connection-settings-actions">
                <Button type="submit" disabled={!canSave}>{activity === 'save' ? 'Saving key…' : 'Save key'}</Button>
                <Button type="button" variant="secondary" disabled={!canRemove} onClick={() => { void removeConnection(); }}>{activity === 'remove' ? 'Removing connection…' : 'Remove connection'}</Button>
                {!status && error ? <Button type="button" variant="secondary" disabled={Boolean(activity)} onClick={() => setStatusAttempt((attempt) => attempt + 1)}>Retry connection status</Button> : null}
              </div>
            </form>
          </>
        )}
        {error ? <p className="local-data-status-error" role="alert">{error}</p> : null}
        {notice ? <p className="local-data-status-message" role="status">{notice}</p> : null}
        <p className="data-connection-settings-help">Company details load only when you ask in a saved thesis. Only its ticker is sent to Alpha Vantage; your thesis writing is not sent. Details last for this app session. Keys and company details are excluded from research backups.</p>
      </div>
      {navigationRequest && hasGuard ? (
        <DraftLeaveDialog title="Unsaved connection changes"
          description={`Save your key before opening ${navigationRequest.destination}, discard it, or continue editing.`}
          errors={error ? [error] : []} busy={isWriting} busyLabel={activity === 'remove' ? 'Removing connection…' : 'Saving key…'}
          saveDisabled={!canSave} onSave={() => { void saveKey(); }}
          onDiscard={() => {
            if (writeInFlight.current) return;
            setKey(''); setFailedSubmission(false); navigationRequest.onLeave();
          }} onStay={() => {
            if (writeInFlight.current) return;
            setFailedSubmission(false); navigationRequest.onStay();
          }} />
      ) : null}
    </Card>
  );
}
