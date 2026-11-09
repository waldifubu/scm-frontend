import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, Outlet, useRouter } from '@tanstack/react-router'
import { logout, meQueryKey, meQueryOptions } from '../api/auth'
import { displayName } from '../api/types'
import { barStyle } from '../color'
import { AppSidebar } from './AppSidebar'

/**
 * The frame of everything behind a login: a bar with who is logged in and the way out.
 *
 * The route's `beforeLoad` keeps an anonymous visitor from getting here at all; this reacts to the
 * other case - a session that ends while the page is open. Any 401 turns the cached "who is logged
 * in" into `null` (see `queryClient`), and this sends the user to the login.
 */
export function AuthedLayout() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { data: user } = useQuery(meQueryOptions)

  const signOut = useMutation({
    mutationFn: logout,
    // Whether or not the server answered: this browser is done with the session. Dropping everything
    // cached as well, so the next person to log in here does not meet the last one's data.
    onSettled: async () => {
      queryClient.clear()
      queryClient.setQueryData(meQueryKey, null)
      await router.navigate({ to: '/login' })
    },
  })

  if (user === null) {
    return <Navigate to="/login" />
  }

  // The user's own colour is the bar's ground; nothing set, or not a CSS colour, keeps the default dark bar.
  const bar = barStyle(user?.color)
  const theme = bar?.theme ?? 'dark'

  return (
    <>
      <nav
        className={`navbar border-bottom border-body${bar ? '' : ' bg-dark'}`}
        style={bar ? { backgroundColor: bar.background } : undefined}
        data-bs-theme={theme}
      >
        <div className="container">
          <span className="navbar-brand mb-0 h1">
            <Link to="/" className="nav-link">
              Supply Chain Management
            </Link>
          </span>
          {user && (
            <div className="d-flex align-items-center gap-3">
              <span className="navbar-text">{displayName(user)}</span>
              <button
                type="button"
                className={`btn btn-sm ${theme === 'dark' ? 'btn-outline-light' : 'btn-outline-dark'}`}
                disabled={signOut.isPending}
                onClick={() => signOut.mutate()}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </nav>
      <div className="container py-4">
        <div className="authenticated-layout">
          {user && <AppSidebar user={user} />}
          <main className="authenticated-content">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  )
}
