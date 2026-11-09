/**
 * The few shapes the client has needed so far, written by hand after the backend's DTOs.
 *
 * The backend describes itself in OpenAPI (`/v3/api-docs`, switched on in its dev profile); once
 * more than a handful of these exist they should be generated from that instead of kept in step by
 * hand.
 */

/** `UserDto`: who is logged in. `roles` are the enum names `@PreAuthorize` compares against. */
export interface UserDto {
  id: number
  firstName: string | null
  lastName: string | null
  username: string
  email: string
  color: string | null
  isActive: boolean
  roles: string[]
  /** The distributor rule that named this carrier in a `QUERY /users/distributors/query` answer; absent otherwise. */
  ruleId?: number
}

/** `LoginDto`. */
export interface LoginRequest {
  usernameOrEmail: string
  password: string
}

/** What a person is called: first and last name, the login only when there is neither. */
export function displayName(user: UserDto): string {
  const name = [user.firstName, user.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
  return name || user.username
}

/** Whether the user holds `role`, whether the backend names it `MANAGER` or `ROLE_MANAGER`. */
export function hasRole(user: UserDto, role: string): boolean {
  return user.roles.some((name) => name.toUpperCase().replace(/^ROLE_/, '') === role)
}
