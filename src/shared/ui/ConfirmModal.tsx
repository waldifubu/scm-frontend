import { useEffect, useId, type ReactNode } from 'react'

interface Props {
  title: string
  children: ReactNode
  /** The button that goes ahead. */
  confirmLabel: string
  /** Red where what follows cannot simply be undone by looking again. */
  danger?: boolean
  /** While the call is under way: neither button nor Escape closes the window, so its answer is not hidden. */
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * A question with two answers, in a Bootstrap modal: the text, Cancel, and a confirming button. Escape and a
 * click on the dimmed area cancel, like in any dialog. Built from the Bootstrap classes alone, as the
 * distributor window is - no script of Bootstrap's own is loaded.
 */
export function ConfirmModal({
  title,
  children,
  confirmLabel,
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [busy, onCancel])

  return (
    <>
      <div
        className="modal d-block"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !busy) onCancel()
        }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title h5" id={titleId}>
                {title}
              </h2>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={onCancel}
                disabled={busy}
              />
            </div>
            <div className="modal-body">{children}</div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onCancel}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
                onClick={onConfirm}
                disabled={busy}
                autoFocus
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  )
}
