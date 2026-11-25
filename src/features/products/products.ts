import { queryOptions } from '@tanstack/react-query'
import { api } from '../../shared/api/client'

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
  /** A column of `ProductController.PRODUCT_SORTABLE`; the backend's default is `id`. */
  sort?: string
  order?: 'ASC' | 'DESC'
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

/** What an admin or a manager may change of a product. The weight is not among it: the backend ignores one. */
export interface ProductUpdate {
  /** The new article number, or the old one; 409 when another product has it. */
  articleNo: number
  name: string
  description: string | null
  unitPrice: number
  active: boolean
  /** Replaces the categories (an empty list removes them all); left out, the product keeps the ones it has. */
  categoryIds?: number[]
}

/** `PUT /products/{articleNo}` (admins and managers), addressed by the article number the product has so far. */
export function updateProduct(articleNo: string, update: ProductUpdate): Promise<ProductDto> {
  return api<ProductDto>(`/products/${encodeURIComponent(articleNo)}`, {
    method: 'PUT',
    body: JSON.stringify(update),
  })
}

/** What `POST /products` takes. */
export interface NewProductBody {
  articleNo: number
  name: string
  description?: string
  unitPrice: number
  categoryIds?: number[]
}

/** `POST /products` (admins and managers): a product without a bill of materials - its components are made one by one. */
export function createProduct(body: NewProductBody): Promise<ProductDto> {
  return api<ProductDto>('/products', { method: 'POST', body: JSON.stringify(body) })
}

/** `DELETE /products/{articleNo}` (409 while an order or stock still names the product). */
export function deleteProduct(articleNo: number): Promise<unknown> {
  return api(`/products/${articleNo}`, { method: 'DELETE' })
}

/** The form of a new product as text. */
export interface NewProductForm {
  articleNo: string
  name: string
  description: string
  unitPrice: string
}

export const emptyNewProduct: NewProductForm = {
  articleNo: '',
  name: '',
  description: '',
  unitPrice: '',
}

/** What is wrong with the form, or `null`: the rules the backend answers with a 400. */
export function newProductProblem(form: NewProductForm): string | null {
  if (!/^\d+$/.test(form.articleNo.trim()) || Number(form.articleNo) < 1)
    return 'Article number has to be a whole number of at least 1.'
  if (form.name.trim() === '') return 'Name must not be empty.'
  if (form.unitPrice.trim() === '' || !(Number(form.unitPrice) >= 0))
    return 'Unit price has to be a number, not negative.'
  return null
}

export function newProductBody(form: NewProductForm, categoryIds: number[] = []): NewProductBody {
  const body: NewProductBody = {
    articleNo: Number(form.articleNo),
    name: form.name.trim(),
    unitPrice: Number(form.unitPrice),
  }
  if (form.description.trim() !== '') body.description = form.description.trim()
  if (categoryIds.length > 0) body.categoryIds = categoryIds
  return body
}

/** The ids of the categories a product is filed under; none where the answer carries no list. */
export function categoryIdsOf(product: ProductDto): number[] {
  const categories = Array.isArray(product.categories) ? product.categories : []
  return categories
    .map((category) => (category as { id?: unknown } | null)?.id)
    .filter((id): id is number => typeof id === 'number')
}
