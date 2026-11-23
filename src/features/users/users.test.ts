import { describe, expect, it } from 'vite-plus/test'
import { activeBody, editBody, emptyNewUser, newUserBody, usersPath, type UserRow } from './users'

describe('usersPath', () => {
  it('asks for the first page without a parameter', () => {
    expect(usersPath(0)).toBe('/users')
  })

  it('names the page from the second one on', () => {
    expect(usersPath(2)).toBe('/users?page=2')
  })

  it('names the sort and its direction', () => {
    expect(usersPath(0, { column: 'lastName', direction: 'asc' })).toBe(
      '/users?sort=lastName&order=ASC',
    )
    expect(usersPath(1, { column: 'isActive', direction: 'desc' })).toBe(
      '/users?sort=isActive&order=DESC&page=1',
    )
  })

  it('leaves a column the backend cannot sort by out', () => {
    expect(usersPath(0, { column: 'roles', direction: 'asc' })).toBe('/users')
  })
})

describe('activeBody', () => {
  const user: UserRow = {
    id: 7,
    firstName: 'Ada',
    lastName: 'Lovelace',
    username: 'ada',
    email: 'ada@example.org',
    color: '#336699',
    isActive: true,
    roles: ['ADMIN'],
    userType: 'admin',
  }

  it('sets the flag and sends the rest as it is, without roles or password', () => {
    expect(activeBody(user, false)).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
      username: 'ada',
      email: 'ada@example.org',
      color: '#336699',
      isActive: false,
    })
  })

  it('leaves the colour out where there is none', () => {
    expect(activeBody({ ...user, color: null }, false)).not.toHaveProperty('color')
  })
})

describe('editBody', () => {
  const edit = {
    firstName: ' Ada ',
    lastName: 'Lovelace',
    username: 'ada',
    email: 'ada@example.com',
    color: '',
    isActive: true,
    roles: ['ADMIN' as const],
  }

  it('trims, and leaves out a blank colour', () => {
    expect(editBody(edit)).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
      username: 'ada',
      email: 'ada@example.com',
      isActive: true,
      roles: ['ADMIN'],
    })
  })

  it('sends a colour and leaves out an empty role list', () => {
    const body = editBody({ ...edit, color: '#0D6EFD', roles: [] })
    expect(body.color).toBe('#0D6EFD')
    expect(body).not.toHaveProperty('roles')
  })
})

describe('newUserBody', () => {
  it('carries the password next to the details', () => {
    const body = newUserBody({
      ...emptyNewUser,
      firstName: 'Ada',
      lastName: 'Lovelace',
      username: 'ada',
      email: 'ada@example.com',
      password: 'secret',
    })
    expect(body.password).toBe('secret')
    expect(body.roles).toEqual(['CUSTOMER'])
    expect(body.isActive).toBe(true)
  })
})
