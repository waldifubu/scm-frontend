import type { BookDeliveryBody } from './componentRequests'

export type BookFormResult =
  | { body: BookDeliveryBody; error?: undefined }
  | { error: string; body?: undefined }

/** The body for `POST /stock/book` from the ticked request ids and the chosen storehouse (its id as the select holds it, `''` for none). */
export function bookDeliveryBody(requestIds: number[], storehouse: string): BookFormResult {
  if (requestIds.length === 0) return { error: 'Tick at least one delivered request.' }
  const storehouseId = Number(storehouse)
  if (storehouse.trim() === '' || !Number.isInteger(storehouseId) || storehouseId < 1)
    return { error: 'Choose the storehouse the goods arrived in.' }
  return { body: { requestIds, storehouseId } }
}

/** The ids as the form shows them: comma separated, in the order they were ticked. */
export function idsText(requestIds: number[]): string {
  return requestIds.join(', ')
}
