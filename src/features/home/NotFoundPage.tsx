import { Link } from '@tanstack/react-router'

export function NotFoundPage() {
  return (
    <main className="min-vh-100 d-flex flex-column align-items-center justify-content-center text-center p-3">
      <h1 className="display-5">Page not found</h1>
      <p className="text-body-secondary">There is nothing at this address.</p>
      <Link to="/" className="btn btn-primary">
        Back to the start
      </Link>
    </main>
  )
}
