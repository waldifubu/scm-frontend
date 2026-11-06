import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearch } from '@tanstack/react-router'
import { useRef, useState, type SubmitEvent } from 'react'
import { fetchMe, login, meQueryKey } from '../api/auth'
import { ApiError } from '../api/client'
import { safeRedirect } from '../redirect'

/**
 * What the person is told. A 401 on the login call means the credentials were wrong - the status does
 * not say which of the two, and neither does the server (an unknown user and a wrong password answer
 * alike), so neither does this. A 403 is an account that exists but may not log in; the server's own
 * words say whether it is disabled or locked.
 */
function describe(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Wrong username, e-mail address or password.'
    if (error.status === 429) return 'Too many attempts. Wait a moment and try again.'
    return error.message
  }
  return error instanceof Error ? error.message : 'Something went wrong.'
}

export function LoginPage() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { redirect } = useSearch({ from: '/login' })
  const passwordRef = useRef<HTMLInputElement>(null)
  const [validated, setValidated] = useState(false)

  const signIn = useMutation({
    mutationFn: async (credentials: { usernameOrEmail: string; password: string }) => {
      await login(credentials)
      // The login answer says who, but only as one role; /me is what the rest of the application reads.
      const me = await fetchMe()
      if (!me) throw new Error('Logged in, but the server did not accept the session. Is the cookie blocked?')
      return me
    },
    onSuccess: (me) => {
      queryClient.setQueryData(meQueryKey, me)
      router.history.push(safeRedirect(redirect))
    },
    onError: () => {
      // Ready to be typed over, the user name stays.
      passwordRef.current?.focus()
      passwordRef.current?.select()
    },
  })

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    if (!form.checkValidity()) {
      setValidated(true)
      return
    }
    const data = new FormData(form)
    signIn.mutate({
      usernameOrEmail: String(data.get('usernameOrEmail')).trim(),
      password: String(data.get('password')),
    })
  }

  return (
    <main className="min-vh-100 d-flex align-items-center justify-content-center bg-body-tertiary p-3">
      <div className="card shadow-sm w-100" style={{ maxWidth: '24rem' }}>
        <div className="card-body p-4">
          <h1 className="h4 mb-1">Supply Chain Management</h1>
          <p className="text-body-secondary mb-4">Sign in to continue</p>

          {signIn.isError && (
            <div className="alert alert-danger py-2" role="alert">
              {describe(signIn.error)}
            </div>
          )}

          <form noValidate className={validated ? 'was-validated' : undefined} onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="usernameOrEmail" className="form-label">
                Username or e-mail
              </label>
              <input
                id="usernameOrEmail"
                name="usernameOrEmail"
                type="text"
                className="form-control"
                autoComplete="username"
                autoFocus
                required
              />
              <div className="invalid-feedback">Enter your username or e-mail address.</div>
            </div>

            <div className="mb-4">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="form-control"
                autoComplete="current-password"
                ref={passwordRef}
                required
              />
              <div className="invalid-feedback">Enter your password.</div>
            </div>

            <button type="submit" className="btn btn-primary w-100" disabled={signIn.isPending}>
              {signIn.isPending && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
              Sign in
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
