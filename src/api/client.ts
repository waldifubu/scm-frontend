/**
 * The one place that talks HTTP to the backend.
 *
 * Every path is relative to the versioned API root, so a version change is one constant. The session
 * is the HttpOnly cookie the login sets: JavaScript never sees the token, the browser sends the cookie
 * by itself, and that is why every call asks for `credentials: 'include'`.
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

export async function api<T = void>(path: string, init: RequestInit = {}): Promise<T> {
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
  const body = text === '' ? undefined : parse(text)

  if (!response.ok) {
    throw new ApiError(
      response.status,
      messageOf(body) ?? (response.statusText || `The server answered ${response.status}.`),
      body,
    )
  }
  return body as T
}
