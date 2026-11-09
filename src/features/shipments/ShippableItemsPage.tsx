import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Outlet, useNavigate, useParams } from '@tanstack/react-router'
import { useId, useState } from 'react'
import {
  addPackagesToShipment,
  createShipment,
  shipmentsQueryOptions,
  statusBadgeClass,
} from './shipments'
import { shippablePackagesQueryOptions } from './shippablePackages'
import { formatDate, formatMoment, formatNumber } from '../../shared/lib/format'
import { newShipmentRequest, type NewShipmentForm } from './shipmentForm'
import { nextSort, type TableSort } from '../../shared/lib/tableSort'
import { shipmentFits } from './shipmentChoices'
import { Chevron } from '../../shared/ui/Chevron'
import { PageTitle } from '../../layout/PageTitle'
import { Pager } from '../../shared/ui/Pager'
import { SortableHeader } from '../../shared/ui/SortableHeader'

/**
 * The shipment to make of the chosen containers (`POST /shipments`). The customer is not asked: the backend reads it
 * off the contents, and refuses containers of different customers with a message of its own, shown here. A
 * shipment starts in CREATED; its details page is where it goes on.
 */
function CreateShipmentForm({
  selected,
  onCreated,
}: {
  selected: number[]
  onCreated: () => void
}) {
  const ids = useId()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [form, setForm] = useState<NewShipmentForm>({
    shippingAddress: '',
    shippingMethod: '',
    requestedDeliveryDate: '',
  })
  const [problem, setProblem] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: createShipment,
    onSuccess: async (shipment) => {
      await queryClient.invalidateQueries({ queryKey: ['shipments'] })
      onCreated()
      await navigate({ to: '/shipments/$shipmentId', params: { shipmentId: String(shipment.id) } })
    },
  })
  const set = (field: keyof NewShipmentForm) => (value: string) => {
    setProblem(null)
    create.reset()
    setForm((current) => ({ ...current, [field]: value }))
  }

  return (
    <form
      className="card shadow-sm mt-4"
      onSubmit={(event) => {
        event.preventDefault()
        const result = newShipmentRequest(selected, form)
        if (result.error !== undefined) setProblem(result.error)
        else {
          setProblem(null)
          create.mutate(result.request)
        }
      }}
    >
      <div className="card-body">
        <h3 className="h5">Create shipment</h3>
        <p className="small text-body-secondary">
          Tick the containers that go together in the table. They have to belong to one customer.
        </p>
        <div className="row g-3">
          <div className="col-12">
            <label className="form-label" htmlFor={`${ids}-chosen`}>
              Chosen containers
            </label>
            <input
              id={`${ids}-chosen`}
              className="form-control form-control-sm"
              readOnly
              placeholder="None chosen yet"
              value={selected.join(', ')}
            />
          </div>
          <div className="col-12">
            <label className="form-label" htmlFor={`${ids}-address`}>
              Shipping address
            </label>
            <input
              id={`${ids}-address`}
              className="form-control form-control-sm"
              value={form.shippingAddress}
              onChange={(e) => set('shippingAddress')(e.target.value)}
            />
            <div className="form-text">
              Not needed to create it, but the shipment cannot be reported ready without one.
            </div>
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor={`${ids}-method`}>
              Shipping method
            </label>
            <input
              id={`${ids}-method`}
              className="form-control form-control-sm"
              value={form.shippingMethod}
              onChange={(e) => set('shippingMethod')(e.target.value)}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor={`${ids}-date`}>
              Requested delivery date
            </label>
            <input
              id={`${ids}-date`}
              type="date"
              className="form-control form-control-sm"
              value={form.requestedDeliveryDate}
              onChange={(e) => set('requestedDeliveryDate')(e.target.value)}
            />
          </div>
        </div>
        <button
          type="submit"
          className="btn btn-success mt-3"
          disabled={create.isPending || selected.length === 0}
        >
          {create.isPending && (
            <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
          )}
          Create shipment
        </button>
        {(problem || create.error) && (
          <p className="text-danger mt-2 mb-0" role="alert">
            {problem ?? create.error?.message}
          </p>
        )}
      </div>
    </form>
  )
}

/**
 * Puts the ticked containers into a shipment that exists (`POST /shipments/{id}/packages`). Only a CREATED shipment
 * takes more packages, so only those are listed; one of another customer than the containers' is greyed out.
 */
