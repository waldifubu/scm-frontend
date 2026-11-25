import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, type SubmitEventHandler } from 'react'
import { meQueryOptions } from '../auth/auth'
import { categoryIdsOf, productQueryOptions, updateProduct, type ProductDto } from './products'
import { CategoryPicker } from './CategoryPicker'
import { hasRole, type UserDto } from '../../shared/api/types'
import { cell as text } from '../../shared/lib/format'
import { LoadingBar } from '../../shared/ui/LoadingBar'

const route = getRouteApi('/authed/products/$articleNo/edit')

const MESSAGE_SECONDS = 5

/** `PUT /products/{articleNo}` is open to these two roles. */
const mayEdit = (user: UserDto) => hasRole(user, 'ADMIN') || hasRole(user, 'MANAGER')

function ProductForm({ articleNo, product }: { articleNo: string; product: ProductDto }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { data: user } = useQuery(meQueryOptions)
  // The list of categories is for admins only; for anybody else the product keeps its categories.
  const mayFile = user ? hasRole(user, 'ADMIN') : false
  const [number, setNumber] = useState(text(product.articleNo))
  const [categoryIds, setCategoryIds] = useState(() => categoryIdsOf(product))
  const [name, setName] = useState(text(product.name))
  const [description, setDescription] = useState(text(product.description))
  const [unitPrice, setUnitPrice] = useState(text(product.unitPrice))
  const [active, setActive] = useState(product.active === true)
  const [notice, setNotice] = useState<{ text: string; failed: boolean } | null>(null)

  const save = useMutation({
    mutationFn: () =>
      updateProduct(articleNo, {
        articleNo: Number(number),
        name: name.trim(),
        description: description.trim() === '' ? null : description.trim(),
        unitPrice: Number(unitPrice),
        active,
        categoryIds: mayFile ? categoryIds : undefined,
      }),
    onSuccess: async (saved) => {
      const next = text(saved.articleNo)
      if (next !== '' && next !== articleNo) {
        // The product has moved to another address: go there first, then forget the old one, which would be a 404.
        queryClient.setQueryData(productQueryOptions(next).queryKey, saved)
        await navigate({ to: '/products/$articleNo/edit', params: { articleNo: next } })
        queryClient.removeQueries({ queryKey: ['products', articleNo] })
      }
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
        <label htmlFor="product-article-no" className="form-label">
          Article number
        </label>
        <input
          id="product-article-no"
          className="form-control"
          type="number"
          min="1"
          step="1"
          required
          value={number}
          onChange={(event) => setNumber(event.target.value)}
        />
      </div>
      <div className="mb-3">
        <label htmlFor="product-name" className="form-label">
          Name
        </label>
        <input
          id="product-name"
          className="form-control"
          required
          maxLength={255}
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
          maxLength={1000}
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
            value={text(product.weight)}
            readOnly
            disabled
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
      {mayFile && (
        <CategoryPicker
          idPrefix="product-category"
          selected={categoryIds}
          onChange={setCategoryIds}
        />
      )}
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

/** The form to change a product, shown below the products table; for admins and managers. */
export function ProductEditPage() {
  const { articleNo } = route.useParams()
  const { data: user } = useQuery(meQueryOptions)
  const { data: product, isPending, error } = useQuery(productQueryOptions(articleNo))

  return (
    <div className="card shadow-sm mt-4">
      <div className="card-body">
        <h3 className="h5">Edit product {articleNo}</h3>
        {user && !mayEdit(user) && (
          <p className="mb-0 text-danger">Only admins and managers may change a product.</p>
        )}
        {user && mayEdit(user) && (
          <>
            {isPending && <LoadingBar label="Loading…" className="" />}
            {error && <p className="mb-0 text-danger">{error.message}</p>}
            {product && (
              // Keyed by the product, not by its number: changing the number keeps the form and its message.
              <ProductForm key={text(product.id)} articleNo={articleNo} product={product} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
