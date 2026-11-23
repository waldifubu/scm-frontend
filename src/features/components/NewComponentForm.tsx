import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { createComponent, productChoicesQueryOptions } from './components'
import {
  emptyNewComponent,
  newComponentBody,
  newComponentProblem,
  type NewComponentForm as Form,
} from './componentEdit'

const TEXT_FIELDS: { key: keyof Form; label: string; type?: string }[] = [
  { key: 'name', label: 'name' },
  { key: 'manufacturer', label: 'manufacturer' },
  { key: 'description', label: 'description' },
  { key: 'externalId', label: 'externalId' },
  { key: 'weight', label: 'weight (kg)', type: 'number' },
  { key: 'qty', label: 'qty per product', type: 'number' },
]

/**
 * The form of a new component (`POST /components`) - a bill-of-materials line of one product, so the product is
 * chosen first. The SKU is given by the backend. After a success the list is read again and the form closes.
 */
export function NewComponentForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient()
  const products = useQuery(productChoicesQueryOptions)
  const [form, setForm] = useState<Form>(emptyNewComponent)
  const problem = newComponentProblem(form)
  const create = useMutation({
    mutationFn: () => createComponent(newComponentBody(form)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['components'] })
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
      <h3 className="h5">New component</h3>
      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <label className="form-label" htmlFor="new-component-product">
            product
          </label>
          <select
            id="new-component-product"
            className="form-select form-select-sm"
            value={form.productArticleNo}
            disabled={products.isPending}
            onChange={(event) => set('productArticleNo', event.target.value)}
          >
            <option value="" disabled>
              {products.isPending ? 'Loading…' : 'Choose…'}
            </option>
            {(products.data ?? []).map((product) => (
              <option key={product.articleNo} value={product.articleNo}>
                {product.label}
              </option>
            ))}
          </select>
        </div>
        {TEXT_FIELDS.map(({ key, label, type }) => (
          <div className="col-md-6" key={key}>
            <label className="form-label" htmlFor={`new-component-${key}`}>
              {label}
            </label>
            <input
              id={`new-component-${key}`}
              className="form-control form-control-sm"
              type={type ?? 'text'}
              step={key === 'weight' ? 'any' : undefined}
              min={key === 'qty' ? 1 : key === 'weight' ? 0 : undefined}
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
        {problem && form.name !== '' && <span className="text-body-secondary">{problem}</span>}
        {create.error && (
          <span className="text-danger" role="alert">
            {create.error.message}
          </span>
        )}
      </div>
    </form>
  )
}
