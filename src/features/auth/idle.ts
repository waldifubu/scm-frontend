/**
 * How long a logged-in session may sit untouched before it is ended, and how much of that time the
 * user is asked whether they are still there.
 *
 * The timeout is the whole idle time; the prompt opens `PROMPT_BEFORE_IDLE_MS` before it runs out, so with
 * the start values the question appears after 40 s without input and the logout follows 20 s later.
 * Sixty seconds is a start value to try the behaviour out, not a final one: a working session would use
 * minutes, and it should stay well below the 15 minutes of the access token only if that is the intention.
 */
export const IDLE_TIMEOUT_MS = 60_000
export const PROMPT_BEFORE_IDLE_MS = 20_000

/** Whole seconds left on the clock, rounded up so the text never says 0 while there is time left. */
export function secondsLeft(remainingMs: number): number {
  return Math.max(0, Math.ceil(remainingMs / 1000))
}
