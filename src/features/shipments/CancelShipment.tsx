import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { cancelShipment, CANCEL_REASON_MAX_LENGTH } from './shipments'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'

/** A circle with a cross: the shipment is called off. */
function CancelIcon() {
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
      <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-3 6 6 6m0-6-6 6" />
    </svg>
  )
}

/**
 * The red "Cancel shipment" button (`POST /shipments/{id}/cancel`). It asks first and wants a reason, which the
 * backend requires; a refusal is shown in the window.
 */
export function CancelShipment({
  shipmentId,
  onCancelled,
}: {
  shipmentId: number | string
  onCancelled: (message: string) => void
}) {
  const reasonId = useId()
  const queryClient = useQueryClient()
  const [asking, setAsking] = useState(false)
  const [reason, setReason] = useState('')
  const cancel = useMutation({
    mutationFn: () => cancelShipment(shipmentId, reason.trim()),
    onSuccess: async () => {
      setAsking(false)
      onCancelled('The shipment is cancelled. Its packages are free again.')
      // The packages are loose again, and their order lines and orders step back.
      await queryClient.invalidateQueries({ queryKey: ['shipments'] })
      await queryClient.invalidateQueries({ queryKey: ['shipment-packages'] })
      await queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
  const close = () => {
    setAsking(false)
    setReason('')
    cancel.reset()
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-danger d-inline-flex align-items-center gap-2"
        onClick={() => setAsking(true)}
      >
        <CancelIcon />
        Cancel shipment
      </button>
      {asking && (
        <ConfirmModal
          title="Cancel shipment"
          confirmLabel="Cancel shipment"
          cancelLabel="Keep shipment"
          danger
          busy={cancel.isPending}
          confirmDisabled={reason.trim() === ''}
          onCancel={close}
          onConfirm={() => cancel.mutate()}
        >
          <p className="mb-2">Cancel shipment {shipmentId}? This cannot be undone.</p>
          <p className="mb-3">
            Its packages are taken out and can be shipped again; the orders step back.
          </p>
          <label className="form-label" htmlFor={reasonId}>
            Reason (replaces the comment of the shipment)
          </label>
          <textarea
            id={reasonId}
            className="form-control"
            rows={3}
            maxLength={CANCEL_REASON_MAX_LENGTH}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          {cancel.error && (
            <p className="text-danger mt-2 mb-0" role="alert">
              {cancel.error.message}
            </p>
          )}
        </ConfirmModal>
      )}
    </>
  )
}
