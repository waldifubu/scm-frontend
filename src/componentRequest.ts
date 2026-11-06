import type { RequestComponentsBody, SupplierResolution } from './api/components'

/** The largest quantity per line the backend takes (`RequestComponentsRequest.MAX_QTY`). */
export const MAX_REQUEST_QTY = 1_000_000

export type RequestFormResult = { request: RequestComponentsBody; error?: undefined } | { error: string; request?: undefined }

/** The quantity a ticked component starts with. */
export const DEFAULT_QTY = '1'

/**
 * The body for `POST /components/request` from the ticked SKUs, the quantity typed for each of them
 * (`qtys`, by SKU; one not typed yet is `DEFAULT_QTY`) and the comment. Every ticked component becomes a
 * line with its own quantity and the shared comment; the supplier is not asked, the backend's rules give it.
 * A blank comment is left out.
 */
export function requestComponentsBody(skus: string[], qtys: Record<string, string>, comment: string): RequestFormResult {
  if (skus.length === 0) return { error: 'Tick at least one component.' }
  const text = comment.trim()
  const items: RequestComponentsBody['items'] = []
  for (const componentId of skus) {
    const typed = qtys[componentId] ?? DEFAULT_QTY
    const amount = Number(typed)
    if (typed.trim() === '' || !Number.isInteger(amount) || amount < 1) {
      return { error: `The quantity of ${componentId} has to be a whole number of at least 1.` }
    }
    if (amount > MAX_REQUEST_QTY) return { error: `The quantity of ${componentId} may not exceed ${MAX_REQUEST_QTY}.` }
    items.push({ componentId, qty: amount, ...(text === '' ? {} : { comment: text }) })
  }
  return { request: { items } }
}

/** The SKUs among `resolutions` that no supplier rule covers - what `POST /components/request` would refuse with a 409. */
export function uncoveredSkus(resolutions: SupplierResolution[]): string[] {
  return resolutions.filter((resolution) => resolution.supplierId === null).map((resolution) => resolution.componentId)
}
