import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { listSort } from '../../shared/lib/serverTable'
import {
  categoriesPath,
  categoryEditOf,
  createCategory,
  deleteCategory,
  isCategoryComplete,
  saveCategory,
} from './categories'
import { CATEGORY_SORT_KEYS, categoryColumns } from './categoryColumns'

describe('the list of categories', () => {
  it('asks for the page, the size and the sort', () => {
    expect(categoriesPath()).toBe('/categories')
    expect(categoriesPath({ page: 1, size: 10, sort: 'name', order: 'DESC' })).toBe(
      '/categories?page=1&size=10&sort=name&order=DESC',
    )
  })

  it('shows id, name and description, all sortable', () => {
    expect(categoryColumns.map((column) => column.id)).toEqual(['id', 'name', 'description'])
    expect(categoryColumns.every((column) => column.enableSorting)).toBe(true)
    expect(listSort([{ id: 'description', desc: false }], CATEGORY_SORT_KEYS)).toEqual({
      sort: 'description',
      order: 'ASC',
    })
  })
})

describe('changing the categories', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates, saves and deletes with the method and path of the backend', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(new Response('{"id":3}', { status: 200 })))
    vi.stubGlobal('fetch', fetchMock)

    await createCategory({ name: 'Drive', description: '' })
    await saveCategory(3, { name: 'Drive', description: 'wheels' })
    await deleteCategory(3)

    const calls = fetchMock.mock.calls.map(([url, init]) => [init.method, url, init.body])
    expect(calls).toEqual([
      ['POST', '/api/1.0/categories', '{"name":"Drive","description":""}'],
      ['PUT', '/api/1.0/categories/3', '{"name":"Drive","description":"wheels"}'],
      ['DELETE', '/api/1.0/categories/3', undefined],
    ])
  })

  it('needs a name, and reads a missing description as blank', () => {
    expect(isCategoryComplete({ name: ' ', description: 'x' })).toBe(false)
    expect(isCategoryComplete({ name: 'Drive', description: '' })).toBe(true)
    expect(categoryEditOf({ id: 1, name: 'Drive', description: null })).toEqual({
      name: 'Drive',
      description: '',
    })
  })
})
