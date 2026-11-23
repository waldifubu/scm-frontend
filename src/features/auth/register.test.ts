import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import {
  emptyRegisterForm,
  registerBody,
  registerProblem,
  registerUser,
  SELF_REGISTER_ROLES,
} from './register'

afterEach(() => {
  vi.unstubAllGlobals()
})

const filled = {
  ...emptyRegisterForm,
  firstname: ' Ada ',
  lastname: 'Lovelace',
  username: ' ada ',
  email: 'ada@example.test',
  password: 'secret',
  repeat: 'secret',
}

describe('registerProblem', () => {
  it('asks for every field in turn and for matching passwords', () => {
    expect(registerProblem(emptyRegisterForm)).toMatch(/first name/)
    expect(registerProblem({ ...filled, lastname: ' ' })).toMatch(/last name/)
    expect(registerProblem({ ...filled, username: '' })).toMatch(/username/)
    expect(registerProblem({ ...filled, email: 'ada@' })).toMatch(/e-mail/)
    expect(registerProblem({ ...filled, password: '', repeat: '' })).toMatch(/password/)
    expect(registerProblem({ ...filled, repeat: 'other' })).toMatch(/do not match/)
    expect(registerProblem(filled)).toBeNull()
  })
})

describe('registerBody', () => {
  it('trims the text fields, leaves the password alone and does not send the repeat', () => {
    expect(registerBody(filled)).toEqual({
      firstname: 'Ada',
      lastname: 'Lovelace',
      username: 'ada',
      email: 'ada@example.test',
      password: 'secret',
      role: 'CUSTOMER',
    })
  })
})

describe('SELF_REGISTER_ROLES', () => {
  it('never offers ADMIN', () => {
    expect(SELF_REGISTER_ROLES).not.toContain('ADMIN')
    expect(SELF_REGISTER_ROLES).toContain('CUSTOMER')
  })
})

describe('registerUser', () => {
  it('posts to the public userregister path', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"message":"ok"}', { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    await registerUser(registerBody(filled))

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/1.0/auth/userregister')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' })
  })
})
