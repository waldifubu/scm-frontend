import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { meQueryOptions } from '../api/auth'
import { answerRequest, myRequestsQueryOptions, type MyRequestRow } from '../api/myRequests'
import { hasRole } from '../api/types'
import { formatMoment, shorten } from '../format'
import { requestStatusClass } from '../requestStatus'
import { actionsFor, type RowAction } from '../supplierActions'
import { ConfirmModal } from './ConfirmModal'
import { PageTitle } from './PageTitle'

/**
 * The component requests placed with the logged-in supplier (`GET /supplier/my-requests`), as the supplier sees
 * them. The backend answers the whole list at once, oldest first as it was stored - there is no paging to follow.
 */
export function MyRequestsPage() {
  const { data: user } = useQuery(meQueryOptions)
  const { data, isPending, error } = useQuery(myRequestsQueryOptions)
  const queryClient = useQueryClient()
  // A step that ends the request is asked about first; the notice says how the last answer went.
  const [asking, setAsking] = useState<{ row: MyRequestRow; entry: RowAction } | null>(null)
  const [notice, setNotice] = useState<{ text: string; failed: boolean } | null>(null)
  const answer = useMutation({
    mutationFn: ({ row, entry }: { row: MyRequestRow; entry: RowAction }) =>
      answerRequest(row.id, entry.action),
    onSuccess: async (_result, { row, entry }) => {
      setNotice({ text: `Request ${row.id}: ${entry.label.toLowerCase()} done.`, failed: false })
      setAsking(null)
      await queryClient.invalidateQueries({ queryKey: ['my-requests'] })
    },
    onError: (failure: Error) => {
      setNotice({ text: failure.message, failed: true })
      setAsking(null)
    },
  })
  const run = (row: MyRequestRow, entry: RowAction) => {
    setNotice(null)
    if (entry.ends) setAsking({ row, entry })
    else answer.mutate({ row, entry })
  }
  if (!user) return null
  if (!hasRole(user, 'SUPPLIER') && !hasRole(user, 'ADMIN')) {
    return <p className="text-danger">Only suppliers may see their requests.</p>
  }

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <PageTitle icon="my-requests">My Requests</PageTitle>
      </div>
      {isPending && <p className="p-3 mb-0">Loading requests…</p>}
      {error && <p className="p-3 mb-0 text-danger">{error.message}</p>}
      {data && data.length === 0 && <p className="p-3 mb-0 text-body-secondary">No requests.</p>}
      {data && data.length > 0 && (
        <div className="table-responsive">
          <table className="table table-striped table-sm mb-0">
            <thead>
              <tr>
                <th>id</th>
                <th>component</th>
                <th>sku</th>
                <th className="text-end">qty</th>
                <th>comment</th>
                <th>status</th>
                <th>requestDate</th>
                <th>updated</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.component?.name ?? ''}</td>
                  <td className="font-monospace small">{row.component?.sku ?? ''}</td>
                  <td className="text-end">{row.qty}</td>
                  {/* The first 20 characters; the whole comment is the tooltip once it was cut. */}
                  <td title={row.comment && row.comment.length > 20 ? row.comment : undefined}>
                    {shorten(row.comment)}
                  </td>
                  <td>
                    <span className={requestStatusClass(row.requestStatus)}>
                      {row.requestStatus}
                    </span>
                  </td>
                  <td className="text-nowrap">
                    <small className="text-body-secondary">{formatMoment(row.requestDate)}</small>
                  </td>
                  <td className="text-nowrap">
                    <small className="text-body-secondary">{formatMoment(row.updated)}</small>
                  </td>
                  <td className="text-nowrap text-end">
                    {actionsFor(row.requestStatus).map((entry) => (
                      <button
                        key={entry.action}
                        type="button"
                        className={`btn btn-sm ms-1 ${entry.ends ? 'btn-outline-danger' : 'btn-outline-success'}`}
                        disabled={answer.isPending}
                        onClick={() => run(row, entry)}
                      >
                        {entry.label}
                      </button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="card-footer" style={{ minHeight: '3rem' }} role="status">
        {notice && (
          <span className={notice.failed ? 'text-danger' : 'text-success'}>{notice.text}</span>
        )}
      </div>
      {asking && (
        <ConfirmModal
          title={`${asking.entry.label} request ${asking.row.id}?`}
          confirmLabel={asking.entry.label}
          danger
          busy={answer.isPending}
          onConfirm={() => answer.mutate(asking)}
          onCancel={() => setAsking(null)}
        >
          {asking.entry.action === 'reject'
            ? 'The request is declined and cannot be taken on again.'
            : 'The request is called off and cannot be taken on again.'}
        </ConfirmModal>
      )}
    </div>
  )
}
