import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { meQueryOptions } from '../auth/auth'
import {
  createUser,
  deleteUser,
  emptyNewUser,
  demoteUser,
  editOf,
  promoteUser,
  saveUser,
  setUserActive,
  USER_ROLES,
  userQueryOptions,
  type NewUser,
  type UserRole,
  type UserEdit,
  usersQueryOptions,
  type UserRow,
} from './users'
import { displayName, hasRole } from '../../shared/api/types'
import { badgeTextColor, toHex } from '../../layout/color'
import { PageTitle } from '../../layout/PageTitle'
import { Chevron } from '../../shared/ui/Chevron'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'
import { Pager } from '../../shared/ui/Pager'
import { SortableHeader } from '../../shared/ui/SortableHeader'
import { nextSort, type TableSort } from '../../shared/lib/tableSort'
import { LoadingBar } from '../../shared/ui/LoadingBar'

/**
 * All users (`GET /users`), for admins only: the backend answers every other role with a 403, so the page says so
 * instead of asking.
 */
export function UsersPage() {
  const { data: me } = useQuery(meQueryOptions)
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [sort, setSort] = useState<TableSort | null>(null)
  const isAdmin = !!me && hasRole(me, 'ADMIN')
  const { data, isPending, error } = useQuery({
    ...usersQueryOptions(page, sort),
    enabled: isAdmin,
  })
  const toggle = useMutation({
    mutationFn: (user: UserRow) => setUserActive(user, !user.isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
  const onSort = (column: string) => {
    setSort((current) => nextSort(current, column))
    setPage(0)
  }
  if (!me) return null
  if (!isAdmin) return <p className="text-danger">Only admins may see the users.</p>

  return (
    <>
      <div className="card shadow-sm">
        <div className="card-body">
          <PageTitle icon="users">Users</PageTitle>
        </div>
        {isPending && <LoadingBar label="Loading users…" />}
        {error && <p className="p-3 mb-0 text-danger">{error.message}</p>}
        {toggle.error && <p className="p-3 mb-0 text-danger">{toggle.error.message}</p>}
        {data && data.content.length === 0 && (
          <p className="p-3 mb-0 text-body-secondary">No users.</p>
        )}
        {data && data.content.length > 0 && (
          <>
            <div className="table-responsive">
              <table className="table table-striped table-sm mb-0">
                <thead>
                  <tr>
                    <SortableHeader label="id" column="id" sort={sort} onSort={onSort} />
                    <SortableHeader label="name" column="lastName" sort={sort} onSort={onSort} />
                    <SortableHeader
                      label="username"
                      column="username"
                      sort={sort}
                      onSort={onSort}
                    />
                    <SortableHeader label="email" column="email" sort={sort} onSort={onSort} />
                    <SortableHeader
                      label="main role"
                      column="userType"
                      sort={sort}
                      onSort={onSort}
                    />
                    <SortableHeader label="active" column="isActive" sort={sort} onSort={onSort} />
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((user) => {
                    const textColor = badgeTextColor(user.color)
                    return (
                      <tr
                        key={user.id}
                        className={user.id === selectedId ? 'table-active' : undefined}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedId(user.id)}
                      >
                        <td>{user.id}</td>
                        <td>{displayName(user)}</td>
                        <td>{user.username}</td>
                        <td>{user.email}</td>
                        <td>
                          <span className="d-flex align-items-center gap-2">
                            <span
                              className={`badge${textColor ? '' : ' bg-primary-subtle text-primary-emphasis'}`}
                              style={
                                textColor
                                  ? { backgroundColor: user.color ?? undefined, color: textColor }
                                  : undefined
                              }
                            >
                              {user.userType}
                            </span>
                            <span
                              className="text-body-secondary small"
                              title={`${user.roles.length} ${user.roles.length === 1 ? 'role' : 'roles'}: ${user.roles.join(', ')}`}
                            >
                              {user.roles.length}
                            </span>
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`badge border-0 ${
                              user.isActive
                                ? 'bg-success-subtle text-success-emphasis'
                                : 'bg-danger text-white'
                            }`}
                            title={
                              user.id === me.id
                                ? 'You cannot disable yourself'
                                : user.isActive
                                  ? 'Click to disable'
                                  : 'Click to enable'
                            }
                            disabled={user.id === me.id || toggle.isPending}
                            onClick={(event) => {
                              event.stopPropagation()
                              toggle.mutate(user)
                            }}
                          >
                            {user.isActive ? 'active' : 'disabled'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <dl className="row justify-content-end small text-body-secondary px-2 mt-2 mb-2">
              <dd className="col-auto mb-0 me-auto">
                <Pager page={data.page} size={data.size} total={data.total} onPage={setPage} />
              </dd>
              <dt className="col-auto">total</dt>
              <dd className="col-auto">{data.total}</dd>
              <dt className="col-auto">page</dt>
              <dd className="col-auto">{data.page}</dd>
              <dt className="col-auto">size</dt>
              <dd className="col-auto">{data.size}</dd>
            </dl>
          </>
        )}
      </div>
      {selectedId !== null && (
        <UserDetails
          id={selectedId}
          isMe={selectedId === me.id}
          onDeleted={() => setSelectedId(null)}
        />
      )}
      <NewUserCard />
    </>
  )
}

/** The clicked user (`GET /users/{id}`), below the table: every field but the id can be edited and saved. */
function UserDetails({
  id,
  isMe,
  onDeleted,
}: {
  id: number
  isMe: boolean
  onDeleted: () => void
}) {
  const { data: user, isPending, error } = useQuery(userQueryOptions(id))

  return (
    <div className="card shadow-sm mt-4">
      <div className="card-body">
        <h3 className="h5">User {user ? displayName(user) : id}</h3>
        {isPending && <LoadingBar label="Loading details…" className="" />}
        {error && <p className="mb-0 text-danger">{error.message}</p>}
        {/* Keyed by what the server holds, so a reload after saving (or a toggle in the table) resets the form. */}
        {user && (
          <UserEditForm key={JSON.stringify(user)} user={user} isMe={isMe} onDeleted={onDeleted} />
        )}
      </div>
    </div>
  )
}

function UserEditForm({
  user,
  isMe,
  onDeleted,
}: {
  user: UserRow
  isMe: boolean
  onDeleted: () => void
}) {
  const queryClient = useQueryClient()
  const [edit, setEdit] = useState<UserEdit>(() => editOf(user))
  const save = useMutation({
    mutationFn: () => saveUser(user.id, edit),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
  const [promoting, setPromoting] = useState(false)
  const promote = useMutation({
    mutationFn: () => promoteUser(user.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      setPromoting(false)
    },
  })
  const isAdminUser = user.roles.includes('ADMIN')
  const [demoting, setDemoting] = useState(false)
  const [demoteRole, setDemoteRole] = useState<UserRole[]>(['CUSTOMER'])
  const demote = useMutation({
    mutationFn: () => demoteUser(user.id, demoteRole[0] ?? 'CUSTOMER'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      setDemoting(false)
    },
  })
  const [confirming, setConfirming] = useState(false)
  const [typed, setTyped] = useState('')
  const remove = useMutation({
    mutationFn: () => deleteUser(user.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      onDeleted()
    },
  })
  const closeConfirm = () => {
    setConfirming(false)
    setTyped('')
    remove.reset()
  }
  const set = <K extends keyof UserEdit>(key: K, value: UserEdit[K]) =>
    setEdit((current) => ({ ...current, [key]: value }))
  const textColor = badgeTextColor(edit.color)
  const complete =
    edit.firstName.trim() !== '' &&
    edit.lastName.trim() !== '' &&
    edit.username.trim() !== '' &&
    edit.email.trim() !== '' &&
    edit.roles.length > 0

  const text = (key: 'firstName' | 'lastName' | 'username' | 'email') => (
    <input
      id={`user-${key}`}
      className="form-control form-control-sm"
      value={edit[key]}
      onChange={(event) => set(key, event.target.value)}
    />
  )

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        save.mutate()
      }}
    >
      <dl className="row mb-0 align-items-center">
        <dt className="col-sm-3">id</dt>
        <dd className="col-sm-9">{user.id}</dd>
        {(['firstName', 'lastName', 'username', 'email'] as const).map((key) => (
          <div key={key} className="row mb-2 mx-0 px-0">
            <dt className="col-sm-3">
              <label htmlFor={`user-${key}`}>{key}</label>
            </dt>
            <dd className="col-sm-9 mb-0">{text(key)}</dd>
          </div>
        ))}
        <dt className="col-sm-3 mt-2">roles</dt>
        <dd className="col-sm-9 mt-2">
          <RolesPicker roles={edit.roles} onChange={(roles) => set('roles', roles)} />
        </dd>
        <dt className="col-sm-3">
          <label htmlFor="user-color">color</label>
        </dt>
        <dd className="col-sm-9">
          <span className="d-flex align-items-center gap-2">
            <input
              id="user-color"
              type="color"
              className="form-control form-control-color"
              value={toHex(edit.color) ?? '#000000'}
              onChange={(event) => set('color', event.target.value)}
            />
            <code>{toHex(edit.color) ?? 'none'}</code>
            {textColor && (
              <span className="badge" style={{ backgroundColor: edit.color, color: textColor }}>
                preview
              </span>
            )}
          </span>
        </dd>
        <dt className="col-sm-3">isActive</dt>
        <dd className="col-sm-9">
          <div className="form-check form-switch">
            <input
              id="user-isActive"
              type="checkbox"
              role="switch"
              className="form-check-input"
              checked={edit.isActive}
              onChange={(event) => set('isActive', event.target.checked)}
            />
            <label className="form-check-label" htmlFor="user-isActive">
              {edit.isActive ? 'active' : 'disabled'}
            </label>
          </div>
        </dd>
      </dl>
      <div className="d-flex align-items-center gap-3 mt-3">
        <button type="submit" className="btn btn-primary" disabled={!complete || save.isPending}>
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
        {save.isSuccess && <span className="text-success">Saved.</span>}
        {save.error && <span className="text-danger">{save.error.message}</span>}
        {isAdminUser ? (
          <button
            type="button"
            className="btn btn-outline-warning ms-auto"
            disabled={isMe}
            title={
              isMe
                ? 'You cannot demote yourself'
                : 'Take this administrator back to an ordinary role'
            }
            onClick={() => setDemoting(true)}
          >
            Demote
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-outline-warning ms-auto"
            title="Make this user an administrator"
            onClick={() => setPromoting(true)}
          >
            Promote to Admin
          </button>
        )}
        <button
          type="button"
          className="btn btn-outline-danger"
          disabled={isMe}
          title={isMe ? 'You cannot delete yourself' : 'Delete this user'}
          onClick={() => setConfirming(true)}
        >
          Delete
        </button>
      </div>
      {demoting && (
        <ConfirmModal
          title={`Demote ${displayName(user)}?`}
          confirmLabel="Demote"
          danger
          busy={demote.isPending}
          onConfirm={() => demote.mutate()}
          onCancel={() => {
            setDemoting(false)
            demote.reset()
          }}
        >
          <p>
            <strong>{user.username}</strong> stops being an administrator and keeps only the role
            chosen here:
          </p>
          <MainRolePicker
            name="demote-role"
            roles={demoteRole}
            onChange={setDemoteRole}
            exclude="ADMIN"
          />
          {demote.error && <p className="text-danger mt-2 mb-0">{demote.error.message}</p>}
        </ConfirmModal>
      )}
      {promoting && (
        <ConfirmModal
          title={`Promote ${displayName(user)}?`}
          confirmLabel="Promote"
          danger
          busy={promote.isPending}
          onConfirm={() => promote.mutate()}
          onCancel={() => {
            setPromoting(false)
            promote.reset()
          }}
        >
          <p>
            <strong>{user.username}</strong> becomes an administrator. ADMIN will be their only
            role; the roles they hold now are removed.
          </p>
          {promote.error && <p className="text-danger mb-0">{promote.error.message}</p>}
        </ConfirmModal>
      )}
      {confirming && (
        <ConfirmModal
          title={`Delete ${displayName(user)}?`}
          confirmLabel="Delete"
          danger
          busy={remove.isPending}
          confirmDisabled={typed !== 'delete'}
          onConfirm={() => remove.mutate()}
          onCancel={closeConfirm}
        >
          <p>
            This removes the account <strong>{user.username}</strong> for good. Type{' '}
            <code>delete</code> to confirm.
          </p>
          <input
            className="form-control"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && typed === 'delete' && !remove.isPending) {
                event.preventDefault()
                remove.mutate()
              }
            }}
            autoFocus
            autoComplete="off"
            aria-label="Type delete to confirm"
          />
          {remove.error && <p className="text-danger mt-2 mb-0">{remove.error.message}</p>}
        </ConfirmModal>
      )}
    </form>
  )
}

/** A button below everything that unfolds the form for a new account (`POST /users`). */
function NewUserCard() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<NewUser>(emptyNewUser)
  const [repeat, setRepeat] = useState('')
  const create = useMutation({
    mutationFn: () => createUser(form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      setForm(emptyNewUser)
      setRepeat('')
      setOpen(false)
    },
  })
  const set = <K extends keyof NewUser>(key: K, value: NewUser[K]) =>
    setForm((current) => ({ ...current, [key]: value }))
  const complete =
    form.firstName.trim() !== '' &&
    form.lastName.trim() !== '' &&
    form.username.trim() !== '' &&
    form.email.trim() !== '' &&
    form.password !== '' &&
    form.password === repeat &&
    form.roles.length > 0

  const field = (key: 'firstName' | 'lastName' | 'username' | 'email' | 'password') => (
    <div className="col-md-6">
      <label className="form-label" htmlFor={`new-user-${key}`}>
        {key}
      </label>
      <input
        id={`new-user-${key}`}
        className="form-control form-control-sm"
        type={key === 'password' ? 'password' : key === 'email' ? 'email' : 'text'}
        autoComplete={key === 'password' ? 'new-password' : 'off'}
        value={form[key]}
        onChange={(event) => set(key, event.target.value)}
      />
    </div>
  )

  return (
    <div className="mt-4 mb-3">
      <button
        type="button"
        className="btn btn-outline-success d-inline-flex align-items-center gap-2"
        aria-expanded={open}
        aria-controls="new-user-form"
        onClick={() => setOpen((current) => !current)}
      >
        <NewUserIcon />
        New User
        <Chevron up={open} />
      </button>
      {open && (
        <form
          id="new-user-form"
          className="card shadow-sm mt-3"
          onSubmit={(event) => {
            event.preventDefault()
            create.mutate()
          }}
        >
          <div className="card-body">
            <h3 className="h5">New user</h3>
            <div className="row g-3">
              {field('firstName')}
              {field('lastName')}
              {field('username')}
              {field('email')}
              {field('password')}
              <div className="col-md-6">
                <label className="form-label" htmlFor="new-user-repeat">
                  repeat password
                </label>
                <input
                  id="new-user-repeat"
                  type="password"
                  autoComplete="new-password"
                  className={`form-control form-control-sm${
                    repeat !== '' && repeat !== form.password ? ' is-invalid' : ''
                  }`}
                  value={repeat}
                  onChange={(event) => setRepeat(event.target.value)}
                />
                <div className="invalid-feedback">The passwords do not match.</div>
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="new-user-color">
                  color
                </label>
                <input
                  id="new-user-color"
                  type="color"
                  className="form-control form-control-color"
                  value={toHex(form.color) ?? '#000000'}
                  onChange={(event) => set('color', event.target.value)}
                />
              </div>
              <div className="col-12">
                <span className="form-label d-block">Main Role</span>
                <MainRolePicker
                  name="new-user-role"
                  roles={form.roles}
                  onChange={(roles) => set('roles', roles)}
                />
              </div>
            </div>
            <div className="d-flex align-items-center gap-3 mt-3">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!complete || create.isPending}
              >
                {create.isPending ? 'Creating…' : 'Create'}
              </button>
              {create.error && <span className="text-danger">{create.error.message}</span>}
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

/** The button's icon: a head and shoulders with a plus. */
function NewUserIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v6m3-3h-6" />
    </svg>
  )
}

/**
 * One role to choose, the user's main role (what the backend files them under as their type). Radio buttons, so
 * exactly one can be picked. A user that holds several roles shows the first one chosen and keeps all of them until
 * somebody picks - the list is only replaced by a choice, never by opening the form.
 */
function MainRolePicker({
  name,
  roles,
  onChange,
  exclude,
}: {
  name: string
  roles: UserRole[]
  onChange: (roles: UserRole[]) => void
  /** A role that is not on offer. */
  exclude?: UserRole
}) {
  return (
    <span className="d-flex flex-wrap gap-3">
      {USER_ROLES.filter((role) => role !== exclude).map((role) => (
        <label key={role} className="form-check-label">
          <input
            type="radio"
            name={name}
            className="form-check-input me-1"
            checked={roles[0] === role}
            onChange={() => onChange([role])}
          />
          {role}
        </label>
      ))}
    </span>
  )
}

/** Any number of roles, as checkboxes: what a user holds. The main role is the type they were filed under. */
function RolesPicker({
  roles,
  onChange,
}: {
  roles: UserRole[]
  onChange: (roles: UserRole[]) => void
}) {
  return (
    <span className="d-flex flex-wrap gap-3">
      {USER_ROLES.map((role) => (
        <label key={role} className="form-check-label">
          <input
            type="checkbox"
            className="form-check-input me-1"
            checked={roles.includes(role)}
            onChange={(event) =>
              onChange(
                event.target.checked ? [...roles, role] : roles.filter((held) => held !== role),
              )
            }
          />
          {role}
        </label>
      ))}
    </span>
  )
}
