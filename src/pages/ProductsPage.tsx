import { useQuery } from '@tanstack/react-query'
import { Link, Outlet } from '@tanstack/react-router'
import { useState } from 'react'
import { meQueryOptions } from '../api/auth'
import { productsQueryOptions, type ProductFilter } from '../api/products'
import { hasRole } from '../api/types'
import { PageTitle } from './PageTitle'
import { Pager } from './Pager'

function cell(value: unknown): string {
  if (value === null || value === undefined) return ''
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

const columns = [
  { key: 'articleNo', label: 'articleNo' },
  { key: 'name', label: 'name' },
  { key: 'unitPrice', label: 'unitPrice' },
  { key: 'weight', label: 'weight (kg)' },
]

function ProductsTable({ filter, onPage }: { filter: ProductFilter; onPage: (page: number) => void }) {
  const { data, isPending, error } = useQuery(productsQueryOptions(filter))
  const { data: user } = useQuery(meQueryOptions)
  const canEdit = user ? hasRole(user, 'MANAGER') : false

  if (isPending) return <p className="p-3 mb-0">Loading products…</p>
  if (error) return <p className="p-3 mb-0 text-danger">{error.message}</p>
  const products = data.content
  if (products.length === 0) return <p className="p-3 mb-0 text-body-secondary">No products.</p>

  return (
    <>
    <div className="table-responsive">
      <table className="table table-striped table-sm mb-0">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
            {canEdit && <th />}
          </tr>
        </thead>
        <tbody>
          {products.map((product, index) => (
            <tr key={cell(product.articleNo) || index}>
              {columns.map((column) => (
                <td key={column.key}>
                  <Link
                    to="/products/$articleNo"
                    params={{ articleNo: cell(product.articleNo) }}
                    className="text-decoration-none text-reset"
                  >
                    {cell(product[column.key])}
                  </Link>
                </td>
              ))}
              {canEdit && (
                <td className="text-end">
                  <Link
                    to="/products/$articleNo/edit"
                    params={{ articleNo: cell(product.articleNo) }}
                    className="btn btn-sm btn-outline-secondary py-0"
                    title="Edit"
                    aria-label={`Edit product ${cell(product.articleNo)}`}
                  >
                    ✎
                  </Link>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <dl className="row justify-content-end small text-body-secondary px-2 mt-2 mb-2">
      <dd className="col-auto mb-0 me-auto">
        <Pager page={data.page} size={data.size} total={data.total} onPage={onPage} />
      </dd>
      <dt className="col-auto">total</dt>
      <dd className="col-auto">{data.total}</dd>
      <dt className="col-auto">page</dt>
      <dd className="col-auto">{data.page}</dd>
      <dt className="col-auto">size</dt>
      <dd className="col-auto">{data.size}</dd>
    </dl>
    </>
  )
}

/** All products, as the backend lists them; the details of the chosen one render below. */
export function ProductsPage() {
  const [page, setPage] = useState('')
  const [size, setSize] = useState('')
  const filter: ProductFilter = {
    page: page === '' ? undefined : Number(page),
    size: size === '' ? undefined : Number(size),
  }

  return (
    <>
      <div className="card shadow-sm">
        <div className="card-body d-flex flex-wrap gap-2 align-items-center">
          <PageTitle icon="products" className="me-auto">Products</PageTitle>
          <input
            type="number"
            min={0}
            className="form-control form-control-sm"
            style={{ width: '6rem' }}
            placeholder="page"
            aria-label="Page"
            value={page}
            onChange={(e) => setPage(e.target.value)}
          />
          <input
            type="number"
            min={1}
            className="form-control form-control-sm"
            style={{ width: '6rem' }}
            placeholder="size"
            aria-label="Size"
            value={size}
            onChange={(e) => setSize(e.target.value)}
          />
        </div>
        <ProductsTable filter={filter} onPage={(next) => setPage(String(next))} />
      </div>
      <Outlet />
    </>
  )
}
