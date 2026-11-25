import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  categoryEditOf,
  createCategory,
  emptyCategoryEdit,
  isCategoryComplete,
  saveCategory,
  type CategoryDto,
  type CategoryEdit,
} from './categories'

/**
 * Name and description of one category, with a Save button - or, without a `category`, the same form for a new one
 * with a Create button.
 */
export function CategoryForm({
  category,
  onClose,
}: {
  category?: CategoryDto
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [edit, setEdit] = useState<CategoryEdit>(() =>
    category ? categoryEditOf(category) : emptyCategoryEdit,
  )
  const save = useMutation({
    mutationFn: () => (category ? saveCategory(category.id, edit) : createCategory(edit)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] })
      // The products show the names of their categories.
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      // A created category is a finished form: close it, the next one starts empty.
      if (!category) onClose()
    },
  })
  const set = (key: keyof CategoryEdit, value: string) => {
    save.reset()
    setEdit((current) => ({ ...current, [key]: value }))
  }
  const prefix = `category-${category?.id ?? 'new'}`

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (isCategoryComplete(edit)) save.mutate()
      }}
    >
      <h3 className="h5">{category ? `Category ${category.id}` : 'New category'}</h3>
      <div className="row g-3 mb-3">
        <div className="col-md-4">
          <label className="form-label" htmlFor={`${prefix}-name`}>
            name
          </label>
          <input
            id={`${prefix}-name`}
            className="form-control form-control-sm"
            value={edit.name}
            maxLength={255}
            required
            onChange={(event) => set('name', event.target.value)}
          />
        </div>
        <div className="col-md-8">
          <label className="form-label" htmlFor={`${prefix}-description`}>
            description
          </label>
          <textarea
            id={`${prefix}-description`}
            className="form-control form-control-sm"
            rows={2}
            value={edit.description}
            maxLength={1000}
            onChange={(event) => set('description', event.target.value)}
          />
        </div>
      </div>
      <div className="d-flex flex-wrap align-items-center gap-2">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!isCategoryComplete(edit) || save.isPending}
        >
          {save.isPending ? 'Saving…' : category ? 'Save' : 'Create'}
        </button>
        <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
          Close
        </button>
        {save.isSuccess && <span className="text-success">Saved.</span>}
        {save.error && <span className="text-danger">{save.error.message}</span>}
      </div>
    </form>
  )
}
