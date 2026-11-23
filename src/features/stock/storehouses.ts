import { queryOptions } from '@tanstack/react-query'
import { api } from '../../shared/api/client'
import { withPage } from '../../shared/api/pageQuery'

/** A storehouse as the backend sends it. Its fields are not typed yet, so the table reads them as they come. */
export type StorehouseDto = Record<string, unknown>

/** `GET /storehouses`: the storehouses plus the paging figures. */
export interface StorehousePage {
  content: StorehouseDto[]
  total: number
  page: number
  size: number
}

export async function fetchStorehouses(page = 0): Promise<StorehousePage> {
  const body = await api<StorehousePage | StorehouseDto[]>(withPage('/storehouses', page))
  if (Array.isArray(body)) return { content: body, total: body.length, page: 0, size: body.length }
  return { ...body, content: body.content ?? [] }
}

/** A storehouse to pick in a form: its id and what to call it. */
export interface StorehouseChoice {
  id: number
  name: string
}

/** Every storehouse for a dropdown (`?size=100`, which is what the backend suggests for one). */
export async function fetchStorehouseChoices(): Promise<StorehouseChoice[]> {
  const body = await api<StorehousePage | StorehouseDto[]>('/storehouses?size=100')
  const rows = Array.isArray(body) ? body : (body.content ?? [])
  return rows.flatMap((row) =>
    typeof row.id === 'number'
      ? [
          {
            id: row.id,
            name: typeof row.name === 'string' && row.name ? row.name : `Storehouse ${row.id}`,
          },
        ]
      : [],
  )
}

export const storehouseChoicesQueryOptions = queryOptions({
  queryKey: ['storehouses', 'choices'] as const,
  queryFn: fetchStorehouseChoices,
})

/** What the edit form holds: the four fields a storehouse may change. Optional ones are text, blank meaning none. */
export interface StorehouseEdit {
  name: string
  address: string
  city: string
  country: string
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '')

/** The form's starting values from a row of the table. */
export function storehouseEditOf(row: StorehouseDto): StorehouseEdit {
  return {
    name: text(row.name),
    address: text(row.address),
    city: text(row.city),
    country: text(row.country),
  }
}

/** The form may be saved once the storehouse has a name; the other fields are optional. */
export const isStorehouseComplete = (edit: StorehouseEdit): boolean => edit.name.trim() !== ''

/** An empty form, for a storehouse that does not exist yet. */
export const emptyStorehouseEdit: StorehouseEdit = { name: '', address: '', city: '', country: '' }

/** `POST /storehouses`: creates a storehouse and answers the stored row. */
export function createStorehouse(edit: StorehouseEdit): Promise<StorehouseDto> {
  return api<StorehouseDto>('/storehouses', { method: 'POST', body: JSON.stringify(edit) })
}

/** `PUT /storehouses/{id}`: the backend trims the text and stores blank address, city and country as none. */
export function saveStorehouse(id: number, edit: StorehouseEdit): Promise<StorehouseDto> {
  return api<StorehouseDto>(`/storehouses/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: edit.name,
      address: edit.address,
      city: edit.city,
      country: edit.country,
    }),
  })
}

export const storehousesQueryOptions = (page = 0) =>
  queryOptions({
    queryKey: ['storehouses', 'page', page] as const,
    queryFn: () => fetchStorehouses(page),
  })