function AddToShipmentForm({
  selected,
  customers,
  open,
  onAdded,
}: {
  selected: number[]
  customers: (number | null)[]
  open: boolean
  onAdded: () => void
}) {
  const queryClient = useQueryClient()
  const [shipmentId, setShipmentId] = useState<number | null>(null)
  const [notice, setNotice] = useState<{ text: string; failed: boolean } | null>(null)
  const shipments = useQuery({
    ...shipmentsQueryOptions({ status: 'CREATED', size: 100, sort: 'id' }),
    enabled: open,
  })
  const rows = shipments.data?.content ?? []
  const mixed = new Set(customers.filter((id) => id !== null)).size > 1
  const chosenFits = rows.some((row) => row.id === shipmentId && shipmentFits(row, customers))
  const add = useMutation({
    mutationFn: ({ id, ids }: { id: number; ids: number[] }) => addPackagesToShipment(id, ids),
    onSuccess: async (shipment) => {
      setNotice({
        text: `Shipment ${shipment.id} now holds ${selected.length === 1 ? 'the container' : `the ${selected.length} containers`}.`,
        failed: false,
      })
      setShipmentId(null)
      onAdded()
      await queryClient.invalidateQueries({ queryKey: ['shipments'] })
    },
    onError: (failure: Error) => setNotice({ text: failure.message, failed: true }),
  })

  return (
    <div className={open ? 'fold open' : 'fold'}>
      <div className="fold-inner">
        <form
          id="add-to-shipment-form"
          className="card shadow-sm mt-2"
          onSubmit={(event) => {
            event.preventDefault()
            setNotice(null)
            if (shipmentId !== null && chosenFits) add.mutate({ id: shipmentId, ids: selected })
          }}
        >
          <div className="card-body d-flex flex-column gap-2">
            <label className="form-label mb-0" htmlFor="add-shipment-containers">
              Chosen containers
            </label>
            <input
              id="add-shipment-containers"
              className="form-control form-control-sm"
              readOnly
              placeholder="None chosen yet"
              value={selected.join(', ')}
            />
            <fieldset className="mt-2">
              <legend className="form-label fs-6 mb-1">Shipment</legend>
              {mixed && (
                <p className="small text-warning-emphasis mb-1">
                  The chosen containers belong to different customers; no shipment takes them
                  together.
                </p>
              )}
              {open && shipments.isPending && (
                <p className="mb-0 text-body-secondary">Loading shipments…</p>
              )}
              {shipments.error && <p className="mb-0 text-danger">{shipments.error.message}</p>}
              {shipments.data && rows.length === 0 && (
                <p className="mb-0 text-body-secondary">
                  There is no shipment in CREATED. Create one first.
                </p>
              )}
              {rows.length > 0 && (
                <div className="container-grid table-responsive border rounded">
                  <table className="table table-sm table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th scope="col" />
                        <th scope="col">id</th>
                        <th scope="col">customer</th>
                        <th scope="col">status</th>
                        <th scope="col">shippingAddress</th>
                        <th scope="col">shippingMethod</th>
                        <th scope="col">requestedDeliveryDate</th>
                        <th scope="col" className="text-end">
                          packages
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const fits = shipmentFits(row, customers)
                        const chosen = shipmentId === row.id && fits
                        return (
                          // A click anywhere on the row chooses it, like on the radio itself.
                          <tr
                            key={row.id}
                            className={
                              chosen ? 'table-active' : fits ? undefined : 'text-body-secondary'
                            }
                            style={
                              fits ? { cursor: 'pointer' } : { cursor: 'not-allowed', opacity: 0.5 }
                            }
                            title={
                              fits
                                ? undefined
                                : `Belongs to customer ${row.customerName ?? row.customerId}; the chosen containers belong to another.`
                            }
                            onClick={() => fits && setShipmentId(row.id)}
                          >
                            <td className="text-center">
                              <input
                                className="form-check-input"
                                type="radio"
                                name="add-shipment"
                                aria-label={`Shipment ${row.id}`}
                                checked={chosen}
                                disabled={!fits}
                                onChange={() => setShipmentId(row.id)}
                              />
                            </td>
                            <td className={chosen ? 'fw-semibold' : undefined}>{row.id}</td>
                            <td>{row.customerName ?? row.customerId ?? ''}</td>
                            <td>
                              <span className={statusBadgeClass(row.status)}>{row.status}</span>
                            </td>
                            <td>{row.shippingAddress ?? ''}</td>
                            <td>{row.shippingMethod ?? ''}</td>
                            <td className="text-nowrap">{formatDate(row.requestedDeliveryDate)}</td>
                            <td className="text-end">
                              <span className="badge text-bg-primary">{row.packageCount}</span>
                            </td>
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
                add.isPending || selected.length === 0 || shipmentId === null || !chosenFits
              }
            >
              Add
            </button>
          </div>
          <div className="card-footer" style={{ minHeight: '3rem' }} role="status">
            {notice && (
              <span className={notice.failed ? 'text-danger' : 'text-success'}>{notice.text}</span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * The containers that are `PACKED` and in no shipment yet - what logistics may still put into one
 * (`GET /shipments/packages`). A click on a row opens what is in it below the table.
 */
export function ShippableItemsPage() {
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<TableSort | null>(null)
  const navigate = useNavigate()
  // The container whose details are open is the one in the address - /shippable-items/{id}.
  const { packageId } = useParams({ strict: false })
  const openId = packageId === undefined ? null : Number(packageId)
  const toggleOpen = (id: number) =>
    id === openId
      ? navigate({ to: '/shippable-items' })
      : navigate({ to: '/shippable-items/$packageId', params: { packageId: String(id) } })
  // The containers ticked for a shipment, by id: they stay chosen over pages and sorts.
  const [selected, setSelected] = useState<number[]>([])
  const toggle = (id: number, customerId: number | null) => {
    setCustomerOf((current) => ({ ...current, [id]: customerId }))
    toggleSelected(id)
  }
  const toggleSelected = (id: number) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    )
  const { data, isPending, error } = useQuery(shippablePackagesQueryOptions(page, sort))
  // The customer of every ticked container, by id: a shipment takes the containers of one customer only.
  const [customerOf, setCustomerOf] = useState<Record<number, number | null>>({})
  const [showAdd, setShowAdd] = useState(false)
  const customers = selected.map((id) => customerOf[id] ?? null)

  const sortBy = (column: string) => {
    setSort(nextSort(sort, column))
    // Page 3 of one order says nothing about another.
    setPage(0)
  }

  return (
    <>
      <div className="card shadow-sm">
        <div className="card-body">
          <PageTitle icon="shippable-items">Shippable Items</PageTitle>
        </div>
        {isPending && <p className="p-3 mb-0">Loading containers…</p>}
        {error && <p className="p-3 mb-0 text-danger">{error.message}</p>}
        {data && data.content.length === 0 && (
          <p className="p-3 mb-0 text-body-secondary">Nothing is ready for shipment.</p>
        )}
        {data && data.content.length > 0 && (
          <>
            <div className="table-responsive">
              <table className="table table-striped table-hover table-sm mb-0">
                <thead>
                  <tr>
                    <th />
                    <SortableHeader label="id" column="id" sort={sort} onSort={sortBy} />
                    <SortableHeader
                      label="packageNumber"
                      column="packageNumber"
                      sort={sort}
                      onSort={sortBy}
                    />
                    <SortableHeader label="type" column="type" sort={sort} onSort={sortBy} />
                    <SortableHeader
                      label="packedAt"
                      column="packedAt"
                      sort={sort}
                      onSort={sortBy}
                    />
                    <th>customer</th>
                    <th>dueDate</th>
                    <SortableHeader
                      label="weight (kg)"
                      column="weight"
                      sort={sort}
                      onSort={sortBy}
                      className="text-end"
                    />
                    <th className="text-end">items</th>
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((row) => (
                    <tr
                      key={row.id}
                      role="button"
                      tabIndex={0}
                      className={row.id === openId ? 'table-active' : undefined}
                      aria-expanded={row.id === openId}
                      onClick={() => toggleOpen(row.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          void toggleOpen(row.id)
                        }
                      }}
                    >
                      <td
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="form-check-input"
                          aria-label={`Select container ${row.packageNumber ?? row.id}`}
                          checked={selected.includes(row.id)}
                          onChange={() => toggle(row.id, row.customerId)}
                        />
                      </td>
                      <td>{row.id}</td>
                      <td>{row.packageNumber ?? ''}</td>
                      <td>{row.type ?? ''}</td>
                      <td>
                        <small className="text-body-secondary text-nowrap">
                          {formatMoment(row.packedAt)}
                        </small>
                      </td>
                      <td>{row.customerId ?? ''}</td>
                      <td className="text-nowrap">{formatDate(row.dueDate)}</td>
                      <td className="text-end">{formatNumber(row.weight)}</td>
                      <td className="text-end">{row.packages}</td>
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
      <Outlet />
      <button
        type="button"
        className="btn btn-outline-primary mt-4 d-inline-flex align-items-center gap-2"
        aria-expanded={showAdd}
        aria-controls="add-to-shipment-form"
        onClick={() => setShowAdd(!showAdd)}
      >
        Add to Shipment
        <Chevron up={showAdd} />
      </button>
      <AddToShipmentForm
        selected={selected}
        customers={customers}
        open={showAdd}
        onAdded={() => setSelected([])}
      />
      <CreateShipmentForm selected={selected} onCreated={() => setSelected([])} />
    </>
  )
}
