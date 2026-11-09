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

export const storehousesQueryOptions = (page = 0) =>
  queryOptions({
    queryKey: ['storehouses', 'page', page] as const,
    queryFn: () => fetchStorehouses(page),
  })
