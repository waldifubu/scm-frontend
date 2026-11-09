import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Outlet } from '@tanstack/react-router'
import { useState } from 'react'
import { meQueryOptions } from '../api/auth'
import {
  componentSku,
  componentsQueryOptions,
  requestComponents,
  supplierResolutionQueryOptions,
} from '../api/components'
import { hasRole } from '../api/types'
import { DEFAULT_QTY, requestComponentsBody, uncoveredSkus } from '../componentRequest'
import { Chevron } from './Chevron'
import { PageTitle } from './PageTitle'
import { Pager } from './Pager'
import { cell } from '../format'

const HIDDEN_COLUMNS = ['id', 'componentId', 'sku']

/** A product reads as its name with the article number in brackets. */
function productLabel(product: unknown): string {
  if (typeof product !== 'object' || product === null) return cell(product)
  const { name, articleNo } = product as Record<string, unknown>
  return articleNo === null || articleNo === undefined
    ? cell(name)
    : `${cell(name)} (${cell(articleNo)})`
}

function ComponentsTable({
  page,
  onPage,
  selected,
  onToggle,
  selectable,
}: {
  page: number
  onPage: (page: number) => void
  selected: string[]
  onToggle: (sku: string) => void
  selectable: boolean
}) {
  const { data, isPending, error } = useQuery(componentsQueryOptions(page))

  if (isPending) return <p className="p-3 mb-0">Loading components…</p>
  if (error) return <p className="p-3 mb-0 text-danger">{error.message}</p>
  const components = data.content
  if (components.length === 0) return <p className="p-3 mb-0 text-body-secondary">No components.</p>

  const columns = [...new Set(components.flatMap((component) => Object.keys(component)))].filter(
    (column) => !HIDDEN_COLUMNS.includes(column),
  )

  return (
    <>
      <div className="table-responsive">
        <table className="table table-striped table-sm mb-0">
          <thead>
            <tr>
              {selectable && <th />}
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {components.map((component, index) => (
              <tr key={componentSku(component) || index}>
                {selectable && (
                  <td>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      aria-label={`Select component ${cell(component.name) || componentSku(component)}`}
                      checked={selected.includes(componentSku(component))}
                      onChange={() => onToggle(componentSku(component))}
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column}>
                    <Link
                      to="/components/$sku"
                      params={{ sku: componentSku(component) }}
                      className="text-decoration-none text-reset"
                    >
                      {column === 'product'
                        ? productLabel(component[column])
                        : cell(component[column])}
                    </Link>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="row justify-content-end small text-body-secondary px-2 mt-2 mb-2">
        <dd className="col-auto mb-0 me-auto">
          <Pager page={data.page} size={data.size} total={data.total} onPage={onPage} />
        </dd>
        <dt className="col-auto">total</dt>
        <dd className="col-auto">{data.total}</dd>
        <dt className="col-auto">page</dt>
        <dd className="col-auto">{data.page}</dd>
        <dt className="col-auto">size</dt>
        <dd className="col-auto">{data.size}</dd>
      </dl>
    </>
  )
}

/** The button's icon: a box with an arrow into it, goods coming in. */
function RequestIcon() {
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
      <path d="M21 8v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8" />
      <path d="M1 4h22v4H1z" />
      <path d="M12 11v6M9 14l3 3 3-3" />
    </svg>
  )
}

/**
 * Orders the ticked components (`POST /components/request`). The supplier is not asked: the backend's rules
 * give it per component, and a component no rule covers refuses the whole request (409), shown here.
 * Every ticked component becomes a line with its own quantity and the comment typed below.
 */
function RequestComponentsForm({
  selected,
  open,
  onRequested,
}: {
  selected: string[]
  open: boolean
  onRequested: () => void
}) {
  const queryClient = useQueryClient()
  const [comment, setComment] = useState('')
  // The quantity typed for each ticked component, by SKU.
  const [qtys, setQtys] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<{ text: string; failed: boolean } | null>(null)
  // Whom each ticked component would go to, by the supplier rules - asked only while the form is open.
  const resolution = useQuery(supplierResolutionQueryOptions(selected, open))
  const resolved = resolution.data ?? []
  const uncovered = uncoveredSkus(resolved)
  const request = useMutation({
    mutationFn: requestComponents,
    onSuccess: async (rows) => {
      setNotice({
        text: `${rows.length === 1 ? 'One request' : `${rows.length} requests`} placed.`,
        failed: false,
      })
      setComment('')
      setQtys({})
      onRequested()
      await queryClient.invalidateQueries({ queryKey: ['component-requests'] })
    },
    onError: (failure: Error) => setNotice({ text: failure.message, failed: true }),
  })

  return (
    <div className={open ? 'fold open' : 'fold'}>
      <div className="fold-inner">
        <form
          id="request-components-form"
          className="card shadow-sm mt-2"
          onSubmit={(event) => {
            event.preventDefault()
            setNotice(null)
            const result = requestComponentsBody(selected, qtys, comment)
            if (result.error !== undefined) setNotice({ text: result.error, failed: true })
            else request.mutate(result.request)
          }}
        >
          <div className="card-body d-flex flex-column gap-2">
            <label className="form-label mb-0" htmlFor="request-components-chosen">
              Chosen components
            </label>
            <input
              id="request-components-chosen"
              className="form-control form-control-sm"
              readOnly
              placeholder="None chosen yet"
              value={selected.join(', ')}
            />
            {selected.length > 0 && (
              <div className="mt-1">
                {resolution.isPending && (
                  <p className="small text-body-secondary mb-0">Looking up suppliers…</p>
                )}
                {resolution.error && (
                  <p className="small text-danger mb-0">{resolution.error.message}</p>
                )}
                {/* One row per ticked component, so its quantity can be typed before the supplier is known. */}
                <table className="table table-sm align-middle mb-0 w-auto">
                  <thead>
                    <tr>
                      <th scope="col">component</th>
                      <th scope="col">supplier</th>
                      <th scope="col">qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.map((sku) => {
                      const row = resolved.find((entry) => entry.componentId === sku)
                      return (
                        <tr key={sku}>
                          <td className="font-monospace small">{sku}</td>
                          <td
                            className={row && row.supplierId === null ? 'text-danger' : undefined}
                          >
                            {!row
                              ? ''
                              : row.supplierId === null
                                ? 'no supplier rule'
                                : `${row.supplierName ?? ''} (${row.supplierId})`}
                          </td>
                          <td>
                            <input
                              type="number"
                              min={1}
                              step={1}
                              aria-label={`Quantity of ${sku}`}
                              className="form-control form-control-sm"
                              style={{ width: '6rem' }}
                              value={qtys[sku] ?? DEFAULT_QTY}
                              onChange={(event) =>
                                setQtys((current) => ({ ...current, [sku]: event.target.value }))
                              }
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {uncovered.length > 0 && (
                  <p className="small text-danger mt-1 mb-0">
                    No rule covers{' '}
                    {uncovered.length === 1 ? 'one component' : `${uncovered.length} components`};
                    the request would be refused. Untick them.
                  </p>
                )}
              </div>
            )}
            <label className="form-label mb-0 mt-2" htmlFor="request-components-comment">
              Comment
            </label>
            <input
              id="request-components-comment"
              className="form-control form-control-sm"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            <button
              type="submit"
              className="btn btn-success align-self-start mt-2"
              disabled={request.isPending || selected.length === 0 || uncovered.length > 0}
            >
              {request.isPending && (
                <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
              )}
              Request
            </button>
          </div>
          <div className="card-footer" style={{ minHeight: '3rem' }} role="status">
            {notice && (
              <span className={notice.failed ? 'text-danger' : 'text-success'}>{notice.text}</span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

/** All components, as the backend lists them; the details of the chosen one render below. */
export function ComponentsPage() {
  const [page, setPage] = useState(0)
  // The components ticked for a request, by SKU: they stay chosen over pages.
  const [selected, setSelected] = useState<string[]>([])
  const [showRequest, setShowRequest] = useState(false)
  const { data: user } = useQuery(meQueryOptions)
  // The roles `POST /components/request` lets through; anybody else would get a 403.
  const canRequest = user
    ? ['ADMIN', 'MANAGER', 'WAREHOUSE'].some((role) => hasRole(user, role))
    : false
  const toggle = (sku: string) =>
    setSelected((current) =>
      current.includes(sku) ? current.filter((value) => value !== sku) : [...current, sku],
    )
  return (
    <>
      <div className="card shadow-sm">
        <div className="card-body">
          <PageTitle icon="components">Components</PageTitle>
        </div>
        <ComponentsTable
          page={page}
          onPage={setPage}
          selected={selected}
          onToggle={toggle}
          selectable={canRequest}
        />
      </div>
      <Outlet />
      {canRequest && (
        <>
          <button
            type="button"
            className="btn btn-outline-primary mt-4 d-inline-flex align-items-center gap-2"
            aria-expanded={showRequest}
            aria-controls="request-components-form"
            onClick={() => setShowRequest(!showRequest)}
          >
            <RequestIcon />
            Request Components
            <Chevron up={showRequest} />
          </button>
          <RequestComponentsForm
            selected={selected}
            open={showRequest}
            onRequested={() => setSelected([])}
          />
        </>
      )}
    </>
  )
}
