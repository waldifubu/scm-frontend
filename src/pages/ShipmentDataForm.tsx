import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { canEditShipmentData, updateShipment, type ShipmentDetail } from '../api/shipments'
import { formatMoment } from '../format'
import { formError, formOf, isDirty, requestOf, type ShipmentDataForm as Form } from '../shipmentForm'

/**
 * The shipment's own data as text fields: address, method, requested delivery date, comment - and when it
 * was created, which the system sets and a person cannot change, so it is shown but not typed into.
 * Saving is `PUT /shipments/{id}`; the backend takes it up to ACCEPTED and answers 409 after, so from
 * IN_TRANSIT on the fields are shown but locked.
 */
export function ShipmentDataForm({
  shipment,
  notice,
  onNotice,
}: {
  shipment: ShipmentDetail
  /** The answer to the last save. Held by the page: a save changes what the shipment holds, the page then
      builds this form anew, and a notice kept here would go with it. */
  notice: string | null
  onNotice: (message: string | null) => void
}) {
  const ids = useId()
  const queryClient = useQueryClient()
  const saved = formOf(shipment)
  const [form, setForm] = useState<Form>(saved)
  const editable = canEditShipmentData(shipment.status)

  const save = useMutation({
    mutationFn: () => updateShipment(shipment.id, requestOf(form)),
    onSuccess: async () => {
      onNotice('Shipment data saved.')
      await queryClient.invalidateQueries({ queryKey: ['shipments'] })
    },
  })

  const dirty = isDirty(form, saved)
  const problem = formError(form)
  const set = (field: keyof Form) => (value: string) => {
    onNotice(null)
    save.reset()
    setForm((current) => ({ ...current, [field]: value }))
  }

  return (
    <form
      className="mt-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (editable && dirty && !problem) save.mutate()
      }}
    >
      <h4 className="h6">edit data</h4>
      {!editable && (
        <p className="text-body-secondary small">
          A shipment in {shipment.status} can no longer be changed - its data can be edited up to ACCEPTED.
        </p>
      )}
      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label" htmlFor={`${ids}-address`}>
            Shipping address
          </label>
          <input
            id={`${ids}-address`}
            className={`form-control${problem ? ' is-invalid' : ''}`}
            value={form.shippingAddress}
            disabled={!editable}
            required
            onChange={(e) => set('shippingAddress')(e.target.value)}
          />
          {problem && <div className="invalid-feedback">{problem}</div>}
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor={`${ids}-method`}>
            Shipping method
          </label>
          <input
            id={`${ids}-method`}
            className="form-control"
            value={form.shippingMethod}
            disabled={!editable}
            onChange={(e) => set('shippingMethod')(e.target.value)}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor={`${ids}-date`}>
            Requested delivery date
          </label>
          <input
            id={`${ids}-date`}
            type="date"
            className="form-control"
            value={form.requestedDeliveryDate}
            disabled={!editable}
            onChange={(e) => set('requestedDeliveryDate')(e.target.value)}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor={`${ids}-created`}>
            createdAt
          </label>
          <input
            id={`${ids}-created`}
            className="form-control"
            value={formatMoment(shipment.createdAt)}
            readOnly
            disabled
            title="Set by the system when the shipment was created - it cannot be changed."
          />
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor={`${ids}-comment`}>
            Comment
          </label>
          <textarea
            id={`${ids}-comment`}
            className="form-control"
            rows={2}
            value={form.comment}
            disabled={!editable}
            onChange={(e) => set('comment')(e.target.value)}
          />
        </div>
      </div>
      {editable && (
        <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
          <button type="submit" className="btn btn-primary" disabled={!dirty || !!problem || save.isPending}>
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            disabled={!dirty || save.isPending}
            onClick={() => {
              onNotice(null)
              save.reset()
              setForm(saved)
            }}
          >
            Reset
          </button>
          {save.error && (
            <span className="text-danger" role="alert">
              {save.error.message}
            </span>
          )}
          {notice && (
            <span className="text-success" role="status">
              {notice}
            </span>
          )}
        </div>
      )}
    </form>
  )
}
