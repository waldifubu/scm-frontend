import type { CreateShipmentRequest, ShipmentDetail, UpdateShipmentRequest } from './shipments'
import { formatDate } from '../../shared/lib/format'

/** What the shipment-data form holds while it is being typed into: every field as text, as an input has it. */
export interface ShipmentDataForm {
  shippingAddress: string
  shippingMethod: string
  /** `yyyy-MM-dd`, or empty - what `<input type="date">` reads and writes. */
  requestedDeliveryDate: string
  comment: string
}

/** The form as the shipment has it now; a field the shipment does not have is an empty input. */
export function formOf(shipment: ShipmentDetail): ShipmentDataForm {
  return {
    shippingAddress: shipment.shippingAddress ?? '',
    shippingMethod: shipment.shippingMethod ?? '',
    requestedDeliveryDate: formatDate(shipment.requestedDeliveryDate),
    comment: shipment.comment ?? '',
  }
}

/** Whether anything was changed against `saved`. Blanks around a text do not count as a change. */
export function isDirty(form: ShipmentDataForm, saved: ShipmentDataForm): boolean {
  return (Object.keys(form) as (keyof ShipmentDataForm)[]).some(
    (key) => form[key].trim() !== saved[key].trim(),
  )
}

/** What is wrong with the form, or `null`. The backend refuses a shipment without an address, so the form says so first. */
export function formError(form: ShipmentDataForm): string | null {
  if (form.shippingAddress.trim() === '') return 'The shipping address is required.'
  return null
}

/**
 * The request for `PUT /shipments/{id}`. It *replaces* every field it carries, so all four are always
 * sent - leaving the date out would wipe it - and an empty input is `null`, which the backend stores
 * as nothing rather than as an empty text.
 */
export function requestOf(form: ShipmentDataForm): UpdateShipmentRequest {
  const orNull = (value: string) => (value.trim() === '' ? null : value.trim())
  return {
    shippingAddress: form.shippingAddress.trim(),
    shippingMethod: orNull(form.shippingMethod),
    requestedDeliveryDate: orNull(form.requestedDeliveryDate),
    comment: orNull(form.comment),
  }
}

/** What the form of a new shipment holds: the same three fields as the data form, as text. */
export type NewShipmentForm = Pick<
  ShipmentDataForm,
  'shippingAddress' | 'shippingMethod' | 'requestedDeliveryDate'
>

/**
 * The request for `POST /shipments` out of the chosen packages and the form: a result with the request, or
 * the one thing that is wrong. No package is refused up front (a shipment is never empty). The address may
 * stay empty here - the backend takes a shipment without one - but `PUT .../ready` will want it, which the
 * page says. An empty input is `null`, so it is stored as nothing and not as an empty text.
 */
export function newShipmentRequest(
  packageIds: readonly number[],
  form: NewShipmentForm,
): { request: CreateShipmentRequest; error?: undefined } | { request?: undefined; error: string } {
  if (packageIds.length === 0) return { error: 'Choose at least one container.' }
  const orNull = (value: string) => (value.trim() === '' ? null : value.trim())
  return {
    request: {
      shipmentPackageIds: [...packageIds],
      shippingAddress: orNull(form.shippingAddress),
      shippingMethod: orNull(form.shippingMethod),
      requestedDeliveryDate: orNull(form.requestedDeliveryDate),
    },
  }
}
