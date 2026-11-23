import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { DECISION_TEXT, decideOrder, type OrderDecision } from './orderDecisions'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'

/**
 * The manager's answers to an order: review, accept, reject, cancel - the ones the status allows, each behind a
 * confirmation. A refusal of the backend (a line is already picked, the goods are in a shipment) is shown under the
 * buttons; after a success the order and its history are read again.
 */
export function OrderDecisions({
  orderNumber,
  decisions,
}: {
  orderNumber: string
  decisions: OrderDecision[]
}) {
  const queryClient = useQueryClient()
  const [asking, setAsking] = useState<OrderDecision | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const decide = useMutation({
    mutationFn: (decision: OrderDecision) => decideOrder(orderNumber, decision),
    onSuccess: async (answer, decision) => {
      setAsking(null)
      if (decision === 'release') {
        const released = Array.isArray(answer) ? answer.length : 0
        setNotice(
          released === 0
            ? 'This order held no reservations.'
            : `Released ${released} reservation(s).`,
        )
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: ['order-history'] }),
      ])
    },
    onError: (error: Error) => {
      setAsking(null)
      setFailure(error.message)
    },
  })
  if (decisions.length === 0) return null
  const text = asking ? DECISION_TEXT[asking] : null

  return (
    <div className="card shadow-sm mt-4">
      <div className="card-body">
        <h4 className="h6">Decision</h4>
        <div className="d-flex flex-wrap gap-2">
          {decisions.map((decision) => (
            <button
              key={decision}
              type="button"
              className={`btn ${DECISION_TEXT[decision].outline}`}
              onClick={() => {
                setFailure(null)
                setNotice(null)
                setAsking(decision)
              }}
            >
              {DECISION_TEXT[decision].label}
            </button>
          ))}
        </div>
        {notice && (
          <p className="text-success mt-2 mb-0" role="status">
            {notice}
          </p>
        )}
        {failure && (
          <p className="text-danger mt-2 mb-0" role="alert">
            {failure}
          </p>
        )}
      </div>
      {asking && text && (
        <ConfirmModal
          title={`${text.label} order ${orderNumber}`}
          confirmLabel={text.label}
          danger={text.danger}
          busy={decide.isPending}
          onConfirm={() => decide.mutate(asking)}
          onCancel={() => setAsking(null)}
        >
          <p className="mb-0">{text.question}</p>
        </ConfirmModal>
      )}
    </div>
  )
}
