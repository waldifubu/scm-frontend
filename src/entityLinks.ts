/** Where a value in a table leads: to an order, or to the product behind a SKU. */
export type EntityLink = { kind: 'order'; orderNo: string } | { kind: 'sku'; sku: string }

/**
 * Whether the cell in `column` holding `value` is a way to another page. It is decided by the column's
 * name, which is what the backend calls them everywhere (`orderNo`, `sku`) - and only for a value that
 * can be a target: an order number is digits, a SKU is not blank. Anything else is plain text, so an
 * empty cell does not become a link to nothing.
 */
export function entityLinkOf(column: string, value: unknown): EntityLink | null {
  if (column === 'orderNo') {
    const orderNo = typeof value === 'number' || typeof value === 'string' ? String(value).trim() : ''
    return /^\d+$/.test(orderNo) ? { kind: 'order', orderNo } : null
  }
  if (column === 'sku') {
    const sku = typeof value === 'string' ? value.trim() : ''
    return sku !== '' ? { kind: 'sku', sku } : null
  }
  return null
}

/**
 * The product an order line names: its article number, which is what `/products/{articleNo}` is addressed
 * by, and the SKU behind it for a tooltip. `null` for a line without a usable article number, so it stays plain
 * text - and the SKU is left out, not blank, when the line carries none.
 */
export function productLinkOf(line: Record<string, unknown>): { articleNo: string; sku?: string } | null {
  const raw = line.articleNo
  const articleNo = typeof raw === 'number' || typeof raw === 'string' ? String(raw).trim() : ''
  if (!/^\d+$/.test(articleNo)) return null
  const sku = typeof line.sku === 'string' && line.sku.trim() !== '' ? line.sku.trim() : undefined
  return sku === undefined ? { articleNo } : { articleNo, sku }
}
