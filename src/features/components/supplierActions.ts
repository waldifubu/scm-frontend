import type { SupplierAction } from './myRequests'

export interface RowAction {
  action: SupplierAction
  label: string
  /** Ends the request (rejecting, calling off): asked about first, and shown in red. */
  ends: boolean
}

/**
 * What the supplier may do with a request in this status, as the backend allows it: accept or reject an OPEN
 * one, report an APPROVED one on its way or call it off, report an IN_TRANSIT one delivered or call it off.
 * Nothing from DELIVERED on - the goods are at our dock, and the rest is the warehouse's.
 */
export function actionsFor(status: string): RowAction[] {
  switch (status) {
    case 'OPEN':
      return [
        { action: 'approve', label: 'Approve', ends: false },
        { action: 'reject', label: 'Reject', ends: true },
      ]
    case 'APPROVED':
      return [
        { action: 'intransit', label: 'In transit', ends: false },
        { action: 'cancel', label: 'Cancel', ends: true },
      ]
    case 'IN_TRANSIT':
      return [
        { action: 'delivered', label: 'Delivered', ends: false },
        { action: 'cancel', label: 'Cancel', ends: true },
      ]
    default:
      return []
  }
}
