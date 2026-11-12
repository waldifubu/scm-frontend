import { useEffect, useId, useState } from 'react'
import { useIdleTimer } from 'react-idle-timer'
import { IDLE_TIMEOUT_MS, PROMPT_BEFORE_IDLE_MS, secondsLeft } from './idle'

/**
 * Ends the session after a stretch without input. Rendered only behind a login (inside `AuthedLayout`), so
 * the timer exists exactly as long as there is a session to end.
 *
 * Shortly before the end a window asks whether the user is still there: "Stay signed in" starts the clock
 * again, "Sign out now" and the clock running out both call `onIdle` - the same sign-out as the button in the
 * bar. While the window is open, mouse and keys do not count as activity (the library ignores them once
 * prompted), so only an answer keeps the session.
 */
export function IdleLogout({ onIdle }: { onIdle: () => void }) {
  const titleId = useId()
  const [prompted, setPrompted] = useState(false)
  const [seconds, setSeconds] = useState(0)

  const idle = useIdleTimer({
    timeout: IDLE_TIMEOUT_MS,
    promptBeforeIdle: PROMPT_BEFORE_IDLE_MS,
    onPrompt: () => setPrompted(true),
    onActive: () => setPrompted(false),
    onIdle: () => {
      setPrompted(false)
      onIdle()
    },
    // The session is over once idle; nothing to restart until the next login mounts this again.
    stopOnIdle: true,
  })

  useEffect(() => {
    if (!prompted) return
    const tick = () => setSeconds(secondsLeft(idle.getRemainingTime()))
    tick()
    const timer = setInterval(tick, 250)
    return () => clearInterval(timer)
  }, [prompted, idle])

  if (!prompted) return null

  return (
    <>
      <div
        className="modal d-block"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title h5" id={titleId}>
                Still there?
              </h2>
            </div>
            <div className="modal-body" role="status">
              You will be signed out in{' '}
              <b>
                {seconds} second{seconds === 1 ? '' : 's'}
              </b>{' '}
              because nothing was done for a while.
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onIdle}>
                Sign out now
              </button>
              <button
                type="button"
                className="btn btn-success"
                onClick={() => idle.activate()}
                autoFocus
              >
                Stay signed in
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  )
}
