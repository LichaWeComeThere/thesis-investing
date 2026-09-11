import { useEffect, useId, useRef } from 'react';
import { Button } from './Button';

/** Native modal semantics provide focus trapping and keep the background inert. */
export function DraftLeaveDialog({ title, description, errors, busy, onSave, onDiscard, onStay, saveLabel = 'Save and leave', stayLabel = 'Continue editing', saveDisabled = false, busyLabel = 'Please wait…', stayDisabled = false }: {
  title: string;
  description: string;
  errors: readonly string[];
  busy: boolean;
  onSave: () => void;
  onDiscard?: () => void;
  onStay: () => void;
  saveLabel?: string;
  stayLabel?: string;
  saveDisabled?: boolean;
  busyLabel?: string;
  stayDisabled?: boolean;
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
  useEffect(() => {
    if (!busy) {
      if (stayDisabled && !saveDisabled) dialogRef.current?.querySelector<HTMLButtonElement>('[data-dialog-save]')?.focus();
      else if (saveDisabled && !stayDisabled) stayRef.current?.focus();
    }
  }, [busy, stayDisabled, saveDisabled]);
  return (
    <dialog ref={dialogRef} className="living-thesis-leave-dialog" aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`} onCancel={(event) => { event.preventDefault(); if (!busy && !stayDisabled) onStay(); }}>
      <h2 id={`${id}-title`}>{title}</h2>
      <p id={`${id}-description`}>{description}</p>
      {errors.length > 0 ? <div role="alert">{errors.map((error) => <p key={error}>{error}</p>)}</div> : null}
      <div className="living-thesis-leave-actions">
        <Button type="button" data-dialog-save disabled={busy || saveDisabled} onClick={onSave}>{busy ? busyLabel : saveLabel}</Button>
        {onDiscard ? <Button type="button" variant="secondary" disabled={busy} onClick={onDiscard}>Discard edits and leave</Button> : null}
        <button type="button" className="living-thesis-continue" ref={stayRef} disabled={busy || stayDisabled} onClick={onStay}>{stayLabel}</button>
      </div>
    </dialog>
  );
}
