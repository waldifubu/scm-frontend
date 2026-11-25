import { queryOptions } from '@tanstack/react-query'
import { api, ApiError } from '../../shared/api/client'
import { withPage } from '../../shared/api/pageQuery'
import { cell } from '../../shared/lib/format'

/** A component as the backend sends it. Its fields are not typed yet, so the table reads them as they come. */
export type ComponentDto = Record<string, unknown>

/** `GET /components`: the components plus the paging figures. */
export interface ComponentPage {
  content: ComponentDto[]
  total: number
  page: number
  size: number
}

/** How the catalogue is cut and ordered; what is left out is the backend's default (25 rows, by id). */
export interface ComponentListOptions {
  size?: number
  /** A name of `ComponentController.COMPONENT_SORTABLE`. */
  sort?: string
  order?: 'ASC' | 'DESC'
}

export function componentsPath(page = 0, options: ComponentListOptions = {}) {
  const query = new URLSearchParams()
  if (options.size !== undefined) query.set('size', String(options.size))
  if (options.sort) query.set('sort', options.sort)
  if (options.order) query.set('order', options.order)
  const text = query.toString()
  return withPage(text ? `/components?${text}` : '/components', page)
}

export async function fetchComponents(
  page = 0,
  options: ComponentListOptions = {},
): Promise<ComponentPage> {
  const body = await api<ComponentPage | ComponentDto[]>(componentsPath(page, options))
  if (Array.isArray(body)) return { content: body, total: body.length, page: 0, size: body.length }
  return { ...body, content: body.content ?? [] }
}

export const componentsQueryOptions = (page = 0, options: ComponentListOptions = {}) =>
  queryOptions({
    queryKey: ['components', 'page', page, options] as const,
    queryFn: () => fetchComponents(page, options),
  })

/** `GET /components/{sku}`. */
export function fetchComponent(sku: string): Promise<ComponentDto> {
  return api<ComponentDto>(`/components/${encodeURIComponent(sku)}`)
}

export const componentQueryOptions = (sku: string) =>
  queryOptions({
    queryKey: ['components', sku] as const,
    queryFn: () => fetchComponent(sku),
  })

/**
 * `GET /components/external/{externalId}`: one component by its unique external ID - the reference the outside world
 * knows it by. 404 for none.
 */
export function fetchComponentByExternalId(externalId: string): Promise<ComponentDto> {
  return api<ComponentDto>(`/components/external/${encodeURIComponent(externalId)}`)
}

/** What the lookup tells the person when it fails: a 404 is "none", anything else is the backend's own text. */
export function lookupMessage(error: unknown, externalId: string): string {
  if (error instanceof ApiError && error.status === 404) {
    return `No component with external ID ${externalId}.`
  }
  return error instanceof Error ? error.message : 'The lookup failed.'
}

/** The sku of a component: what the details are addressed by. */
export function componentSku(component: ComponentDto): string {
  return cell(component.sku)
}
/** What `PATCH /components/{sku}` takes: every field optional, a field left out stays as it is. `''` clears manufacturer, description and externalId. */
export interface ComponentPatch {
  name?: string
  manufacturer?: string
  description?: string
  externalId?: string
  weight?: number
  qty?: number
}

/** `PATCH /components/{sku}`: changes name, manufacturer, description, externalId, weight and/or qty; answers the component as it is now. */
export function patchComponent(sku: string, patch: ComponentPatch): Promise<ComponentDto> {
  return api<ComponentDto>(`/components/${encodeURIComponent(sku)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

/** One line of `POST /components/request`: the component by SKU (the key is `componentId`), how many, and why. */
export interface RequestComponentsBody {
  items: { componentId: string; qty: number; comment?: string }[]
}

/** `POST /components/request`: one request per line, each to the supplier the backend's rules give; 409 if a component has no rule. */
export function requestComponents(body: RequestComponentsBody): Promise<Record<string, unknown>[]> {
  return api<Record<string, unknown>[]>('/components/request', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/** Whom a request for one component would go to (`GET /components/suppliers/resolve`); the supplier fields are `null` when no rule covers it. */
export interface SupplierResolution {
  componentId: string
  supplierId: number | null
  supplierName: string | null
  ruleId: number | null
}

/** The suppliers the rules give for these SKUs. An unknown SKU is a 404 from the backend. */
export function resolveSuppliers(skus: string[]): Promise<SupplierResolution[]> {
  const query = new URLSearchParams()
  skus.forEach((sku) => query.append('sku', sku))
  return api<SupplierResolution[]>(`/components/suppliers/resolve?${query.toString()}`)
}

export const supplierResolutionQueryOptions = (skus: string[], enabled: boolean) =>
  queryOptions({
    queryKey: ['components', 'suppliers', 'resolve', [...skus].sort()] as const,
    queryFn: () => resolveSuppliers(skus),
    enabled: enabled && skus.length > 0,
  })

/** What `POST /components` takes: the product by its article number, the rest optional (blank fields are left out). */
export interface NewComponentBody {
  productArticleNo: number
  name: string
  manufacturer?: string
  description?: string
  externalId?: string
  weight?: number
  qty?: number
}

/** `POST /components`: a new bill-of-materials line of one product. The SKU is the backend's to give. */
export function createComponent(body: NewComponentBody): Promise<ComponentDto> {
  return api<ComponentDto>('/components', { method: 'POST', body: JSON.stringify(body) })
}

/** `DELETE /components/{id}` (admins only): 409 while something still refers to the component. */
export function deleteComponent(id: number): Promise<unknown> {
  return api(`/components/${id}`, { method: 'DELETE' })
}

/** A product to pick in the form of a new component: its article number, and what to call it. */
export interface ProductChoice {
  articleNo: number
  label: string
}

/** The products a component can belong to (`GET /products?size=500`), by article number. */
export const productChoicesQueryOptions = queryOptions({
  queryKey: ['products', 'choices'] as const,
  queryFn: async (): Promise<ProductChoice[]> => {
    const body = await api<{ content?: Record<string, unknown>[] } | Record<string, unknown>[]>(
      '/products?size=500',
    )
    const rows = Array.isArray(body) ? body : (body.content ?? [])
    return rows.flatMap((row) =>
      typeof row.articleNo === 'number'
        ? [{ articleNo: row.articleNo, label: `${cell(row.name)} (${row.articleNo})` }]
        : [],
    )
  },
})
