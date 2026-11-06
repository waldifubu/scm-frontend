import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { createOrder } from '../api/orders'
import { productsQueryOptions } from '../api/products'
import { NavIcon } from './NavIcon'
import { PageTitle } from './PageTitle'

function cell(value: unknown): string {
  if (value === null || value === undefined) return ''
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

/** Lists the products with a quantity field each; whatever has a quantity goes into the order. */
export function CreateOrderPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { data, isPending, error } = useQuery(productsQueryOptions({ size: 1000 }))
  const [dueDate, setDueDate] = useState('')
  const [quantities, setQuantities] = useState<Record<string, string>>({})

  const items = Object.entries(quantities)
    .map(([articleNo, qty]) => ({ articleNo, qty: Number(qty) }))
    .filter((item) => item.qty > 0)

  const create = useMutation({
    mutationFn: () => createOrder(dueDate, items),
    onSuccess: async (order) => {
      await queryClient.invalidateQueries({ queryKey: ['orders'] })
      const orderNo = cell(order?.orderNo)
      if (orderNo) await navigate({ to: '/orders/$orderNumber', params: { orderNumber: orderNo } })
      else await navigate({ to: '/orders' })
    },
  })

  return (
    <form
      className="card shadow-sm"
      onSubmit={(e) => {
        e.preventDefault()
        create.mutate()
      }}
    >
      <div className="card-body d-flex flex-wrap gap-3 align-items-center">
        <PageTitle icon="create-order" className="me-auto">Create order</PageTitle>
      </div>

      {isPending && <p className="p-3 mb-0">Loading products…</p>}
      {error && <p className="p-3 mb-0 text-danger">{error.message}</p>}
      {data && (
        <div className="table-responsive">
          <table className="table table-striped table-sm mb-0 align-middle">
            <thead>
              <tr>
                <th>articleNo</th>
                <th>name</th>
                <th style={{ width: '8rem' }}>quantity</th>
              </tr>
            </thead>
            <tbody>
              {data.content.map((product) => {
                const articleNo = cell(product.articleNo)
                return (
                  <tr key={articleNo}>
                    <td>{articleNo}</td>
                    <td>{cell(product.name)}</td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        className="form-control form-control-sm"
                        aria-label={`Quantity of ${articleNo}`}
                        value={quantities[articleNo] ?? ''}
                        onChange={(e) => setQuantities({ ...quantities, [articleNo]: e.target.value })}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="card-body d-flex flex-column gap-3 align-items-start">
        <label className="d-flex align-items-center gap-2">
          <span>duedate</span>
          <input
            type="date"
            required
            className="form-control form-control-sm"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </label>
        <div className="d-flex gap-3 align-items-center">
          <button
            type="submit"
            className="btn btn-success d-inline-flex align-items-center gap-2"
            disabled={create.isPending || items.length === 0 || !dueDate}
          >
            <NavIcon name="create-order" />
            {create.isPending ? 'Ordering…' : 'Create Order'}
          </button>
          {create.error && <span className="text-danger">{create.error.message}</span>}
        </div>
      </div>
    </form>
  )
}
