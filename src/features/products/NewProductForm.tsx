import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { meQueryOptions } from '../auth/auth'
import { hasRole } from '../../shared/api/types'
import { CategoryPicker } from './CategoryPicker'
import {
  createProduct,
  emptyNewProduct,
  newProductBody,
  newProductProblem,
  type NewProductForm as Form,
} from './products'

const FIELDS: { key: keyof Form; label: string; type?: string; step?: string }[] = [
  { key: 'name', label: 'name' },
  { key: 'articleNo', label: 'articleNo', type: 'number', step: '1' },
  { key: 'description', label: 'description' },
  { key: 'unitPrice', label: 'unitPrice', type: 'number', step: '0.01' },
]

/**
 * The form of a new product (`POST /products`). The article number is the one the product is addressed by;
 * components are not part of it - a product is made first, its components are made one by one. Admins may file
 * the new product under categories; the list of them is theirs alone.
 */
export function NewProductForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<Form>(emptyNewProduct)
  const [categoryIds, setCategoryIds] = useState<number[]>([])
  const { data: user } = useQuery(meQueryOptions)
  const problem = newProductProblem(form)
  const create = useMutation({
    mutationFn: () => createProduct(newProductBody(form, categoryIds)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      onDone()
    },
  })
  const set = (key: keyof Form, value: string) => {
    create.reset()
    setForm((current) => ({ ...current, [key]: value }))
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (!problem) create.mutate()
      }}
    >
      <h3 className="h5">New product</h3>
      <div className="row g-3 mb-3">
        {FIELDS.map(({ key, label, type, step }) => (
          <div className="col-12" key={key}>
            <label className="form-label" htmlFor={`new-product-${key}`}>
              {label}
            </label>
            <input
              id={`new-product-${key}`}
              className="form-control form-control-sm"
              type={type ?? 'text'}
              step={step}
              min={type === 'number' ? 0 : undefined}
              value={form[key]}
              onChange={(event) => set(key, event.target.value)}
            />
          </div>
        ))}
      </div>
      {user && hasRole(user, 'ADMIN') && (
        <CategoryPicker
          idPrefix="new-product-category"
          selected={categoryIds}
          onChange={(next) => {
            create.reset()
            setCategoryIds(next)
          }}
        />
      )}
      <div className="d-flex flex-wrap align-items-center gap-2">
        <button type="submit" className="btn btn-success" disabled={!!problem || create.isPending}>
          {create.isPending ? 'Creating…' : 'Create'}
        </button>
        {problem && form.articleNo !== '' && <span className="text-body-secondary">{problem}</span>}
        {create.error && (
          <span className="text-danger" role="alert">
            {create.error.message}
          </span>
        )}
      </div>
    </form>
  )
}
