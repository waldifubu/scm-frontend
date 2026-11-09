import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useId, useState } from 'react'
import {
  acceptShipment,
  canAcceptShipment,
  canMarkDelivered,
  canMarkInTransit,
  canDeclineShipment,
  canSetTrackingNumber,
  declineShipment,
  shipmentDelivered,
  shipmentInTransit,
  statusBadgeClass,
  type DeliveryRow,
} from '../api/shipments'
import { deliveryFields } from '../deliveryDetails'
import { PinIcon } from './PinIcon'
import { TrackingNumberForm } from './TrackingNumberForm'
import { TruckIcon } from './TruckIcon'

/**
 * One of a carrier's shipments, opened: what the shipment is (customer, where, how, until when, how heavy,
 * the planner's note) and what the carrier can do with it - take it on (green) or turn it down (red).
 * <p>
 * Above the two buttons is one text field, `reason`, and both buttons send it. For Decline it is the reason
 * and it is required - the backend refuses a decline without one. For Accept it is a note and optional.
 * Either way it ends up in the shipment's `distributorComment`.
 * <p>
 * Each button is there only where the backend would take the step: Accept and Decline while the shipment waits
 * for the carrier (DISPATCH_REQUESTED) - once it is accepted, backing out is the planner's cancellation, not
 * a decline - and, below the tracking number, "Shipment is in transit" once it is accepted (ACCEPTED), with
 * a truck on the button. On the road, the green "Shipment has arrived" with a location pin reports the goods
 * delivered - the last step; after it nothing is offered.
 */
export function DeliveryDetails({ row, onClose }: { row: DeliveryRow; onClose: () => void }) {
  const reasonId = useId()
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  const done = (message: string) => async () => {
    setNotice(message)
    setReason('')
    await queryClient.invalidateQueries({ queryKey: ['shipments'] })
  }

  const accept = useMutation({
    mutationFn: () => acceptShipment(row.shipmentId, reason),
    onSuccess: done(`Shipment ${row.shipmentId} accepted.`),
  })
  const decline = useMutation({
    mutationFn: () => declineShipment(row.shipmentId, reason),
    onSuccess: done(`Shipment ${row.shipmentId} was declined.`),
  })

  const inTransit = useMutation({
    mutationFn: () => shipmentInTransit(row.shipmentId),
    onSuccess: done(`Shipment ${row.shipmentId} is in transit.`),
  })

  const delivered = useMutation({
    mutationFn: () => shipmentDelivered(row.shipmentId),
    onSuccess: done(`Shipment ${row.shipmentId} has arrived.`),
  })

  const busy = accept.isPending || decline.isPending || inTransit.isPending || delivered.isPending
  const failure = accept.error ?? decline.error ?? inTransit.error ?? delivered.error
  const mayAccept = canAcceptShipment(row.status)
  const mayDecline = canDeclineShipment(row.status)
  const answers = mayAccept || mayDecline

  const start = (mutation: typeof accept) => {
    setNotice(null)
    accept.reset()
    decline.reset()
    inTransit.reset()
    delivered.reset()
    mutation.mutate()
  }

  return (
    <div className="card shadow-sm mt-4">
      <div className="card-body">
        <div className="d-flex align-items-center gap-2">
          <h3 className="h5 mb-0 me-auto d-flex align-items-center gap-2">
            Shipment {row.shipmentId}
            <span className={`badge ${statusBadgeClass(row.status)}`}>{row.status}</span>
          </h3>
          <button
            type="button"
            className="btn-close"
            aria-label="Close the details"
            onClick={onClose}
          />
        </div>

        <dl className="row mb-0 mt-3">
          {deliveryFields(row).map(([label, value]) => (
            <div key={label} className="row">
              <dt className="col-sm-4">{label}</dt>
              <dd className="col-sm-8">{value}</dd>
            </div>
          ))}
        </dl>

        {answers && (
          <form
            className="mt-3"
            onSubmit={(event) => {
              // Enter in the field is no answer: which one it would be is not for the page to guess.
              event.preventDefault()
            }}
          >
            <label className="form-label" htmlFor={reasonId}>
              reason
            </label>
            <textarea
              id={reasonId}
              name="reason"
              className="form-control"
              rows={2}
              value={reason}
              maxLength={255}
              placeholder="Required to decline, optional to accept"
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="d-flex flex-wrap gap-2 mt-2">
              {mayAccept && (
                <button
                  type="button"
                  className="btn btn-success"
                  disabled={busy}
                  onClick={() => start(accept)}
                >
                  {accept.isPending ? 'Accepting…' : 'Accept'}
                </button>
              )}
              {mayDecline && (
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={busy || reason.trim() === ''}
                  title={reason.trim() === '' ? 'Say why in the reason field first.' : undefined}
                  onClick={() => start(decline)}
                >
                  {decline.isPending ? 'Declining…' : 'Decline'}
                </button>
              )}
            </div>
          </form>
        )}

        {canSetTrackingNumber(row.status) && (
          // Keyed by what the shipment holds: a number set elsewhere replaces what is typed.
          <TrackingNumberForm
            key={row.trackingNumber ?? ''}
            row={row}
            onSaved={(message) => {
              accept.reset()
              decline.reset()
              inTransit.reset()
              delivered.reset()
              setNotice(message)
            }}
          />
        )}

        {canMarkDelivered(row.status) && (
          <div className="mt-3">
            <button
              type="button"
              className="btn btn-success d-inline-flex align-items-center gap-2"
              disabled={busy}
              onClick={() => start(delivered)}
            >
              <PinIcon />
              {delivered.isPending ? 'Reporting…' : 'Shipment has arrived'}
            </button>
          </div>
        )}

        {canMarkInTransit(row.status) && (
          <div className="mt-3">
            <button
              type="button"
              className="btn btn-primary d-inline-flex align-items-center gap-2"
              disabled={busy}
              onClick={() => start(inTransit)}
            >
              <TruckIcon />
              {inTransit.isPending ? 'Reporting…' : 'Shipment is in transit'}
            </button>
          </div>
        )}

        {failure && (
          <p className="text-danger mt-3 mb-0" role="alert">
            {failure.message}
          </p>
        )}
        {notice && (
          <p className="text-success mt-3 mb-0" role="status">
            {notice}
          </p>
        )}
      </div>
    </div>
  )
}
