import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type CSSProperties } from 'react'
import { Link, Outlet } from '@tanstack/react-router'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import { SHIPMENT_PACKAGE_TYPES, shipmentPackagesQueryOptions } from './shipmentPackages'
import { containerChoices, containerFits } from './containerChoices'
import { formatCubicMeters, formatNumber, cell } from '../../shared/lib/format'
import { ORDER_ITEM_STATUSES } from './orderItems'
import {
  addItemsToContainer,
  createShipmentPackage,
  DEFAULT_PACKAGE_STATUS,
  lonelyPackagesQueryOptions,
  packagesQueryOptions,
  type PackageFilter,
} from './packages'
import { entityLinkOf } from '../../shared/lib/entityLinks'
import { PACKAGE_SORT_KEYS, sortStateOf, tableSortOf, type PackageOrder } from './packageSort'
import { lonelyPackageColumns, packageColumns } from './packageColumns'
import { groupByOrder } from './packageGrouping'
import { groupColors } from './rowColors'
import { FulfillmentStatusBadge } from './FulfillmentStatusBadge'
import { toTableSort, useServerTableState } from '../../shared/lib/serverTable'
import { EntityLinkAnchor } from '../../shared/ui/EntityLinkAnchor'
import { Chevron } from '../../shared/ui/Chevron'
import { ordersQueryOptions } from '../orders/orders'
import { searchedOrderNo } from '../picking/pickingOrders'
import { PageTitle } from '../../layout/PageTitle'
import { LoadingBar } from '../../shared/ui/LoadingBar'
import { ServerTable } from '../../shared/ui/ServerTable'

/**
 * A list of package items. Rows that belong to the same order share one pastel colour - the colours of the
 * rainbow, handed out in the order the orders first appear - so the items of an order read as a block, also
 * when the list is sorted by something else.
 */
function PackagesTable({
  options,
  columns,
  selected,
  onToggle,
  pagination,
  sorting,
  onPagination,
  onSorting,
  grouped = false,
}: {
  options: ReturnType<typeof lonelyPackagesQueryOptions>
  columns: typeof packageColumns
  selected: string[]
  onToggle: (id: string, orderNo: string) => void
  pagination: PaginationState
  sorting: SortingState
  onPagination: (next: PaginationState) => void
  onSorting: (next: SortingState) => void
  /** Group the rows by order number, newest first within an order - the default look, while no sort is asked for. */
  grouped?: boolean
}) {
  const { data, isPending, isFetching, error } = useQuery({
    ...options,
    placeholderData: keepPreviousData,
  })
  const items = data && grouped ? groupByOrder(data.content) : (data?.content ?? [])
  const colors = groupColors(
    items.map((item) => item.orderNo as string | number | null | undefined),
  )

  return (
    <ServerTable
      columns={columns}
      data={data && { content: items, total: data.total }}
      isPending={isPending}
      isFetching={isFetching}
      error={error}
      loading="Loading packages…"
      empty="No packages."
      rowId={(item, index) => cell(item.id) || String(index)}
      striped={false}
      // Bootstrap paints a cell from --bs-table-bg; set on the row it reaches every cell of it.
      rowStyle={(_, index) =>
        colors[index] ? ({ '--bs-table-bg': colors[index] } as CSSProperties) : undefined
      }
      leading={{
        render: (item) => (
          <input
            type="checkbox"
            className="form-check-input"
            aria-label={`Select package ${cell(item.id)}`}
            checked={selected.includes(cell(item.id))}
            onChange={() => onToggle(cell(item.id), cell(item.orderNo))}
          />
        ),
      }}
      renderCell={(column, item) => {
        // The order number leads to the order; every other cell, as before, to the package.
        const link = entityLinkOf(column, item[column])
        if (link) return <EntityLinkAnchor link={link} />
        return (
          <Link
            to="/packages/$packageId"
            params={{ packageId: cell(item.id) }}
            className="text-decoration-none text-reset"
          >
            {column === 'fulfillmentStatus' ? (
              <FulfillmentStatusBadge status={item[column]} />
            ) : (
              cell(item[column])
            )}
          </Link>
        )
      }}
      pagination={pagination}
      sorting={sorting}
      onPagination={onPagination}
      onSorting={onSorting}
    />
  )
}

