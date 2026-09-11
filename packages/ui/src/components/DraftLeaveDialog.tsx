import { useEffect, useId, useRef } from 'react';
import { Button } from './Button';

/** Native modal semantics provide focus trapping and keep the background inert. */
export function DraftLeaveDialog({ title, description, errors, busy, onSave, onDiscard, onStay, saveLabel = 'Save and leave' }: {
  title: string;
  description: string;
  errors: readonly string[];
  busy: boolean;
  onSave: () => void;
  onDiscard?: () => void;
  onStay: () => void;
  saveLabel?: string;
}): JSX.Element {
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stayRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previous = document.activeElement;
    dialog?.showModal();
    stayRef.current?.focus();
    return () => {
      dialog?.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog ref={dialogRef} className="living-thesis-leave-dialog" aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`} onCancel={(event) => { event.preventDefault(); if (!busy) onStay(); }}>
      <h2 id={`${id}-title`}>{title}</h2>
      <p id={`${id}-description`}>{description}</p>
      {errors.length > 0 ? <div role="alert">{errors.map((error) => <p key={error}>{error}</p>)}</div> : null}
      <div className="living-thesis-leave-actions">
        <Button type="button" disabled={busy} onClick={onSave}>{busy ? 'Please wait…' : saveLabel}</Button>
        {onDiscard ? <Button type="button" variant="secondary" disabled={busy} onClick={onDiscard}>Discard edits and leave</Button> : null}
        <button type="button" className="living-thesis-continue" ref={stayRef} disabled={busy} onClick={onStay}>Continue editing</button>
      </div>
    </dialog>
  );
}
