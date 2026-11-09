import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type CSSProperties } from 'react'
import { Link, Outlet } from '@tanstack/react-router'
import { SHIPMENT_PACKAGE_TYPES, shipmentPackagesQueryOptions } from '../api/shipmentPackages'
import { containerChoices, containerFits } from '../containerChoices'
import { formatCubicMeters, formatNumber, cell } from '../format'
import { ORDER_ITEM_STATUSES } from '../api/orderItems'
import {
  addItemsToContainer,
  createShipmentPackage,
  DEFAULT_PACKAGE_STATUS,
  lonelyPackagesQueryOptions,
  packagesQueryOptions,
  type PackageFilter,
} from '../api/packages'
import { entityLinkOf } from '../entityLinks'
import { PACKAGE_SORT_KEYS, sortStateOf, tableSortOf } from '../packageSort'
import { groupByOrder } from '../packageGrouping'
import { groupColors } from '../rowColors'
import { nextSort, type TableSort } from '../tableSort'
import { EntityLinkAnchor } from './EntityLinkAnchor'
import { Chevron } from './Chevron'
import { PageTitle } from './PageTitle'
import { Pager } from './Pager'
import { SortableHeader } from './SortableHeader'

const HIDDEN_COLUMNS = new Set(['sku', 'runNo'])

/**
 * A list of package items. Rows that belong to the same order share one pastel colour - the colours of the
 * rainbow, handed out in the order the orders first appear - so the items of an order read as a block, also
 * when the list is sorted by something else. With `sort` and `onSort` the heads of the columns the backend can
 * sort by are clickable; without them the table is as it was.
 */
function PackagesTable({
  options,
  selected,
  onToggle,
  sort,
  onSort,
  onPage,
  grouped = false,
}: {
  options: ReturnType<typeof lonelyPackagesQueryOptions>
  selected: string[]
  onToggle: (id: string, orderNo: string) => void
  sort?: TableSort | null
  onSort?: (column: string) => void
  /** With it, the footer has buttons to the page before and after; without, it only reports the figures. */
  onPage?: (page: number) => void
  /** Group the rows by order number, newest first within an order - the default look, while no sort is asked for. */
  grouped?: boolean
}) {
  const { data, isPending, error } = useQuery(options)

  if (isPending) return <p className="p-3 mb-0">Loading packages…</p>
  if (error) return <p className="p-3 mb-0 text-danger">{error.message}</p>
  const items = grouped ? groupByOrder(data.content) : data.content
  if (items.length === 0) return <p className="p-3 mb-0 text-body-secondary">No packages.</p>

  const columns = [...new Set(items.flatMap((item) => Object.keys(item)))].filter(
    (c) => !HIDDEN_COLUMNS.has(c),
  )
  const colors = groupColors(
    items.map((item) => item.orderNo as string | number | null | undefined),
  )

  return (
    <>
      <div className="table-responsive">
        {/* No table-striped: the colour of a row is its order's, a stripe on top of it would read as a second group. */}
        <table className="table table-sm mb-0">
          <thead>
            <tr>
              <th />
              {columns.map((column) =>
                onSort && PACKAGE_SORT_KEYS[column] !== undefined ? (
                  <SortableHeader
                    key={column}
                    label={column}
                    column={column}
                    sort={sort ?? null}
                    onSort={onSort}
                  />
                ) : (
                  <th key={column}>{column}</th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr
                key={cell(item.id) || index}
                // Bootstrap paints a cell from --bs-table-bg; set on the row it reaches every cell of it.
                style={
                  colors[index] ? ({ '--bs-table-bg': colors[index] } as CSSProperties) : undefined
                }
              >
                <td>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    aria-label={`Select package ${cell(item.id)}`}
                    checked={selected.includes(cell(item.id))}
                    onChange={() => onToggle(cell(item.id), cell(item.orderNo))}
                  />
                </td>
                {columns.map((column) => {
                  // The order number leads to the order; every other cell, as before, to the package.
                  const link = entityLinkOf(column, item[column])
                  return (
                    <td key={column}>
                      {link ? (
                        <EntityLinkAnchor link={link} />
                      ) : (
                        <Link
                          to="/packages/$packageId"
                          params={{ packageId: cell(item.id) }}
                          className="text-decoration-none text-reset"
                        >
                          {cell(item[column])}
                        </Link>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="row justify-content-end small text-body-secondary px-2 mt-2 mb-2">
        {onPage && (
          <dd className="col-auto mb-0 me-auto">
            <Pager page={data.page} size={data.size} total={data.total} onPage={onPage} />
          </dd>
        )}
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

/** All packages, as the backend lists them; a switch on top adds the lonely ones. */
export function PackagesPage() {
  const queryClient = useQueryClient()
  const [showLonely, setShowLonely] = useState(false)
  const [lonelyPage, setLonelyPage] = useState(0)
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
  const [page, setPage] = useState('')
  const [size, setSize] = useState('')
  // Empty: no sort is asked for, and the backend's own order applies - when the item was made, then its order number.
  const [sort, setSort] = useState('')
  const [order, setOrder] = useState<'ASC' | 'DESC' | ''>('')
  const filter: PackageFilter = {
    fulfillmentStatus: status || undefined,
    page: page === '' ? undefined : Number(page),
    size: size === '' ? undefined : Number(size),
    sort: sort.trim() || undefined,
    order: order || undefined,
  }
  // The heads of the table and the two fields above it are one state: a click on a head fills the fields,
  // and a key typed into them marks its column.
  const tableSort = tableSortOf(sort, order)
  // No sort asked for: the rows are shown grouped by order, the newest first within it.
  const grouped = sort.trim() === ''
  const sortBy = (column: string) => {
    const next = sortStateOf(nextSort(tableSort, column))
    setSort(next.sort)
    setOrder(next.order)
    setPage('')
  }

  return (
    <>
      <div className="card shadow-sm">
        <div className="card-body d-flex flex-wrap gap-2 align-items-center">
          <PageTitle icon="packages" className="me-auto">
            Packages
          </PageTitle>
          <select
            className="form-select form-select-sm w-auto"
            aria-label="Fulfillment status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              // Page 3 of one status says nothing about another.
              setPage('')
              setLonelyPage(0)
            }}
          >
            <option value="">All statuses</option>
            {ORDER_ITEM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
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
          <input
            className="form-control form-control-sm"
            style={{ width: '8rem' }}
            placeholder="sort"
            aria-label="Sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          />
          <select
            className="form-select form-select-sm w-auto"
            aria-label="Order"
            value={order}
            onChange={(e) => setOrder(e.target.value as 'ASC' | 'DESC' | '')}
          >
            <option value="">Order</option>
            <option value="ASC">ASC</option>
            <option value="DESC">DESC</option>
          </select>
        </div>
        <PackagesTable
          options={packagesQueryOptions(filter)}
          selected={selected}
          onToggle={toggle}
          sort={grouped ? null : tableSort}
          onSort={sortBy}
          grouped={grouped}
          onPage={(next) => setPage(String(next))}
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
            options={lonelyPackagesQueryOptions(lonelyPage, status || undefined)}
            selected={selected}
            onToggle={toggle}
            onPage={setLonelyPage}
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
                  <p className="mb-0 text-body-secondary">Loading containers…</p>
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