/** All packages, as the backend lists them; a switch on top adds the lonely ones. */
export function PackagesPage() {
  const queryClient = useQueryClient()
  const [showLonely, setShowLonely] = useState(false)
  // The status of the order line the items are listed for. Packed is what waits for a container; '' lists all.
  const [status, setStatus] = useState<string>(DEFAULT_PACKAGE_STATUS)
  const [showForm, setShowForm] = useState(false)
  // The second form puts the chosen items into a container that exists. Only one of the two is open at a time.
  const [showAdd, setShowAdd] = useState(false)
  const [containerId, setContainerId] = useState<number | null>(null)
  const [addNotice, setAddNotice] = useState<{ text: string; failed: boolean } | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  // The order of every ticked item, by item id: a container takes the items of one order only.
  const [orderOf, setOrderOf] = useState<Record<string, string>>({})
  const [packageType, setPackageType] = useState('OTHER')
  const [packageNumber, setPackageNumber] = useState('')
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const toggle = (id: string, orderNo: string) => {
    setOrderOf((current) => ({ ...current, [id]: orderNo }))
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    )
  }
  const chosenOrders = selected.map((id) => orderOf[id] ?? '')
  const [notice, setNotice] = useState<{ text: string; failed: boolean } | null>(null)
  const create = useMutation({
    mutationFn: createShipmentPackage,
    onSuccess: async (message) => {
      setNotice({ text: message, failed: false })
      setSelected([])
      await queryClient.invalidateQueries({ queryKey: ['packages'] })
    },
    onError: (failure: Error) => setNotice({ text: failure.message, failed: true }),
  })
  // Only an OPEN container takes more items, so only those are offered; asked once the form is opened.
  const openContainers = useQuery({
    ...shipmentPackagesQueryOptions({ status: 'OPEN', size: 100, sort: 'id' }),
    enabled: showAdd,
  })
  const choices = containerChoices(openContainers.data?.content ?? [])
  // A container chosen before the items changed may no longer fit them.
  const chosenFits = choices.some(
    (choice) => choice.id === containerId && containerFits(choice, chosenOrders),
  )
  const mixedOrders = new Set(chosenOrders.filter((orderNo) => orderNo !== '')).size > 1
  const add = useMutation({
    mutationFn: ({ id, items }: { id: number; items: number[] }) => addItemsToContainer(id, items),
    onSuccess: async (message) => {
      setAddNotice({ text: message, failed: false })
      setSelected([])
      setContainerId(null)
      await queryClient.invalidateQueries({ queryKey: ['packages'] })
      await queryClient.invalidateQueries({ queryKey: ['shipment-packages'] })
    },
    onError: (failure: Error) => setAddNotice({ text: failure.message, failed: true }),
  })
  const list = useServerTableState()
  const lonely = useServerTableState()
  // Which way the backend's own order runs - when the item was made, then its order number - while no sort is chosen.
  const [defaultOrder, setDefaultOrder] = useState<PackageOrder>('')
  const chosen = sortStateOf(toTableSort(list.sorting))
  const order = chosen.sort === '' ? defaultOrder : chosen.order
  // What the heads mark: the chosen column, or `createdAt` for the backend's own order.
  const marked = tableSortOf(chosen.sort, order)
  const shownSorting: SortingState = marked
    ? [{ id: marked.column, desc: marked.direction === 'desc' }]
    : []
  const sortBy = (next: SortingState) => {
    list.setSorting(next)
    setDefaultOrder('')
  }
  const [search, setSearch] = useState('')
  const orderNo = searchedOrderNo(search)
  // Suggestions for the search: the orders there are.
  const { data: orders } = useQuery(ordersQueryOptions())
  const orderNumbers = [
    ...new Set(
      (orders?.content ?? []).map((row) => cell(row.orderNo)).filter((number) => number !== ''),
    ),
  ].sort()
  const filter: PackageFilter = {
    fulfillmentStatus: status || undefined,
    orderNo,
    page: list.pagination.pageIndex,
    size: list.pagination.pageSize,
    sort: chosen.sort || undefined,
    order: order || undefined,
  }

  return (
    <>
      <div className="card shadow-sm">
        <div className="card-body d-flex flex-wrap gap-2 align-items-center">
          <PageTitle icon="packages" className="me-auto">
            Packages
          </PageTitle>
          <input
            className="form-control form-control-sm w-auto"
            aria-label="Search by order number"
            placeholder="Order number"
            inputMode="numeric"
            list="packages-search-numbers"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              // The matches start at their first page, in both lists.
              list.firstPage()
              lonely.firstPage()
            }}
          />
          <datalist id="packages-search-numbers">
            {orderNumbers.map((number) => (
              <option key={number} value={number} />
            ))}
          </datalist>
          <select
            className="form-select form-select-sm w-auto"
            aria-label="Fulfillment status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              // Page 3 of one status says nothing about another.
              list.firstPage()
              lonely.firstPage()
            }}
          >
            <option value="">All statuses</option>
            {ORDER_ITEM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className="form-select form-select-sm w-auto"
            aria-label="Sort"
            value={chosen.sort === '' ? '' : (list.sorting[0]?.id ?? '')}
            onChange={(e) =>
              sortBy(e.target.value === '' ? [] : [{ id: e.target.value, desc: order === 'DESC' }])
            }
          >
            <option value="">Default order</option>
            {Object.keys(PACKAGE_SORT_KEYS).map((column) => (
              <option key={column} value={column}>
                {column}
              </option>
            ))}
          </select>
          <select
            className="form-select form-select-sm w-auto"
            aria-label="Order"
            value={order}
            onChange={(e) => {
              const next = e.target.value as PackageOrder
              const column = list.sorting[0]?.id
              if (column) {
                list.setSorting([{ id: column, desc: next === 'DESC' }])
              } else {
                setDefaultOrder(next)
                list.firstPage()
              }
            }}
          >
            <option value="">Order</option>
            <option value="ASC">ASC</option>
            <option value="DESC">DESC</option>
          </select>
        </div>
        <PackagesTable
          options={packagesQueryOptions(filter)}
          columns={packageColumns}
          selected={selected}
          onToggle={toggle}
          pagination={list.pagination}
          sorting={shownSorting}
          onPagination={list.setPagination}
          onSorting={sortBy}
          grouped={chosen.sort === ''}
        />
      </div>
      <button
        type="button"
        className="btn btn-outline-secondary btn-sm mt-3"
        aria-pressed={showLonely}
        onClick={() => setShowLonely(!showLonely)}
      >
        {showLonely ? 'Hide' : 'Show'} lonely packages
      </button>
      {showLonely && (
        <div className="card shadow-sm mt-3">
          <div className="card-body">
            <h2 className="h5 mb-0">Lonely packages</h2>
          </div>
          <PackagesTable
            options={lonelyPackagesQueryOptions(
              lonely.pagination.pageIndex,
              status || undefined,
              lonely.pagination.pageSize,
              orderNo,
            )}
            columns={lonelyPackageColumns}
            selected={selected}
            onToggle={toggle}
            pagination={lonely.pagination}
            sorting={lonely.sorting}
            onPagination={lonely.setPagination}
            onSorting={lonely.setSorting}
            grouped
          />
        </div>
      )}
      <Outlet />
      <div className="d-flex flex-wrap gap-2 mt-3">
        <button
          type="button"
          className="btn btn-primary d-inline-flex align-items-center gap-2"
          aria-expanded={showForm}
          aria-controls="create-container-form"
          onClick={() => {
            setShowForm(!showForm)
            setShowAdd(false)
          }}
        >
          Create container
          <Chevron up={showForm} />
        </button>
        <button
          type="button"
          className="btn btn-outline-primary d-inline-flex align-items-center gap-2"
          aria-expanded={showAdd}
          aria-controls="add-to-container-form"
          onClick={() => {
            setShowAdd(!showAdd)
            setShowForm(false)
          }}
        >
          Add to container
          <Chevron up={showAdd} />
        </button>
      </div>
      <div className={showAdd ? 'fold open' : 'fold'}>
        <div className="fold-inner">
          <form
            id="add-to-container-form"
            className="card shadow-sm mt-2"
            onSubmit={(event) => {
              event.preventDefault()
              setAddNotice(null)
              if (containerId !== null && chosenFits)
                add.mutate({ id: containerId, items: selected.map(Number) })
            }}
          >
            <div className="card-body d-flex flex-column gap-2">
              <label className="form-label mb-0" htmlFor="add-items">
                Selected package items
              </label>
              <input
                id="add-items"
                className="form-control form-control-sm"
                readOnly
                value={selected.join(', ')}
              />
              <fieldset className="mt-2">
                <legend className="form-label fs-6 mb-1">Container</legend>
                {mixedOrders && (
                  <p className="small text-warning-emphasis mb-1">
                    The chosen items belong to different orders; no container takes them together.
                  </p>
                )}
                {showAdd && openContainers.isPending && (
                  <LoadingBar label="Loading containers…" className="" />
                )}
                {openContainers.error && (
                  <p className="mb-0 text-danger">{openContainers.error.message}</p>
                )}
                {openContainers.data && choices.length === 0 && (
                  <p className="mb-0 text-body-secondary">
                    There is no open container. Create one first.
                  </p>
                )}
                {choices.length > 0 && (
                  <div className="container-grid table-responsive border rounded">
                    <table className="table table-sm table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th scope="col" />
                          <th scope="col">id</th>
                          <th scope="col">packageNumber</th>
                          <th scope="col">type</th>
                          <th scope="col">orderNo</th>
                          <th scope="col" className="text-end">
                            packages
                          </th>
                          <th scope="col" className="text-end">
                            weight (kg)
                          </th>
                          <th scope="col" className="text-end">
                            volume (m³)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {choices.map((choice) => {
                          const fits = containerFits(choice, chosenOrders)
                          const chosen = containerId === choice.id && fits
                          return (
                            // A click anywhere on the row chooses it, like on the radio itself.
                            <tr
                              key={choice.id}
                              className={
                                chosen ? 'table-active' : fits ? undefined : 'text-body-secondary'
                              }
                              style={
                                fits
                                  ? { cursor: 'pointer' }
                                  : { cursor: 'not-allowed', opacity: 0.5 }
                              }
                              title={
                                fits
                                  ? undefined
                                  : `Holds items of order ${choice.orderNo}; the chosen items belong to another order.`
                              }
                              onClick={() => fits && setContainerId(choice.id)}
                            >
                              <td className="text-center">
                                <input
                                  className="form-check-input"
                                  type="radio"
                                  name="add-container"
                                  aria-label={`Container ${choice.id}`}
                                  checked={chosen}
                                  disabled={!fits}
                                  onChange={() => setContainerId(choice.id)}
                                />
                              </td>
                              <td className={chosen ? 'fw-semibold' : undefined}>{choice.id}</td>
                              <td>{choice.packageNumber}</td>
                              <td>
                                {choice.type && (
                                  <span className="badge text-bg-secondary fw-normal">
                                    {choice.type}
                                  </span>
                                )}
                              </td>
                              <td>
                                {choice.orderNo || (
                                  <span className="text-body-secondary">empty</span>
                                )}
                              </td>
                              <td className="text-end">
                                <span
                                  className={
                                    choice.packages === 0
                                      ? 'badge text-bg-light border'
                                      : 'badge text-bg-primary'
                                  }
                                >
                                  {choice.packages}
                                </span>
                              </td>
                              <td className="text-end">{formatNumber(choice.weight)}</td>
                              <td className="text-end">{formatCubicMeters(choice.volume)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </fieldset>
              <button
                type="submit"
                className="btn btn-success align-self-start mt-2"
                disabled={
                  add.isPending || selected.length === 0 || containerId === null || !chosenFits
                }
              >
                Add
              </button>
            </div>
            <div className="card-footer" style={{ minHeight: '3rem' }} role="status">
              {addNotice && (
                <span className={addNotice.failed ? 'text-danger' : 'text-success'}>
                  {addNotice.text}
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
      <div className={showForm ? 'fold open' : 'fold'}>
        <div className="fold-inner">
          <form
            id="create-container-form"
            className="card shadow-sm mt-2"
            onSubmit={(event) => {
              event.preventDefault()
              setNotice(null)
              const num = (value: string) => (value.trim() === '' ? null : Number(value))
              create.mutate({
                shipmentPackageType: packageType,
                packageItems: selected.map(Number),
                packageNumber: packageNumber.trim() || null,
                length: num(length),
                width: num(width),
                height: num(height),
              })
            }}
          >
            <div className="card-body d-flex flex-column gap-2">
              <label className="form-label mb-0" htmlFor="shipment-items">
                Selected package items
              </label>
              <input
                id="shipment-items"
                className="form-control form-control-sm"
                readOnly
                value={selected.join(', ')}
              />
              <label className="form-label mb-0" htmlFor="shipment-type">
                packageType
              </label>
              <select
                id="shipment-type"
                className="form-select form-select-sm"
                value={packageType}
                onChange={(e) => setPackageType(e.target.value)}
              >
                {SHIPMENT_PACKAGE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <label className="form-label mb-0" htmlFor="shipment-number">
                packageNumber
              </label>
              <input
                id="shipment-number"
                className="form-control form-control-sm"
                value={packageNumber}
                onChange={(e) => setPackageNumber(e.target.value)}
              />
              <label className="form-label mb-0" htmlFor="shipment-length">
                length
              </label>
              <input
                id="shipment-length"
                type="number"
                min={0}
                step="any"
                className="form-control form-control-sm"
                value={length}
                onChange={(e) => setLength(e.target.value)}
              />
              <label className="form-label mb-0" htmlFor="shipment-width">
                width
              </label>
              <input
                id="shipment-width"
                type="number"
                min={0}
                step="any"
                className="form-control form-control-sm"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
              />
              <label className="form-label mb-0" htmlFor="shipment-height">
                height
              </label>
              <input
                id="shipment-height"
                type="number"
                min={0}
                step="any"
                className="form-control form-control-sm"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
              <button
                type="submit"
                className="btn btn-success align-self-start mt-2"
                disabled={create.isPending || selected.length === 0}
              >
                Create
              </button>
            </div>
            <div className="card-footer" style={{ minHeight: '3rem' }} role="status">
              {notice && (
                <span className={notice.failed ? 'text-danger' : 'text-success'}>
                  {notice.text}
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
