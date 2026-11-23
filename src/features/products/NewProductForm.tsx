import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  createProduct,
  emptyNewProduct,
  newProductBody,
  newProductProblem,
  type NewProductForm as Form,
} from './products'

const FIELDS: { key: keyof Form; label: string; type?: string; step?: string }[] = [
  { key: 'articleNo', label: 'articleNo', type: 'number', step: '1' },
  { key: 'name', label: 'name' },
  { key: 'unitPrice', label: 'unitPrice', type: 'number', step: '0.01' },
  { key: 'weight', label: 'weight (kg)', type: 'number', step: 'any' },
  { key: 'description', label: 'description' },
]

/**
 * The form of a new product (`POST /products`). The article number is typed once and is the product's identity;
 * components and categories are not part of it - a product is made first, its components are made one by one.
 */
export function NewProductForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<Form>(emptyNewProduct)
  const problem = newProductProblem(form)
  const create = useMutation({
    mutationFn: () => createProduct(newProductBody(form)),
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
          <div className="col-md-6" key={key}>
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
