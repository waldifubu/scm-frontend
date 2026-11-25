import { FulfillmentStatusBadge } from './FulfillmentStatusBadge'
import type { OrderItemDto } from './orderItems'
import { productLabel, cell } from '../../shared/lib/format'

const DATE_COLUMNS = new Set(['updatedAt', 'createdAt', 'pickedAt'])

/** A cell of an order item table, whatever the page it stands on. */
export function renderOrderItemCell(column: string, item: OrderItemDto) {
  const value = item[column]
  if (column === 'storehouseName' && item.storehouseId != null) {
    return `${cell(value)} (${cell(item.storehouseId)})`
  }
  if (DATE_COLUMNS.has(column) && typeof value === 'string') {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return (
        <small className="text-body-secondary text-nowrap">
          {date.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
        </small>
      )
    }
  }
  if (column === 'fulfillmentStatus') return <FulfillmentStatusBadge status={value} />
  if (column === 'articleNo') return productLabel(item.productName, value)
  if (column === 'product' && value && typeof value === 'object' && 'articleNo' in value) {
    return String((value as { articleNo: unknown }).articleNo)
  }
  return cell(value)
}
