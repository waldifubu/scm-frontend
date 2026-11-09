import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { completeOrder } from '../api/orders'
import { ConfirmModal } from './ConfirmModal'

/**
 * "Complete Order" for a delivered order: a button, and on click a window that says this cannot be undone. Only
 * "Yes" calls `POST /orders/{orderNo}/complete`; the order then reads COMPLETED and the button goes away with the
 * status. A refusal of the backend (something is still short, not your order) is shown under the button.
 */
export function CompleteOrderButton({ orderNumber }: { orderNumber: string }) {
  const queryClient = useQueryClient()
  const [asking, setAsking] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const complete = useMutation({
    mutationFn: () => completeOrder(orderNumber),
    onSuccess: async () => {
      setAsking(false)
      await queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (error: Error) => {
      setAsking(false)
      setFailure(error.message)
    },
  })

  return (
    <div className="mt-3">
      <button
        type="button"
        className="btn btn-complete d-inline-flex align-items-center gap-2"
        onClick={() => {
          setFailure(null)
          setAsking(true)
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="m8 12.5 3 3 5-6" />
        </svg>
        Complete Order
      </button>
      {failure && (
        <p className="text-danger mt-2 mb-0" role="alert">
          {failure}
        </p>
      )}
      {asking && (
        <ConfirmModal
          title="Complete order"
          confirmLabel="Yes"
          danger
          busy={complete.isPending}
          onConfirm={() => complete.mutate()}
          onCancel={() => setAsking(false)}
        >
          <p className="mb-2">This action cannot be undone.</p>
          <p className="mb-0">Are you sure you want to complete order {orderNumber}?</p>
        </ConfirmModal>
      )}
    </div>
  )
}
