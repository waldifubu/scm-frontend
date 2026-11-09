import type { AddStockRequest, TransferStockRequest } from './api/stock'

/** What a form hands over: a request ready to send, or the one thing that is wrong with the input. */
export type FormResult<T> =
  | { request: T; error?: undefined }
  | { request?: undefined; error: string }

function wholeNumber(text: string): number | null {
  const value = Number(text)
  return text.trim() !== '' && Number.isInteger(value) ? value : null
}

function quantity(text: string): { qty: number } | { error: string } {
  const qty = wholeNumber(text)
  if (qty === null || qty < 1)
    return { error: 'The quantity has to be a whole number of at least 1.' }
  return { qty }
}

/** The input of "Book stock" - `sku`, `storehouseId` and `qty` as typed or chosen - as `POST /stock/add` wants it. */
export function addStockRequest(input: {
  sku: string | null
  storehouseId: string
  qty: string
}): FormResult<AddStockRequest> {
  if (input.sku === null) return { error: 'Choose a SKU.' }
  const storehouseId = wholeNumber(input.storehouseId)
  if (storehouseId === null) return { error: 'Choose a storehouse.' }
  const amount = quantity(input.qty)
  if ('error' in amount) return { error: amount.error }
  return { request: { sku: input.sku, storehouseId, qty: amount.qty } }
}

/** The input of "Transfer" as `POST /stock/transfer` wants it; the two storehouses have to differ. */
export function transferStockRequest(input: {
  sku: string | null
  from: string
  to: string
  qty: string
}): FormResult<TransferStockRequest> {
  if (input.sku === null) return { error: 'Choose a SKU.' }
  const storehouseFrom = wholeNumber(input.from)
  if (storehouseFrom === null) return { error: 'Choose the storehouse to take it from.' }
  const storehouseTo = wholeNumber(input.to)
  if (storehouseTo === null) return { error: 'Choose the storehouse to move it to.' }
  if (storehouseFrom === storehouseTo) return { error: 'The two storehouses have to be different.' }
  const amount = quantity(input.qty)
  if ('error' in amount) return { error: amount.error }
  return { request: { sku: input.sku, storehouseFrom, storehouseTo, qty: amount.qty } }
}
