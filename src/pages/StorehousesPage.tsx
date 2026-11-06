import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { meQueryOptions } from '../api/auth'
import { storehousesQueryOptions } from '../api/storehouses'
import { hasRole } from '../api/types'
import { PageTitle } from './PageTitle'
import { Pager } from './Pager'

function cell(value: unknown): string {
  if (value === null || value === undefined) return ''
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

function StorehousesTable({ page, onPage }: { page: number; onPage: (page: number) => void }) {
  const { data, isPending, error } = useQuery(storehousesQueryOptions(page))

  if (isPending) return <p className="p-3 mb-0">Loading storehouses…</p>
  if (error) return <p className="p-3 mb-0 text-danger">{error.message}</p>
  const items = data.content
  if (items.length === 0) return <p className="p-3 mb-0 text-body-secondary">No storehouses.</p>

  const columns = [...new Set(items.flatMap((item) => Object.keys(item)))]

  return (
    <>
      <div className="table-responsive">
        <table className="table table-striped table-sm mb-0">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={cell(item.id) || index}>
                {columns.map((column) => (
                  <td key={column}>
                    {item.id != null ? (
                      <Link
                        to="/stock/storehouse/$storehouseId"
                        params={{ storehouseId: String(item.id) }}
                        className="text-decoration-none text-reset"
                      >
                        {cell(item[column])}
                      </Link>
                    ) : (
                      cell(item[column])
                    )}
                  </td>
                ))}
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

/** All storehouses; for warehouse staff and admins only. */
export function StorehousesPage() {
  const { data: user } = useQuery(meQueryOptions)
  const [page, setPage] = useState(0)
  if (!user) return null
  if (!hasRole(user, 'WAREHOUSE') && !hasRole(user, 'ADMIN')) {
    return <p className="text-danger">Only warehouse staff and admins may see the storehouses.</p>
  }

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <PageTitle icon="storehouses">Storehouses</PageTitle>
      </div>
      <StorehousesTable page={page} onPage={setPage} />
    </div>
  )
}
