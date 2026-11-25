import { queryOptions } from '@tanstack/react-query'
import { api } from '../../shared/api/client'

/** A product category as `GET /categories` sends it. */
export interface CategoryDto {
  id: number
  name: string
  description: string | null
}

export interface CategoryPage {
  content: CategoryDto[]
  total: number
  page: number
  size: number
}

export interface CategoryFilter {
  page?: number
  size?: number
  /** A column of `ProductCategoryController.CATEGORY_SORTABLE`; the backend's default is `name`. */
  sort?: string
  order?: 'ASC' | 'DESC'
}

export function categoriesPath(filter: CategoryFilter = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(filter)) {
    if (value !== undefined) query.set(key, String(value))
  }
  return query.size ? `/categories?${query}` : '/categories'
}

/** `GET /categories`: admins only. */
export function fetchCategories(filter: CategoryFilter = {}): Promise<CategoryPage> {
  return api<CategoryPage>(categoriesPath(filter))
}

export const categoriesQueryOptions = (filter: CategoryFilter = {}) =>
  queryOptions({
    queryKey: ['categories', 'list', filter] as const,
    queryFn: () => fetchCategories(filter),
  })

/** What the form holds: both as text, a blank description meaning none. */
export interface CategoryEdit {
  name: string
  description: string
}

export const emptyCategoryEdit: CategoryEdit = { name: '', description: '' }

/** The form's starting values from a row of the table. */
export const categoryEditOf = (category: CategoryDto): CategoryEdit => ({
  name: category.name,
  description: category.description ?? '',
})

/** The form may be saved once the category has a name. */
export const isCategoryComplete = (edit: CategoryEdit): boolean => edit.name.trim() !== ''

/** `POST /categories`: 409 when the name is taken. */
export function createCategory(edit: CategoryEdit): Promise<CategoryDto> {
  return api<CategoryDto>('/categories', { method: 'POST', body: JSON.stringify(edit) })
}

/** `PUT /categories/{id}`: the backend trims the text and stores a blank description as none. */
export function saveCategory(id: number, edit: CategoryEdit): Promise<CategoryDto> {
  return api<CategoryDto>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(edit) })
}

/** `DELETE /categories/{id}`: 409 while a product is filed under the category. */
export function deleteCategory(id: number): Promise<unknown> {
  return api(`/categories/${id}`, { method: 'DELETE' })
}
