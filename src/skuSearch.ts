import type { StockDto } from './api/stock'

/** One thing the SKU search can offer: the SKU, and the name of the product behind it when one is known. */
export interface SkuOption {
  sku: string
  name?: string
}

/** The SKUs a list of stock rows holds, each once, in the order they first appear, named where `names` knows them. */
export function skuOptions(items: StockDto[], names: ReadonlyMap<string, string> = new Map()): SkuOption[] {
  const seen = new Set<string>()
  const options: SkuOption[] = []
  for (const item of items) {
    if (item.sku === null || item.sku === undefined) continue
    const sku = String(item.sku)
    if (seen.has(sku)) continue
    seen.add(sku)
    options.push({ sku, name: names.get(sku) })
  }
  return options
}

/**
 * What to suggest for what has been typed: every option whose SKU or product name contains it (case
 * ignored, surrounding blanks ignored), the ones whose SKU *starts* with it first. Nothing typed offers
 * the first `limit` options, so the list is there to open.
 */
export function suggestSkus(options: SkuOption[], query: string, limit = 8): SkuOption[] {
  const needle = query.trim().toLowerCase()
  if (needle === '') return options.slice(0, limit)

  const starts: SkuOption[] = []
  const contains: SkuOption[] = []
  for (const option of options) {
    const sku = option.sku.toLowerCase()
    if (sku.startsWith(needle)) starts.push(option)
    else if (sku.includes(needle) || option.name?.toLowerCase().includes(needle)) contains.push(option)
  }
  return [...starts, ...contains].slice(0, limit)
}

/** The rows left once a SKU is chosen: that SKU's rows only; with none chosen, all of them. */
export function filterBySku(items: StockDto[], sku: string | null): StockDto[] {
  if (sku === null) return items
  return items.filter((item) => item.sku !== null && item.sku !== undefined && String(item.sku) === sku)
}
