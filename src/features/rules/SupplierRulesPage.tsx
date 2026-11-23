import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { NewRuleIcon, NewRuleToggle } from './RuleParts'
import { SupplierRuleForm } from './SupplierRuleForm'
import { meQueryOptions } from '../auth/auth'
import { supplierRulesQueryOptions } from './rules'
import { hasRole } from '../../shared/api/types'
import { PageTitle } from '../../layout/PageTitle'
import { Pager } from '../../shared/ui/Pager'
import { SortableHeader } from '../../shared/ui/SortableHeader'
import { nextSort, type TableSort } from '../../shared/lib/tableSort'

/** A condition the rule leaves open matches everything - the table says so instead of showing an empty cell. */
function Any() {
  return <span className="text-body-secondary">any</span>
}

/**
 * Which supplier a component request goes to (`GET /supplier-rules`), for admins only. The most specific rule wins:
 * one naming a component beats one naming a product, and the higher priority decides between equals.
 */
export function SupplierRulesPage() {
  const { data: me } = useQuery(meQueryOptions)
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<TableSort | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const isAdmin = !!me && hasRole(me, 'ADMIN')
  const { data, isPending, error } = useQuery({
    ...supplierRulesQueryOptions(page, sort),
    enabled: isAdmin,
  })
  const onSort = (column: string) => {
    setSort((current) => nextSort(current, column))
    setPage(0)
  }
  if (!me) return null
  if (!isAdmin) return <p className="text-danger">Only admins may see the rules.</p>

  const selected = data?.content.find((rule) => rule.id === selectedId)

  return (
    <>
      <div className="card shadow-sm">
        <div className="card-body">
          <PageTitle icon="supplier-rules">Supplier Rules</PageTitle>
        </div>
        {isPending && <p className="p-3 mb-0">Loading rules…</p>}
        {error && <p className="p-3 mb-0 text-danger">{error.message}</p>}
        {data && data.content.length === 0 && (
          <p className="p-3 mb-0 text-body-secondary">No rules.</p>
        )}
        {data && data.content.length > 0 && (
          <>
            <div className="table-responsive">
              <table className="table table-striped table-sm mb-0">
                <thead>
                  <tr>
                    <SortableHeader label="id" column="id" sort={sort} onSort={onSort} />
                    <SortableHeader
                      label="supplier"
                      column="supplier"
                      sort={sort}
                      onSort={onSort}
                    />
                    <SortableHeader
                      label="component"
                      column="component"
                      sort={sort}
                      onSort={onSort}
                    />
                    <SortableHeader label="product" column="product" sort={sort} onSort={onSort} />
                    <SortableHeader
                      label="priority"
                      column="priority"
                      sort={sort}
                      onSort={onSort}
                    />
                    <SortableHeader
                      label="createdAt"
                      column="createdAt"
                      sort={sort}
                      onSort={onSort}
                    />
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((rule) => (
                    <tr
                      key={rule.id}
                      className={rule.id === selectedId ? 'table-active' : undefined}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedId(rule.id)}
                    >
                      <td>{rule.id}</td>
                      <td>{rule.supplierName}</td>
                      <td>{rule.componentName ?? <Any />}</td>
                      <td>{rule.productName ?? <Any />}</td>
                      <td>{rule.priority}</td>
                      <td>{rule.createdAt ? rule.createdAt.replace('T', ' ').slice(0, 19) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="row justify-content-end small text-body-secondary px-2 mt-2 mb-2">
              <dd className="col-auto mb-0 me-auto">
                <Pager page={data.page} size={data.size} total={data.total} onPage={setPage} />
              </dd>
              <dt className="col-auto">total</dt>
              <dd className="col-auto">{data.total}</dd>
              <dt className="col-auto">page</dt>
              <dd className="col-auto">{data.page}</dd>
              <dt className="col-auto">size</dt>
              <dd className="col-auto">{data.size}</dd>
            </dl>
          </>
        )}
      </div>
      {selected && (
        <div className="card shadow-sm mt-4">
          <div className="card-body">
            <SupplierRuleForm key={JSON.stringify(selected)} rule={selected} />
          </div>
        </div>
      )}
      <NewRuleToggle label="New Rule" formId="new-supplier-rule-form" icon={<NewRuleIcon />}>
        {(close) => <SupplierRuleForm onDone={close} />}
      </NewRuleToggle>
    </>
  )
}
