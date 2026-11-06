import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { meQueryOptions } from '../api/auth'
import { BOOKABLE_STATUS, bookDelivery, componentRequestsQueryOptions, REQUEST_STATUSES } from '../api/componentRequests'
import { storehouseChoicesQueryOptions } from '../api/storehouses'
import { hasRole } from '../api/types'
import { bookDeliveryBody, idsText } from '../bookDelivery'
import { formatMoment, shorten } from '../format'
import { requestStatusClass } from '../requestStatus'
import { Chevron } from './Chevron'
import { PageTitle } from './PageTitle'
import { Pager } from './Pager'

/** The button's icon: a box going onto a shelf. */
function BookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 21h18M5 21V10l7-5 7 5v11" />
      <path d="M9 21v-6h6v6" />
    </svg>
  )
}

/**
 * Books the ticked deliveries into stock (`POST /stock/book`): each request's quantity goes onto the stock of its
 * component in the chosen storehouse, and the requests end IN_STOCK. All or nothing - the backend refuses the whole
 * delivery when one of them is not DELIVERED, and the refusal is shown here.
 */
function BookDeliveryForm({ selected, open, onBooked }: { selected: number[]; open: boolean; onBooked: () => void }) {
  const queryClient = useQueryClient()
  const [storehouse, setStorehouse] = useState('')
  const [notice, setNotice] = useState<{ text: string; failed: boolean } | null>(null)
  const storehouses = useQuery({ ...storehouseChoicesQueryOptions, enabled: open })
  const book = useMutation({
    mutationFn: bookDelivery,
    onSuccess: async (rows) => {
      setNotice({ text: `${rows.length === 1 ? 'One request' : `${rows.length} requests`} booked into stock.`, failed: false })
      onBooked()
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['component-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['stock'] }),
      ])
    },
    onError: (failure: Error) => setNotice({ text: failure.message, failed: true }),
  })

  return (
    <div className={open ? 'fold open' : 'fold'}>
      <div className="fold-inner">
        <form
          id="book-delivery-form"
          className="card shadow-sm mt-2"
          onSubmit={(event) => {
            event.preventDefault()
            setNotice(null)
            const result = bookDeliveryBody(selected, storehouse)
            if (result.error !== undefined) setNotice({ text: result.error, failed: true })
            else book.mutate(result.body)
          }}
        >
          <div className="card-body d-flex flex-column gap-2">
            <label className="form-label mb-0" htmlFor="book-delivery-ids">Chosen requests</label>
            <input id="book-delivery-ids" className="form-control form-control-sm" readOnly placeholder="None chosen yet" value={idsText(selected)} />
            <label className="form-label mb-0 mt-2" htmlFor="book-delivery-storehouse">Storehouse</label>
            <select
              id="book-delivery-storehouse"
              className="form-select form-select-sm"
              value={storehouse}
              onChange={(event) => setStorehouse(event.target.value)}
            >
              <option value="">Choose a storehouse…</option>
              {(storehouses.data ?? []).map((choice) => (
                <option key={choice.id} value={choice.id}>{choice.name}</option>
              ))}
            </select>
            {storehouses.error && <div className="form-text text-danger">{storehouses.error.message}</div>}
            <button type="submit" className="btn btn-success align-self-start mt-2" disabled={book.isPending || selected.length === 0}>
              {book.isPending && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
              Book
            </button>
          </div>
          <div className="card-footer" style={{ minHeight: '3rem' }} role="status">
            {notice && <span className={notice.failed ? 'text-danger' : 'text-success'}>{notice.text}</span>}
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * The component requests placed with suppliers (`GET /components/requests`), oldest first, optionally those in one
 * status. For warehouse staff and admins: the goods receipt takes a request that is `DELIVERED`.
 */
export function ComponentRequestsPage() {
  const { data: user } = useQuery(meQueryOptions)
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState('')
  const { data, isPending, error } = useQuery(componentRequestsQueryOptions(page, status))
  // The requests ticked for booking, by id: they stay chosen over pages. Only a DELIVERED one can be ticked.
  const [selected, setSelected] = useState<number[]>([])
  const [showBook, setShowBook] = useState(false)
  const toggle = (id: number) => setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]))
  if (!user) return null
  if (!hasRole(user, 'WAREHOUSE') && !hasRole(user, 'ADMIN')) {
    return <p className="text-danger">Only warehouse staff and admins may see the component requests.</p>
  }

  return (
    <>
    <div className="card shadow-sm">
      <div className="card-body d-flex flex-wrap align-items-center gap-3">
        <PageTitle icon="requests" className="me-auto">Request Components</PageTitle>
        <label className="d-flex align-items-center gap-2 mb-0">
          <span className="small text-body-secondary">status</span>
          <select
            className="form-select form-select-sm"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              // Page 3 of one status says nothing about another.
              setPage(0)
            }}
          >
            <option value="">all</option>
            {REQUEST_STATUSES.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      {isPending && <p className="p-3 mb-0">Loading requests…</p>}
      {error && <p className="p-3 mb-0 text-danger">{error.message}</p>}
      {data && data.content.length === 0 && <p className="p-3 mb-0 text-body-secondary">No requests.</p>}
      {data && data.content.length > 0 && (
        <>
          <div className="table-responsive">
            <table className="table table-striped table-sm mb-0">
              <thead>
                <tr>
                  <th />
                  <th>id</th>
                  <th>component</th>
                  <th className="text-end">qty</th>
                  <th>comment</th>
                  <th>status</th>
                  <th>requestDate</th>
                  <th>supplier</th>
                  <th>assignedBy</th>
                  <th>updated</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.requestStatus === BOOKABLE_STATUS && (
                        <input
                          type="checkbox"
                          className="form-check-input"
                          aria-label={`Select request ${row.id}`}
                          checked={selected.includes(row.id)}
                          onChange={() => toggle(row.id)}
                        />
                      )}
                    </td>
                    <td>{row.id}</td>
                    <td>
                      {row.componentId ? (
                        <Link to="/components/$sku" params={{ sku: row.componentId }} className="text-decoration-none">
                          {row.componentName || row.componentId}
                        </Link>
                      ) : (
                        (row.componentName ?? '')
                      )}
                    </td>
                    <td className="text-end">{row.qty}</td>
                    {/* The first 20 characters; the whole comment is the tooltip once it was cut. */}
                    <td title={row.comment && row.comment.length > 20 ? row.comment : undefined}>{shorten(row.comment)}</td>
                    <td>
                      <span className={requestStatusClass(row.requestStatus)}>{row.requestStatus}</span>
                    </td>
                    <td className="text-nowrap">
                      <small className="text-body-secondary">{formatMoment(row.requestDate)}</small>
                    </td>
                    {/* The name; the id only where the backend sent none. */}
                    <td title={row.supplierId === null ? undefined : `Supplier ${row.supplierId}`}>{row.supplierName ?? row.supplierId ?? ''}</td>
                    <td>{row.assignedByName ?? ''}</td>
                    <td className="text-nowrap">
                      <small className="text-body-secondary">{formatMoment(row.updated)}</small>
                    </td>
                  </tr>
                ))}
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
    <button
      type="button"
      className="btn btn-outline-primary mt-4 d-inline-flex align-items-center gap-2"
      aria-expanded={showBook}
      aria-controls="book-delivery-form"
      onClick={() => setShowBook(!showBook)}
    >
      <BookIcon />
      Book Delivery
      <Chevron up={showBook} />
    </button>
    <BookDeliveryForm selected={selected} open={showBook} onBooked={() => setSelected([])} />
    </>
  )
}
