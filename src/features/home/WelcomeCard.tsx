import { useQuery } from '@tanstack/react-query'
import { meQueryOptions } from '../auth/auth'
import { displayName } from '../../shared/api/types'

/** Who is logged in and with which roles. */
export function WelcomeCard() {
  const { data: user } = useQuery(meQueryOptions)
  if (!user) return null

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h2 className="h4">Welcome, {displayName(user)}</h2>
        <p className="text-body-secondary mb-2">You are signed in with the roles</p>
        <p className="mb-0">
          {user.roles.length === 0 ? (
            <span className="text-body-secondary">none</span>
          ) : (
            user.roles.map((role) => (
              <span key={role} className="badge text-bg-secondary me-1">
                {role}
              </span>
            ))
          )}
        </p>
      </div>
    </div>
  )
}
