import { queryOptions } from '@tanstack/react-query'
import { api } from '../../shared/api/client'
import { withPage } from '../../shared/api/pageQuery'
import type { Schemas } from '../../shared/api/types'
import type { TableSort } from '../../shared/lib/tableSort'

export type SupplierRule = Schemas['SupplierRuleResponse']
export type DistributorRule = Schemas['DistributorRuleResponse']
export type SupplierRulePage = Schemas['PageResponseSupplierRuleResponse']
export type DistributorRulePage = Schemas['PageResponseDistributorRuleResponse']

/**
 * What the pages sort by, the table column on the left and the backend's key on the right
 * (`RuleController.SUPPLIER_RULE_SORTABLE` / `DISTRIBUTOR_RULE_SORTABLE`). A column that is not here is not sorted.
 */
export const SUPPLIER_RULE_SORT: Readonly<Record<string, string>> = {
  id: 'id',
  supplier: 'supplier.lastName',
  component: 'component.name',
  product: 'product.name',
  priority: 'priority',
  createdAt: 'createdAt',
}

export const DISTRIBUTOR_RULE_SORT: Readonly<Record<string, string>> = {
  id: 'id',
  distributor: 'distributor.lastName',
  customer: 'customer.lastName',
  weight: 'minWeight',
  volume: 'minVolume',
  priority: 'priority',
}

/** `base` for a page and a sort; no sort is the backend's own order, by id. */
export function rulesPath(
  base: string,
  keys: Readonly<Record<string, string>>,
  page: number,
  sort: TableSort | null = null,
): string {
  const key = sort === null ? undefined : keys[sort.column]
  const path =
    key === undefined
      ? base
      : `${base}?sort=${encodeURIComponent(key)}&order=${sort?.direction === 'desc' ? 'DESC' : 'ASC'}`
  return withPage(path, page)
}

export const supplierRulesQueryOptions = (page = 0, sort: TableSort | null = null) =>
  queryOptions({
    queryKey: ['supplier-rules', page, sort?.column ?? '', sort?.direction ?? ''] as const,
    queryFn: () =>
      api<SupplierRulePage>(rulesPath('/supplier-rules', SUPPLIER_RULE_SORT, page, sort)),
  })

export const distributorRulesQueryOptions = (page = 0, sort: TableSort | null = null) =>
  queryOptions({
    queryKey: ['distributor-rules', page, sort?.column ?? '', sort?.direction ?? ''] as const,
    queryFn: () =>
      api<DistributorRulePage>(rulesPath('/distributor-rules', DISTRIBUTOR_RULE_SORT, page, sort)),
  })

/** A range as the table shows it: `10 – 50 kg`, `from 10 kg`, `up to 50 kg`, or nothing when neither bound is set. */
export function rangeLabel(min: number | null, max: number | null, unit: string): string {
  if (min === null && max === null) return ''
  if (min !== null && max !== null) return `${min} – ${max} ${unit}`
  return min !== null ? `from ${min} ${unit}` : `up to ${max} ${unit}`
}

export type SupplierRuleBody = Schemas['SupplierRuleRequest']
export type DistributorRuleBody = Schemas['DistributorRuleRequest']

/** `POST /supplier-rules` (no `id`) or `PUT /supplier-rules/{id}`. */
export function saveSupplierRule(body: SupplierRuleBody, id?: number): Promise<SupplierRule> {
  return api<SupplierRule>(id === undefined ? '/supplier-rules' : `/supplier-rules/${id}`, {
    method: id === undefined ? 'POST' : 'PUT',
    body: JSON.stringify(body),
  })
}

/** `POST /distributor-rules` (no `id`) or `PUT /distributor-rules/{id}`. */
export function saveDistributorRule(
  body: DistributorRuleBody,
  id?: number,
): Promise<DistributorRule> {
  return api<DistributorRule>(
    id === undefined ? '/distributor-rules' : `/distributor-rules/${id}`,
    { method: id === undefined ? 'POST' : 'PUT', body: JSON.stringify(body) },
  )
}

/** One entry of a drop-down: what the rule refers to, and what the person sees. */
export interface Choice {
  id: number
  label: string
}

const people = (page: Schemas['PageResponseUserDto']): Choice[] =>
  page.content.map((user) => ({
    id: user.id,
    label: `${user.firstName} ${user.lastName} (${user.username})`.trim(),
  }))

/** The drop-downs of the forms. A few hundred rows at most - these are the people and parts a rule can name. */
export const supplierChoices = () =>
  queryOptions({
    queryKey: ['rule-choices', 'suppliers'] as const,
    queryFn: async () =>
      people(await api<Schemas['PageResponseUserDto']>('/users/suppliers?size=500')),
  })

export const distributorChoices = () =>
  queryOptions({
    queryKey: ['rule-choices', 'distributors'] as const,
    queryFn: async () =>
      people(await api<Schemas['PageResponseUserDto']>('/users/distributors?size=500')),
  })

export const customerChoices = () =>
  queryOptions({
    queryKey: ['rule-choices', 'customers'] as const,
    queryFn: async () => {
      const page = await api<Schemas['PageResponseUserDto']>('/users?size=500')
      return people({
        ...page,
        content: page.content.filter((user) => user.userType === 'customer'),
      })
    },
  })

export const componentChoices = () =>
  queryOptions({
    queryKey: ['rule-choices', 'components'] as const,
    queryFn: async (): Promise<Choice[]> => {
      const body = await api<
        Schemas['ComponentResponseDto'][] | { content: Schemas['ComponentResponseDto'][] }
      >('/components')
      const rows = Array.isArray(body) ? body : body.content
      return rows.map((component) => ({
        id: component.id,
        label: `${component.name} (${component.sku})`,
      }))
    },
  })

export const productChoices = () =>
  queryOptions({
    queryKey: ['rule-choices', 'products'] as const,
    queryFn: async (): Promise<Choice[]> => {
      const page = await api<Schemas['PageResponseProductDto']>('/products?size=500')
      return page.content.flatMap((product) =>
        product.id === undefined
          ? []
          : [{ id: product.id, label: `${product.name} (${product.articleNo})` }],
      )
    },
  })

/** A number typed into a field: blank is `null` (no condition), anything else a number or `NaN`. */
export function numberOrNull(text: string): number | null {
  return text.trim() === '' ? null : Number(text)
}

/** `DELETE /supplier-rules/{id}` or `DELETE /distributor-rules/{id}`: removes the rule for good. */
export function deleteRule(kind: 'supplier' | 'distributor', id: number): Promise<unknown> {
  return api(`/${kind}-rules/${id}`, { method: 'DELETE' })
}
