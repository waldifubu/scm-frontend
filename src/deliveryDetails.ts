import type { DeliveryRow } from './api/shipments'
import { formatDate, formatMoment, formatNumber } from './format'

/**
 * What a carrier reads of one of their shipments, one line each, in this order: whose it is (name and
 * number), where it goes, how, until when, when it was made, when it last changed and when it left, how many
 * packages and how heavy, the tracking number once it is set, the planner's note, and the carrier's own note
 * once they have left one. A line with nothing in it is left
 * out - a shipment without a note shows no empty "comment".
 */
export function deliveryFields(row: DeliveryRow): [label: string, value: string][] {
  const customer = [row.customerName, row.customerId != null ? `(#${row.customerId})` : null].filter(Boolean).join(' ')

  const fields: [string, string][] = [
    ['customer', customer],
    ['shippingAddress', row.shippingAddress ?? ''],
    ['shippingMethod', row.shippingMethod ?? ''],
    ['requestedDeliveryDate', formatDate(row.requestedDeliveryDate)],
    ['createdAt', formatMoment(row.createdAt)],
    ['updatedAt', formatMoment(row.updatedAt)],
    ['shippedAt', formatMoment(row.shippedAt)],
    ['packageCount', String(row.packageCount)],
    ['weight', `${formatNumber(row.weight)} kg`],
    ['trackingNumber', row.trackingNumber ?? ''],
    ['comment', row.comment ?? ''],
    ['distributorComment', row.distributorComment ?? ''],
  ]
  return fields.filter(([, value]) => value !== '')
}
