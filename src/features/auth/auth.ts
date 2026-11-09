import { queryOptions } from '@tanstack/react-query'
import { api, ApiError } from '../../shared/api/client'
import type { LoginRequest, UserDto } from '../../shared/api/types'

export const meQueryKey = ['me'] as const

/**
 * Who is logged in, or `null` when nobody is.
 *
 * A 401 is an answer here, not a failure: after a reload this call is the only way to learn whether
 * there is a session (the cookie is HttpOnly), so "no" has to be a value the route guard can read.
 * Anything else - the server being down, a 500 - is still an error.
 */
export async function fetchMe(): Promise<UserDto | null> {
  try {
    return await api<UserDto>('/me')
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

export const meQueryOptions = queryOptions({
  queryKey: meQueryKey,
  queryFn: fetchMe,
  // The session is the server's to end; a stale "yes" is corrected by the first 401 anywhere.
  staleTime: 5 * 60_000,
  retry: false,
})

/**
 * Logs in. The answer carries a token as well, which is deliberately not read: the session is the
 * cookie that comes with it.
 */
export async function login(credentials: LoginRequest): Promise<void> {
  await api('/auth/login', { method: 'POST', body: JSON.stringify(credentials) })
}

/** Ends the session; the answer clears the cookie. */
export async function logout(): Promise<void> {
  await api('/auth/logout')
}
