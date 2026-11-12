import type { components } from './schema'

/** Every schema of the backend's OpenAPI description, generated into `schema.d.ts` (`pnpm api:types`). */
export type Schemas = components['schemas']

/**
 * Shapes the client uses, taken from the backend's OpenAPI description (`Schemas`, generated into
 * `schema.d.ts`, see AGENTS.md). Only what has behaviour of its own is written here.
 */

/** `UserDto`: who is logged in. `roles` are the enum names `@PreAuthorize` compares against. */
export type UserDto = Schemas['UserDto']

/** `LoginRequest`, as the backend describes it. */
export type LoginRequest = Schemas['LoginRequest']

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
