import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { NewRuleIcon, NewRuleToggle } from './RuleParts'
import { DistributorRuleForm } from './DistributorRuleForm'
import { meQueryOptions } from '../auth/auth'
import { distributorRulesQueryOptions, rangeLabel } from './rules'
import { hasRole } from '../../shared/api/types'
import { PageTitle } from '../../layout/PageTitle'
import { Pager } from '../../shared/ui/Pager'
import { SortableHeader } from '../../shared/ui/SortableHeader'
import { nextSort, type TableSort } from '../../shared/lib/tableSort'
import { LoadingBar } from '../../shared/ui/LoadingBar'

/** A condition the rule leaves open matches everything - the table says so instead of showing an empty cell. */
function Any({ text }: { text: string }) {
  return <span className="text-body-secondary">{text}</span>
}

/**
 * Which carrier a shipment goes to (`GET /distributor-rules`), for admins only. The rule that sets the most
 * conditions wins, then the higher priority. Weight is in kg, volume in cm³, bounds are `[min, max)`.
 */
export function DistributorRulesPage() {
  const { data: me } = useQuery(meQueryOptions)
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<TableSort | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const isAdmin = !!me && hasRole(me, 'ADMIN')
  const { data, isPending, error } = useQuery({
    ...distributorRulesQueryOptions(page, sort),
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
          <PageTitle icon="distributor-rules">Distributor Rules</PageTitle>
        </div>
        {isPending && <LoadingBar label="Loading rules…" />}
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
                      label="distributor"
                      column="distributor"
                      sort={sort}
                      onSort={onSort}
                    />
                    <SortableHeader
                      label="customer"
                      column="customer"
                      sort={sort}
                      onSort={onSort}
                    />
                    <SortableHeader label="weight" column="weight" sort={sort} onSort={onSort} />
                    <SortableHeader label="volume" column="volume" sort={sort} onSort={onSort} />
                    <SortableHeader
                      label="priority"
                      column="priority"
                      sort={sort}
                      onSort={onSort}
                    />
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((rule) => {
                    const weight = rangeLabel(rule.minWeight, rule.maxWeight, 'kg')
                    const volume = rangeLabel(rule.minVolume, rule.maxVolume, 'cm³')
                    return (
                      <tr
                        key={rule.id}
                        className={rule.id === selectedId ? 'table-active' : undefined}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedId(rule.id)}
                      >
                        <td>{rule.id}</td>
                        <td>{rule.distributorName}</td>
                        <td>{rule.customerName ?? <Any text="any" />}</td>
                        <td>{weight || <Any text="any" />}</td>
                        <td>{volume || <Any text="any" />}</td>
                        <td>{rule.priority}</td>
                      </tr>
                    )
                  })}
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
            <DistributorRuleForm key={JSON.stringify(selected)} rule={selected} />
          </div>
        </div>
      )}
      <NewRuleToggle label="New Rule" formId="new-distributor-rule-form" icon={<NewRuleIcon />}>
        {(close) => <DistributorRuleForm onDone={close} />}
      </NewRuleToggle>
    </>
  )
}
