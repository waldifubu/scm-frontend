import type { ShipmentRow } from './shipments'

/** Whether the containers of these customers may go into the shipment: it belongs to one customer, so all of theirs must be that one. */
export function shipmentFits(
  shipment: Pick<ShipmentRow, 'customerId'>,
  chosenCustomers: readonly (number | null)[],
): boolean {
  const customers = new Set(chosenCustomers.filter((id): id is number => id !== null))
  if (customers.size === 0) return true
  if (customers.size > 1) return false
  return (
    shipment.customerId === null ||
    shipment.customerId === undefined ||
    customers.has(shipment.customerId)
  )
}
