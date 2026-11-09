import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useEffect, useState, type SubmitEventHandler } from 'react'
import { meQueryOptions } from '../auth/auth'
import { productQueryOptions, updateProduct, type ProductDto } from './products'
import { hasRole } from '../../shared/api/types'
import { cell as text } from '../../shared/lib/format'

const route = getRouteApi('/authed/products/$articleNo/edit')

const MESSAGE_SECONDS = 5

function ProductForm({ articleNo, product }: { articleNo: string; product: ProductDto }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(text(product.name))
  const [description, setDescription] = useState(text(product.description))
  const [unitPrice, setUnitPrice] = useState(text(product.unitPrice))
  const [weight, setWeight] = useState(text(product.weight))
  const [active, setActive] = useState(product.active === true)
  const [notice, setNotice] = useState<{ text: string; failed: boolean } | null>(null)

  const save = useMutation({
    mutationFn: () =>
      updateProduct(articleNo, {
        name: name.trim(),
        description: description.trim() === '' ? null : description.trim(),
        unitPrice: Number(unitPrice),
        weight: Number(weight),
        active,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      setNotice({ text: 'Saved.', failed: false })
    },
    onError: (failure) => setNotice({ text: failure.message, failed: true }),
  })

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), MESSAGE_SECONDS * 1000)
    return () => clearTimeout(timer)
  }, [notice])

  const onSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    save.mutate()
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="mb-3">
        <label htmlFor="product-name" className="form-label">
          Name
        </label>
        <input
          id="product-name"
          className="form-control"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="mb-3">
        <label htmlFor="product-description" className="form-label">
          Description
        </label>
        <textarea
          id="product-description"
          className="form-control"
          rows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <div className="row">
        <div className="col-sm-6 mb-3">
          <label htmlFor="product-price" className="form-label">
            Unit price
          </label>
          <input
            id="product-price"
            className="form-control"
            type="number"
            min="0"
            step="0.01"
            required
            value={unitPrice}
            onChange={(event) => setUnitPrice(event.target.value)}
          />
        </div>
        <div className="col-sm-6 mb-3">
          <label htmlFor="product-weight" className="form-label">
            Weight (kg)
          </label>
          <input
            id="product-weight"
            className="form-control"
            type="number"
            min="0"
            step="0.1"
            required
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
          />
        </div>
      </div>
      <div className="form-check mb-3">
        <input
          id="product-active"
          className="form-check-input"
          type="checkbox"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
        />
        <label htmlFor="product-active" className="form-check-label">
          Active
        </label>
      </div>
      <button type="submit" className="btn btn-primary" disabled={save.isPending}>
        Save
      </button>
      {notice && (
        <p className={`mt-3 mb-0 ${notice.failed ? 'text-danger' : 'text-success'}`} role="status">
          {notice.text}
        </p>
      )}
    </form>
  )
}

/** The form to change a product, shown below the products table; for managers only. */
export function ProductEditPage() {
  const { articleNo } = route.useParams()
  const { data: user } = useQuery(meQueryOptions)
  const { data: product, isPending, error } = useQuery(productQueryOptions(articleNo))

  return (
    <div className="card shadow-sm mt-4">
      <div className="card-body">
        <h3 className="h5">Edit product {articleNo}</h3>
        {user && !hasRole(user, 'MANAGER') && (
          <p className="mb-0 text-danger">Only managers may change a product.</p>
        )}
        {user && hasRole(user, 'MANAGER') && (
          <>
            {isPending && <p className="mb-0">Loading…</p>}
            {error && <p className="mb-0 text-danger">{error.message}</p>}
            {product && <ProductForm key={articleNo} articleNo={articleNo} product={product} />}
          </>
        )}
      </div>
    </div>
  )
}
