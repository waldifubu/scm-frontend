import { totalVolume, type ShipmentDetail } from './api/shipments'
import { formatCubicMeters, formatDate, formatMoment, formatNumber } from './format'

/**
 * The fields of a shipment worth a line each, in reading order; a field with nothing in it is left out.
 * The carrier's own note, `distributorComment`, comes right under the planner's `comment` - and is there
 * only while the carrier has left one.
 */
export function shipmentFields(shipment: ShipmentDetail): [label: string, value: string][] {
  const customer = [shipment.customerName, shipment.customerId != null ? `(#${shipment.customerId})` : null]
    .filter(Boolean)
    .join(' ')
  const distributor = [shipment.distributorName, shipment.distributorId != null ? `(#${shipment.distributorId})` : null]
    .filter(Boolean)
    .join(' ')

  const fields: [string, string][] = [
    ['customer', customer],
    ['shippingAddress', shipment.shippingAddress ?? ''],
    ['shippingMethod', shipment.shippingMethod ?? ''],
    ['requestedDeliveryDate', formatDate(shipment.requestedDeliveryDate)],
    ['distributor', distributor],
    ['trackingNumber', shipment.trackingNumber ?? ''],
    ['createdAt', formatMoment(shipment.createdAt)],
    ['updatedAt', formatMoment(shipment.updatedAt)],
    ['shippedAt', formatMoment(shipment.shippedAt)],
    ['deliveredAt', formatMoment(shipment.deliveredAt)],
    ['packageCount', String(shipment.packageCount)],
    ['weight', `${formatNumber(shipment.weight)} kg`],
    ['volume', totalVolume(shipment.packages) === null ? '' : `${formatCubicMeters(totalVolume(shipment.packages))} m³`],
    ['comment', shipment.comment ?? ''],
    ['distributorComment', shipment.distributorComment ?? ''],
  ]
  return fields.filter(([, value]) => value !== '')
}
