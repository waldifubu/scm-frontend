/**
 * How long a logged-in session may sit untouched before it is ended, and how much of that time the
 * user is asked whether they are still there.
 *
 * The timeout is the whole idle time; the prompt opens `PROMPT_BEFORE_IDLE_MS` before it runs out, so with
 * the current values the question appears after 9 minutes without input and the logout follows 60 s later.
 * Ten minutes is still a value to try, not a final one; the access token lasts 15 minutes and a refresh
 * token renews it, so the idle time is what actually ends a session.
 */
export const IDLE_TIMEOUT_MS = 600_000
export const PROMPT_BEFORE_IDLE_MS = 60_000

/** Whole seconds left on the clock, rounded up so the text never says 0 while there is time left. */
export function secondsLeft(remainingMs: number): number {
  return Math.max(0, Math.ceil(remainingMs / 1000))
}
