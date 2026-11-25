import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { completeShipmentPackage } from './shipmentPackages'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'

/** A ticked box: the container is closed. */
function CompleteIcon() {
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
      <path d="M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Zm4 7 3 3 5-6" />
    </svg>
  )
}

/**
 * The Complete button of a container's row (`PUT /packing/shipment/{id}/complete`). It asks first, because the
 * contents are fixed afterwards; a refusal of the backend is shown in the window. An empty container cannot be
 * completed, so its button is off and says why.
 */
export function CompleteRowButton({
  id,
  name,
  itemCount,
  onCompleted,
}: {
  id: string
  /** What the window calls the container: its number, or its id. */
  name: string
  /** Not known (`undefined`) where the row carries no list of items - the backend decides then. */
  itemCount: number | undefined
  /** With the sentence for the success: the row usually leaves the list, so it cannot be said here. */
  onCompleted: (message: string) => void
}) {
  const queryClient = useQueryClient()
  const [asking, setAsking] = useState(false)
  const complete = useMutation({
    mutationFn: () => completeShipmentPackage(id),
    onSuccess: async (message) => {
      setAsking(false)
      onCompleted(message)
      // A completed container can go into a shipment.
      await queryClient.invalidateQueries({ queryKey: ['shipments', 'packages'] })
      await queryClient.invalidateQueries({ queryKey: ['shipment-packages'] })
    },
  })
  const close = () => {
    setAsking(false)
    complete.reset()
  }
  const empty = itemCount === 0

  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-success d-inline-flex align-items-center gap-2"
        disabled={empty}
        title={empty ? 'A container without items cannot be completed.' : undefined}
        onClick={() => setAsking(true)}
      >
        <CompleteIcon />
        Complete
      </button>
      {asking && (
        <ConfirmModal
          title="Complete container"
          confirmLabel="Complete"
          busy={complete.isPending}
          onCancel={close}
          onConfirm={() => complete.mutate()}
        >
          <p className="mb-2">Complete container {name}?</p>
          <p className="mb-2">Once it is completed its contents are fixed:</p>
          <p className="mb-2">No item can be added, changed or taken out any more.</p>
          <p className="mb-0">The container can then go into a shipment.</p>
          {complete.error && (
            <p className="text-danger mt-2 mb-0" role="alert">
              {complete.error.message}
            </p>
          )}
        </ConfirmModal>
      )}
    </>
  )
}
