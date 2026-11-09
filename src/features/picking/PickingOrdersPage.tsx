import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import {
  pickingOrdersQueryOptions,
  pickOrder,
  pickReservation,
  releasePick,
  releaseQuestion,
  type PickingStage,
} from './pickingOrders'
import { productLabel, cell } from '../../shared/lib/format'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'
import { PageTitle } from '../../layout/PageTitle'
import { Pager } from '../../shared/ui/Pager'

const MESSAGE_SECONDS = 5

/** An arrow turning back: the pick is undone. */
function ReleaseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  )
}

/** A box with a tick: the goods are taken off the shelf. */
function PickIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7 12 3l9 4-9 4-9-4Zm0 0v10l9 4 9-4V7M8.5 14l2.5 2.5 4.5-5" />
    </svg>
  )
}

// The name is shown with the article number, in that one column.
const HIDDEN_COLUMNS = new Set(['sku', 'storehouseId', 'productName'])

const DATE_COLUMNS = new Set(['pickedAt', 'expiresAt'])

const HEADS: Record<string, string> = { articleNo: 'product' }

function renderCell(column: string, item: Record<string, unknown>) {
  const value = item[column]
  if (column === 'storehouseName' && item.storehouseId != null) {
    return `${cell(value)} (${cell(item.storehouseId)})`
  }
  if (column === 'articleNo') return productLabel(item.productName, value)
  if (DATE_COLUMNS.has(column) && typeof value === 'string') {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return (
        <small className="text-body-secondary text-nowrap">
          {date.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
        </small>
      )
    }
  }
  return cell(value)
}

/** Picking orders are keyed by their reservation: `reservationId`, or `id` when that is all there is. */
function reservationId(item: Record<string, unknown>): string {
  return cell(item.reservationId ?? item.id)
}

/** The page: the table, one "pick" button per row, and below it a field to pick a whole order. */
export function PickingOrdersPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [stage, setStage] = useState<PickingStage>('ACTIVE')
  const { data, isPending, error } = useQuery(pickingOrdersQueryOptions(page, stage))
  const [orderNo, setOrderNo] = useState('')
  const [notice, setNotice] = useState<{ text: string; failed: boolean } | null>(null)

  const action = <T,>(mutationFn: (value: T) => Promise<string>) => ({
    mutationFn,
    onSuccess: async (message: string) => {
      setNotice({ text: message, failed: false })
      await queryClient.invalidateQueries({ queryKey: ['picking-orders'] })
      // A pick moves the stock and the lines that can be packed; taking it back moves them again.
      await queryClient.invalidateQueries({ queryKey: ['stock'] })
      await queryClient.invalidateQueries({ queryKey: ['packable-items'] })
      await queryClient.invalidateQueries({ queryKey: ['order-items'] })
    },
    onError: (failure: Error) => setNotice({ text: failure.message, failed: true }),
  })
  const pick = useMutation(action(pickReservation))
  const pickByOrder = useMutation(action(pickOrder))
  const release = useMutation(action(releasePick))
  // The row whose pick a person is asked about; nothing is taken back before they say yes.
  const [releasing, setReleasing] = useState<Record<string, unknown> | null>(null)
  const busy = pick.isPending || pickByOrder.isPending || release.isPending

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), MESSAGE_SECONDS * 1000)
    return () => clearTimeout(timer)
  }, [notice])

  const items = data?.content ?? []
  const columns = [...new Set(items.flatMap((item) => Object.keys(item)))].filter(
    (c) => !HIDDEN_COLUMNS.has(c),
  )

  return (
    <div className="card shadow-sm">
      <div className="card-body d-flex flex-wrap gap-2 align-items-center">
        <PageTitle icon="picking" className="me-auto">
          Picking Orders
        </PageTitle>
        <select
          className="form-select form-select-sm w-auto"
          aria-label="Stage"
          value={stage}
          onChange={(e) => {
            setStage(e.target.value as PickingStage)
            // Page 3 of what is still to be picked says nothing about what has been picked.
            setPage(0)
          }}
        >
          <option value="ACTIVE">To pick</option>
          <option value="CONSUMED">Picked</option>
        </select>
      </div>

      {isPending && <p className="p-3 mb-0">Loading picking orders…</p>}
      {error && <p className="p-3 mb-0 text-danger">{error.message}</p>}
      {data && items.length === 0 && (
        <p className="p-3 mb-0 text-body-secondary">
          {stage === 'ACTIVE' ? 'No picking orders.' : 'Nothing has been picked.'}
        </p>
      )}
      {data && items.length > 0 && (
        <>
          <div className="table-responsive">
            <table className="table table-striped table-sm mb-0">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column}>{HEADS[column] ?? column}</th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={cell(item.id) || index}>
                    {columns.map((column) => (
                      <td key={column}>{renderCell(column, item)}</td>
                    ))}
                    <td className="text-end">
                      {stage === 'ACTIVE' ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary py-0 d-inline-flex align-items-center gap-1"
                          disabled={busy}
                          onClick={() => pick.mutate(reservationId(item))}
                        >
                          <PickIcon />
                          Pick
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm btn-danger py-0 d-inline-flex align-items-center gap-1"
                          disabled={busy}
                          onClick={() => setReleasing(item)}
                        >
                          <ReleaseIcon />
                          Release
                        </button>
                      )}
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

      {releasing && (
        <ConfirmModal
          title="Take back the pick"
          confirmLabel="Release"
          danger
          busy={release.isPending}
          onCancel={() => setReleasing(null)}
          onConfirm={() => {
            release.mutate(reservationId(releasing), { onSettled: () => setReleasing(null) })
          }}
        >
          {releaseQuestion(releasing)}
        </ConfirmModal>
      )}
      {stage === 'ACTIVE' && (
        <form
          className="card-body d-flex flex-wrap gap-2 align-items-center"
          onSubmit={(e) => {
            e.preventDefault()
            if (orderNo.trim()) pickByOrder.mutate(orderNo.trim())
          }}
        >
          <label htmlFor="picking-order-no">Try to pick via order no:</label>
          <input
            id="picking-order-no"
            className="form-control form-control-sm w-auto"
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
          />
          <button
            type="submit"
            className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1"
            disabled={busy || !orderNo.trim()}
          >
            <PickIcon />
            Pick
          </button>
        </form>
      )}
      {notice && (
        <p
          className={`px-3 pb-2 mb-0 ${notice.failed ? 'text-danger' : 'text-success'}`}
          role="status"
        >
          {notice.text}
        </p>
      )}
    </div>
  )
}
