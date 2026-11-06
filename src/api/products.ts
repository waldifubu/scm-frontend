import { queryOptions } from '@tanstack/react-query'
import { api } from './client'

/** A product as the backend sends it. Its fields are not typed yet, so the table reads them as they come. */
export type ProductDto = Record<string, unknown>

/** `GET /products`: the products plus the paging figures. */
export interface ProductPage {
  content: ProductDto[]
  total: number
  page: number
  size: number
}

export interface ProductFilter {
  page?: number
  size?: number
}

export async function fetchProducts(filter: ProductFilter = {}): Promise<ProductPage> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filter)) {
    if (value !== undefined) params.set(key, String(value))
  }
  const query = params.size ? `?${params}` : ''
  const body = await api<ProductPage | ProductDto[]>(`/products${query}`)
  if (Array.isArray(body)) return { content: body, total: body.length, page: 0, size: body.length }
  return { ...body, content: body.content ?? [] }
}

/** Within this window a repeat visit is answered from the cache. */
const PRODUCTS_STALE_TIME = 5_000

export const productsQueryOptions = (filter: ProductFilter = {}) =>
  queryOptions({
    queryKey: ['products', 'list', filter] as const,
    queryFn: () => fetchProducts(filter),
    staleTime: PRODUCTS_STALE_TIME,
  })

/** `GET /products/{articleNo}`. */
export function fetchProduct(articleNo: string): Promise<ProductDto> {
  return api<ProductDto>(`/products/${encodeURIComponent(articleNo)}`)
}

export const productQueryOptions = (articleNo: string) =>
  queryOptions({
    queryKey: ['products', articleNo] as const,
    queryFn: () => fetchProduct(articleNo),
    staleTime: PRODUCTS_STALE_TIME,
  })

/** `GET /products/sku/{sku}`. */
export const productBySkuQueryOptions = (sku: string) =>
  queryOptions({
    queryKey: ['products', 'sku', sku] as const,
    queryFn: () => api<ProductDto>(`/products/sku/${encodeURIComponent(sku)}`),
    staleTime: PRODUCTS_STALE_TIME,
  })

/** What a manager may change of a product; the article number only says which one. */
export interface ProductUpdate {
  name: string
  description: string | null
  unitPrice: number
  weight: number
  active: boolean
}

/** `PUT /products/{articleNo}`, open to managers only. */
export function updateProduct(articleNo: string, update: ProductUpdate): Promise<ProductDto> {
  return api<ProductDto>(`/products/${encodeURIComponent(articleNo)}`, {
    method: 'PUT',
    body: JSON.stringify({ articleNo: Number(articleNo), ...update }),
  })
}
