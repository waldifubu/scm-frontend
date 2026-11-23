import { api } from '../../shared/api/client'
import type { Schemas } from '../../shared/api/types'

export type RegisterBody = Schemas['RegisterRequest']

/**
 * The roles a visitor may choose for themselves - every role but ADMIN, which the backend refuses with a 403 on
 * `POST /auth/userregister` (an administrator is made by an administrator).
 */
export const SELF_REGISTER_ROLES = [
  'CUSTOMER',
  'MANAGER',
  'SUPPLIER',
  'WAREHOUSE',
  'LOGISTICS',
  'DISTRIBUTOR',
] as const

export type SelfRegisterRole = (typeof SELF_REGISTER_ROLES)[number]

export interface RegisterForm {
  firstname: string
  lastname: string
  username: string
  email: string
  password: string
  repeat: string
  role: SelfRegisterRole
}

export const emptyRegisterForm: RegisterForm = {
  firstname: '',
  lastname: '',
  username: '',
  email: '',
  password: '',
  repeat: '',
  role: 'CUSTOMER',
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** What is still missing or wrong, in the order the form asks for it - or `null` when it can be sent. */
export function registerProblem(form: RegisterForm): string | null {
  if (form.firstname.trim() === '') return 'Enter your first name.'
  if (form.lastname.trim() === '') return 'Enter your last name.'
  if (form.username.trim() === '') return 'Choose a username.'
  if (!EMAIL.test(form.email.trim())) return 'Enter a valid e-mail address.'
  if (form.password === '') return 'Choose a password.'
  if (form.password !== form.repeat) return 'The passwords do not match.'
  return null
}

/** The request as `POST /auth/userregister` takes it; the repeated password stays in the form. */
export function registerBody(form: RegisterForm): RegisterBody {
  return {
    firstname: form.firstname.trim(),
    lastname: form.lastname.trim(),
    username: form.username.trim(),
    email: form.email.trim(),
    password: form.password,
    role: form.role,
  }
}

/** `POST /auth/userregister`: public, any role but ADMIN. A taken username or e-mail is a 400 with its own text. */
export async function registerUser(body: RegisterBody): Promise<void> {
  await api('/auth/userregister', { method: 'POST', body: JSON.stringify(body) })
}
