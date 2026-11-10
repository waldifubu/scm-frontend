import { statusBadgeClass } from './statusBadgeClass'
import { cell } from '../../shared/lib/format'

/** An order status as a coloured badge. */
export function OrderStatusBadge({ status }: { status: unknown }) {
  return (
    <span className={`badge ${statusBadgeClass(status)}`}>{cell(status).replaceAll('_', ' ')}</span>
  )
}
