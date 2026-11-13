import type { BookDeliveryBody, ComponentRequestRow } from './componentRequests'

export type BookFormResult =
  | { body: BookDeliveryBody; error?: undefined }
  | { error: string; body?: undefined }

/**
 * The body for `POST /stock/book` from the ticked request ids and the chosen storehouse (its id as the select holds it).
 * `''` is "choose automatically": the key is left out and the backend picks the storehouse per request.
 */
export function bookDeliveryBody(requestIds: number[], storehouse: string): BookFormResult {
  if (requestIds.length === 0) return { error: 'Tick at least one delivered request.' }
  if (storehouse.trim() === '') return { body: { requestIds } }
  const storehouseId = Number(storehouse)
  if (!Number.isInteger(storehouseId) || storehouseId < 1)
    return { error: 'Choose a storehouse from the list, or let the system choose.' }
  return { body: { requestIds, storehouseId } }
}

/** The ids as the form shows them: comma separated, in the order they were ticked. */
export function idsText(requestIds: number[]): string {
  return requestIds.join(', ')
}

/** One booked request as the success notice lists it: the part, how many, and where they went. */
export interface BookedLine {
  key: number
  text: string
}

/**
 * The part as the notice names it: its name, then in brackets the start of its SKU and the product it belongs to -
 * two parts can share a name, the SKU and the product tell them apart.
 */
export function partLabel(row: ComponentRequestRow): string {
  const details = [row.componentId?.slice(0, 8), row.productName].filter(Boolean).join(', ')
  return `${row.componentName ?? 'Component'}${details === '' ? '' : ` (${details})`}`
}

/** The lines of the notice after `POST /stock/book`: `{part} ({sku start}, {product}), {qty} component(s) stored at storehouse with id {id}`. */
export function bookedLines(rows: ComponentRequestRow[]): BookedLine[] {
  return rows.map((row) => ({
    key: row.id,
    text:
      `${partLabel(row)}, ${row.qty} ${row.qty === 1 ? 'component' : 'components'} stored` +
      (row.storehouseId === undefined ? '' : ` at storehouse with id ${row.storehouseId}`),
  }))
}
