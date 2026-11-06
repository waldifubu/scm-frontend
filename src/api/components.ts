import { queryOptions } from '@tanstack/react-query'
import { api } from './client'
import { withPage } from './pageQuery'

/** A component as the backend sends it. Its fields are not typed yet, so the table reads them as they come. */
export type ComponentDto = Record<string, unknown>

/** `GET /components`: the components plus the paging figures. */
export interface ComponentPage {
  content: ComponentDto[]
  total: number
  page: number
  size: number
}

export async function fetchComponents(page = 0): Promise<ComponentPage> {
  const body = await api<ComponentPage | ComponentDto[]>(withPage('/components', page))
  if (Array.isArray(body)) return { content: body, total: body.length, page: 0, size: body.length }
  return { ...body, content: body.content ?? [] }
}

export const componentsQueryOptions = (page = 0) =>
  queryOptions({
    queryKey: ['components', 'page', page] as const,
    queryFn: () => fetchComponents(page),
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

/** The sku of a component: what the details are addressed by. */
export function componentSku(component: ComponentDto): string {
  return component.sku === null || component.sku === undefined ? '' : String(component.sku)
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
  return api<Record<string, unknown>[]>('/components/request', { method: 'POST', body: JSON.stringify(body) })
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
