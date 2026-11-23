import { queryOptions } from '@tanstack/react-query'
import { api } from '../../shared/api/client'
import { withPage } from '../../shared/api/pageQuery'
import type { Schemas } from '../../shared/api/types'
import type { TableSort } from '../../shared/lib/tableSort'

/** One user as `GET /users` lists them (`UserDto`); the password is never part of it. */
export type UserRow = Schemas['UserDto']

/** `GET /users`: the users plus the paging figures. */
export type UserPage = Schemas['PageResponseUserDto']

/** The columns of the table the backend can sort by (`UserController.USER_SORTABLE`); the name sorts by last name. */
export const USER_SORT_KEYS: readonly string[] = [
  'id',
  'lastName',
  'username',
  'email',
  'userType',
  'isActive',
]

/** `GET /users` for a page and a sort; no sort is the backend's own order, by id. */
export function usersPath(page: number, sort: TableSort | null = null): string {
  const key = sort !== null && USER_SORT_KEYS.includes(sort.column) ? sort.column : undefined
  const path =
    key === undefined
      ? '/users'
      : `/users?sort=${key}&order=${sort?.direction === 'desc' ? 'DESC' : 'ASC'}`
  return withPage(path, page)
}

export async function fetchUsers(page = 0, sort: TableSort | null = null): Promise<UserPage> {
  const body = await api<UserPage | UserRow[]>(usersPath(page, sort))
  if (Array.isArray(body)) return { content: body, total: body.length, page: 0, size: body.length }
  return { ...body, content: body.content ?? [] }
}

export const usersQueryOptions = (page = 0, sort: TableSort | null = null) =>
  queryOptions({
    queryKey: ['users', 'page', page, sort?.column ?? '', sort?.direction ?? ''] as const,
    queryFn: () => fetchUsers(page, sort),
  })

/**
 * The body of `PUT /users/{id}` that sets `isActive`. The backend overwrites name, login, e-mail and colour with
 * whatever the body says and answers 400 for a missing name, so they are sent as they are now; roles and password
 * are left out, which leaves them untouched.
 */
export function activeBody(user: UserRow, isActive: boolean): Schemas['UserRequestDto'] {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    ...(user.color === null ? {} : { color: user.color }),
    isActive,
  }
}

/** `PUT /users/{id}`: switches the account on or off. A disabled account can no longer log in or refresh. */
export function setUserActive(user: UserRow, isActive: boolean): Promise<UserRow> {
  return api<UserRow>(`/users/${encodeURIComponent(String(user.id))}`, {
    method: 'PUT',
    body: JSON.stringify(activeBody(user, isActive)),
  })
}

/** `GET /users/{id}`: one user, for the details below the table. */
export const userQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ['users', 'one', id] as const,
    queryFn: () => api<UserRow>(`/users/${id}`),
  })

export type UserRole = NonNullable<Schemas['UserRequestDto']['roles']>[number]

/** Every role a user can hold (`RoleEnum`), in the order the form lists them. */
export const USER_ROLES: readonly UserRole[] = [
  'ADMIN',
  'MANAGER',
  'WAREHOUSE',
  'LOGISTICS',
  'DISTRIBUTOR',
  'SUPPLIER',
  'CUSTOMER',
]

/** What the details form edits; the password is not part of it. */
export interface UserEdit {
  firstName: string
  lastName: string
  username: string
  email: string
  color: string
  isActive: boolean
  roles: UserRole[]
}

export function editOf(user: UserRow): UserEdit {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    color: user.color ?? '',
    isActive: user.isActive,
    roles: user.roles.filter((role): role is UserRole => USER_ROLES.includes(role as UserRole)),
  }
}

/**
 * The body of `PUT /users/{id}` for the details form. A blank colour is left out (the backend keeps the stored one),
 * and so is an empty role list - the backend refuses to strip a user of every role by ignoring it, so the form does
 * not offer saving none.
 */
export function editBody(edit: UserEdit): Schemas['UserRequestDto'] {
  return {
    firstName: edit.firstName.trim(),
    lastName: edit.lastName.trim(),
    username: edit.username.trim(),
    email: edit.email.trim(),
    ...(edit.color.trim() === '' ? {} : { color: edit.color.trim() }),
    isActive: edit.isActive,
    ...(edit.roles.length === 0 ? {} : { roles: edit.roles }),
  }
}

/** `PUT /users/{id}`: saves the details form. */
export function saveUser(id: number, edit: UserEdit): Promise<UserRow> {
  return api<UserRow>(`/users/${encodeURIComponent(String(id))}`, {
    method: 'PUT',
    body: JSON.stringify(editBody(edit)),
  })
}

/** `DELETE /users/{id}`: removes the account for good. */
export function deleteUser(id: number): Promise<unknown> {
  return api(`/users/${encodeURIComponent(String(id))}`, { method: 'DELETE' })
}

/** What the new-user form collects: the details form's fields plus the password the account starts with. */
export interface NewUser extends UserEdit {
  password: string
}

export const emptyNewUser: NewUser = {
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  color: '',
  isActive: true,
  roles: ['CUSTOMER'],
  password: '',
}

/** The body of `POST /users`; like `editBody`, plus the password (required on create). */
export function newUserBody(user: NewUser): Schemas['UserRequestDto'] {
  return { ...editBody(user), password: user.password }
}

/** `POST /users`: creates the account. */
export function createUser(user: NewUser): Promise<UserRow> {
  return api<UserRow>('/users', { method: 'POST', body: JSON.stringify(newUserBody(user)) })
}

/** `POST /users/{id}/promote`: makes the user an administrator - the type and the roles, ADMIN being the only one left. */
export function promoteUser(id: number): Promise<UserRow> {
  return api<UserRow>(`/users/${encodeURIComponent(String(id))}/promote`, { method: 'POST' })
}

/** `POST /users/{id}/demote`: takes an administrator back to one ordinary role (never ADMIN). */
export function demoteUser(id: number, role: UserRole): Promise<UserRow> {
  return api<UserRow>(`/users/${encodeURIComponent(String(id))}/demote`, {
    method: 'POST',
    body: JSON.stringify({ role }),
  })
}
