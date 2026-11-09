import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useId, useState } from 'react'
import {
  setTrackingNumber,
  TRACKING_NUMBER_MAX_LENGTH,
  trackingNumberError,
  type DeliveryRow,
} from './shipments'

/**
 * The carrier's own reference for the shipment, in one line: the label "Tracking number", the text field with
 * its "Set" button joined to it, and the counter behind that. At most 70 characters - the bound the backend
 * has, so a longer number is stopped here and not answered with a 400.
 * Saving is `PATCH /shipments/{id}/trackingnumber`; the field starts with the number the shipment has.
 */
export function TrackingNumberForm({
  row,
  onSaved,
}: {
  row: DeliveryRow
  onSaved: (message: string) => void
}) {
  const fieldId = useId()
  const queryClient = useQueryClient()
  const saved = row.trackingNumber ?? ''
  const [value, setValue] = useState(saved)

  const save = useMutation({
    mutationFn: () => setTrackingNumber(row.shipmentId, value),
    onSuccess: async () => {
      onSaved(`Tracking number of shipment ${row.shipmentId} set.`)
      await queryClient.invalidateQueries({ queryKey: ['shipments'] })
    },
  })

  const problem = value === '' ? null : trackingNumberError(value)
  const unchanged = value.trim() === saved.trim()

  return (
    <form
      className="mt-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (!unchanged && trackingNumberError(value) === null) save.mutate()
      }}
    >
      <div className="d-flex flex-wrap align-items-center gap-2">
        <label className="form-label fw-semibold mb-0" htmlFor={fieldId}>
          Tracking number
        </label>
        {/* The field and its button are one piece - an input group - with the counter behind them. */}
        <div
          className="input-group w-auto flex-grow-1"
          style={{ minWidth: '14rem', maxWidth: '28rem' }}
        >
          <input
            id={fieldId}
            name="trackingNumber"
            className={`form-control${problem ? ' is-invalid' : ''}`}
            value={value}
            maxLength={TRACKING_NUMBER_MAX_LENGTH}
            placeholder="e.g. DHL-123"
            onChange={(e) => {
              save.reset()
              setValue(e.target.value)
            }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={save.isPending || unchanged || trackingNumberError(value) !== null}
          >
            {save.isPending ? 'Saving…' : 'Set'}
          </button>
        </div>
        <span className="small text-body-secondary text-nowrap" aria-label="Characters used">
          {value.length} / {TRACKING_NUMBER_MAX_LENGTH}
        </span>
      </div>
      {problem && <div className="small text-danger mt-1">{problem}</div>}
      {save.error && (
        <p className="text-danger mt-2 mb-0" role="alert">
          {save.error.message}
        </p>
      )}
    </form>
  )
}
