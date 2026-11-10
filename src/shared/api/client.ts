/**
 * The one place that talks HTTP to the backend.
 *
 * Every path is relative to the versioned API root, so a version change is one constant. The session
 * is the HttpOnly cookie the login sets: JavaScript never sees the token, the browser sends the cookie
 * by itself, and that is why every call asks for `credentials: 'include'`.
 *
 * The access token is short (15 minutes). A second HttpOnly cookie, the refresh token, buys a new one
 * without a password: a 401 is therefore answered with one `POST /auth/refresh` and the call repeated -
 * only when that fails as well is the session over. See `refreshSession`.
 */
export const API_BASE = '/api/1.0'

/** A call the server answered with an error status, or did not answer at all (`status` 0). */
export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

/**
 * What a person should read out of an error body. The backend answers `ErrorDetails`
 * (`{ message, ... }`), a failed bean validation as a map of field to message, and Spring's own
 * rejections (a malformed path, say) as problem details (`{ detail, ... }`).
 */
function messageOf(body: unknown): string | undefined {
  if (typeof body === 'string' && body.trim() !== '') return body
  if (typeof body !== 'object' || body === null) return undefined

  const record = body as Record<string, unknown>
  if (typeof record.message === 'string') return record.message
  if (typeof record.detail === 'string') return record.detail

  const firstFieldMessage = Object.values(record).find((value) => typeof value === 'string')
  return typeof firstFieldMessage === 'string' ? firstFieldMessage : undefined
}

function parse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/** Calls that must never trigger a refresh: they are how a session starts, renews or ends. */
const NO_REFRESH = new Set(['/auth/login', '/auth/refresh', '/auth/logout'])

/**
 * The refresh in flight, shared: a page fires many calls, and when the access token ends they all see a
 * 401 at the same moment.
 */
let refreshing: Promise<boolean> | undefined

/**
 * Asks the server for a new access token. Resolves `true` when it got one and `false` for any other answer
 * (401: the refresh token is gone or was replayed; 403: the account is disabled; or the server cannot be
 * reached) - the caller then reports its own 401.
 *
 * Parallel callers wait for one request, not one each: the server retires a refresh token when it is used,
 * so a second request with the same cookie would be a replay.
 */
export function refreshSession(): Promise<boolean> {
  refreshing ??= fetch(API_BASE + '/auth/refresh', {
    method: 'POST',
    headers: { Accept: 'application/json' },
    credentials: 'include',
  })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = undefined
    })
  return refreshing
}

async function send(
  path: string,
  init: RequestInit,
): Promise<{ response: Response; body: unknown }> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(API_BASE + path, { ...init, headers, credentials: 'include' })
  } catch (cause) {
    throw new ApiError(0, 'The server cannot be reached.', cause)
  }

  const text = await response.text()
  return { response, body: text === '' ? undefined : parse(text) }
}

export async function api<T = void>(path: string, init: RequestInit = {}): Promise<T> {
  let { response, body } = await send(path, init)

  // The session may only have run out of access token: renew it and repeat the call - once, so a refresh
  // that "works" but does not help cannot loop. The path is looked at without its query string.
  const bare = path.split('?')[0] ?? path
  if (response.status === 401 && !NO_REFRESH.has(bare) && (await refreshSession())) {
    ;({ response, body } = await send(path, init))
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      messageOf(body) ?? (response.statusText || `The server answered ${response.status}.`),
      body,
    )
  }
  return body as T
}
