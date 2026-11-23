import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState, type SubmitEvent } from 'react'
import {
  emptyRegisterForm,
  registerBody,
  registerProblem,
  registerUser,
  SELF_REGISTER_ROLES,
  type RegisterForm,
} from './register'
import { ApiError } from '../../shared/api/client'

function describe(error: unknown): string {
  if (error instanceof ApiError && error.status === 429) {
    return 'Too many attempts. Wait a moment and try again.'
  }
  return error instanceof Error ? error.message : 'Something went wrong.'
}

/** Public: a visitor makes an account for themselves, in any role but ADMIN (`POST /auth/userregister`). */
export function RegisterPage() {
  const [form, setForm] = useState<RegisterForm>(emptyRegisterForm)
  const [validated, setValidated] = useState(false)
  const problem = registerProblem(form)
  const register = useMutation({ mutationFn: () => registerUser(registerBody(form)) })

  const set = <K extends keyof RegisterForm>(key: K, value: RegisterForm[K]) => {
    register.reset()
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (problem) {
      setValidated(true)
      return
    }
    register.mutate()
  }

  const text = (
    key: 'firstname' | 'lastname' | 'username' | 'email' | 'password' | 'repeat',
    label: string,
    type = 'text',
    autoComplete = 'off',
  ) => (
    <div className="mb-3">
      <label htmlFor={`register-${key}`} className="form-label">
        {label}
      </label>
      <input
        id={`register-${key}`}
        type={type}
        autoComplete={autoComplete}
        className={`form-control${key === 'repeat' && form.repeat !== '' && form.repeat !== form.password ? ' is-invalid' : ''}`}
        value={form[key]}
        onChange={(event) => set(key, event.target.value)}
      />
    </div>
  )

  return (
    <main className="min-vh-100 d-flex align-items-center justify-content-center bg-body-tertiary p-3">
      <div className="card shadow-sm w-100" style={{ maxWidth: '28rem' }}>
        <div className="card-body p-4">
          <h1 className="h4 mb-1">Create an account</h1>
          <p className="text-body-secondary mb-4">Supply Chain Management</p>

          {register.isSuccess ? (
            <>
              <div className="alert alert-success" role="status">
                Your account was created. You can sign in now.
              </div>
              <Link to="/login" className="btn btn-primary w-100">
                Go to sign in
              </Link>
            </>
          ) : (
            <form noValidate onSubmit={handleSubmit}>
              {register.isError && (
                <div className="alert alert-danger py-2" role="alert">
                  {describe(register.error)}
                </div>
              )}
              <div className="row">
                <div className="col-sm-6">
                  {text('firstname', 'First name', 'text', 'given-name')}
                </div>
                <div className="col-sm-6">
                  {text('lastname', 'Last name', 'text', 'family-name')}
                </div>
              </div>
              {text('username', 'Username', 'text', 'username')}
              {text('email', 'E-mail', 'email', 'email')}
              {text('password', 'Password', 'password', 'new-password')}
              {text('repeat', 'Repeat password', 'password', 'new-password')}
              <div className="mb-4">
                <label htmlFor="register-role" className="form-label">
                  I am a
                </label>
                <select
                  id="register-role"
                  className="form-select"
                  value={form.role}
                  onChange={(event) => set('role', event.target.value as RegisterForm['role'])}
                >
                  {SELF_REGISTER_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              {validated && problem && <p className="text-danger">{problem}</p>}
              <button type="submit" className="btn btn-primary w-100" disabled={register.isPending}>
                {register.isPending && (
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                )}
                Create account
              </button>
              <p className="text-center mt-3 mb-0">
                <Link to="/login" className="text-decoration-none">
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
