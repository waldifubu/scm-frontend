import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { meQueryOptions } from '../auth/auth'
import { storehousesQueryOptions } from './storehouses'
import { StorehouseEditForm } from './StorehouseEditForm'
import { NewRuleIcon, NewRuleToggle } from '../rules/RuleParts'
import { hasRole } from '../../shared/api/types'
import { PageTitle } from '../../layout/PageTitle'
import { Pager } from '../../shared/ui/Pager'
import { cell } from '../../shared/lib/format'

function StorehousesTable({
  page,
  onPage,
  editingId,
  onEdit,
}: {
  page: number
  onPage: (page: number) => void
  editingId: number | null
  onEdit: (id: number) => void
}) {
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
              <th />
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
                        params={{ storehouseId: cell(item.id) }}
                        className="text-decoration-none text-reset"
                      >
                        {cell(item[column])}
                      </Link>
                    ) : (
                      cell(item[column])
                    )}
                  </td>
                ))}
                <td className="text-end">
                  {typeof item.id === 'number' && (
                    <button
                      type="button"
                      className={`btn btn-sm ${
                        item.id === editingId ? 'btn-primary' : 'btn-outline-primary'
                      }`}
                      onClick={() => onEdit(item.id as number)}
                    >
                      Edit
                    </button>
                  )}
                </td>
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
  const [editingId, setEditingId] = useState<number | null>(null)
  const allowed = !!user && (hasRole(user, 'WAREHOUSE') || hasRole(user, 'ADMIN'))
  // The same query the table runs, so the form reads the row from the cache and follows a save.
  const { data } = useQuery({ ...storehousesQueryOptions(page), enabled: allowed })
  if (!user) return null
  if (!allowed) {
    return <p className="text-danger">Only warehouse staff and admins may see the storehouses.</p>
  }
  const editing = data?.content.find((row) => row.id === editingId)

  return (
    <>
      <div className="card shadow-sm">
        <div className="card-body">
          <PageTitle icon="storehouses">Storehouses</PageTitle>
        </div>
        <StorehousesTable
          page={page}
          onPage={setPage}
          editingId={editingId}
          onEdit={setEditingId}
        />
      </div>
      {editing && typeof editing.id === 'number' && (
        <div className="card shadow-sm mt-4">
          <div className="card-body">
            <StorehouseEditForm
              key={JSON.stringify(editing)}
              storehouse={editing as typeof editing & { id: number }}
              onClose={() => setEditingId(null)}
            />
          </div>
        </div>
      )}
      <NewRuleToggle label="New Storehouse" formId="new-storehouse-form" icon={<NewRuleIcon />}>
        {(close) => <StorehouseEditForm onClose={close} />}
      </NewRuleToggle>
    </>
  )
}
