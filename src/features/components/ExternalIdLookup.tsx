import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { componentSku, fetchComponentByExternalId, lookupMessage } from './components'

/** The magnifying glass of the Find button. */
function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

/**
 * Finds one component by its external ID (`GET /components/external/{externalId}`) and opens its page. Nothing
 * found is told in words - the backend answers 404 - and a blank field asks nothing.
 */
export function ExternalIdLookup() {
  const navigate = useNavigate()
  const [externalId, setExternalId] = useState('')
  const find = useMutation({
    mutationFn: (value: string) => fetchComponentByExternalId(value),
    onSuccess: (component) =>
      navigate({ to: '/components/$sku', params: { sku: componentSku(component) } }),
  })

  return (
    <form
      className="d-flex flex-wrap align-items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        if (externalId.trim() !== '') find.mutate(externalId.trim())
      }}
    >
      <input
        className="form-control form-control-sm w-auto"
        aria-label="External ID"
        placeholder="External ID"
        value={externalId}
        onChange={(event) => {
          find.reset()
          setExternalId(event.target.value)
        }}
      />
      <button
        type="submit"
        className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-2"
        disabled={externalId.trim() === '' || find.isPending}
      >
        <SearchIcon />
        Find
      </button>
      {find.error && (
        <span className="text-danger small" role="alert">
          {lookupMessage(find.error, externalId.trim())}
        </span>
      )}
    </form>
  )
}
