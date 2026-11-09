import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useState } from 'react'
import { ConfirmModal } from './ConfirmModal'
import {
  SHIPMENT_PACKAGE_TYPES,
  shipmentPackageQueryOptions,
  deleteShipmentItem,
  completeShipmentPackage,
  updateShipmentPackage,
  type ShipmentPackageDto,
} from '../api/shipmentPackages'
import { cell } from '../format'

const route = getRouteApi('/authed/shipment-packages/$shipmentPackageId')

const TYPE_KEYS = ['shipmentPackageType', 'packageType', 'type']
const EDITABLE_KEYS = ['packageNumber', 'length', 'width', 'height']

function EditForm({
  id,
  pack,
  typeKey,
}: {
  id: string
  pack: ShipmentPackageDto
  typeKey: string | undefined
}) {
  const queryClient = useQueryClient()
  const [packageType, setPackageType] = useState(typeKey ? cell(pack[typeKey]) || 'OTHER' : 'OTHER')
  const [packageNumber, setPackageNumber] = useState(cell(pack.packageNumber))
  const [length, setLength] = useState(cell(pack.length))
  const [width, setWidth] = useState(cell(pack.width))
  const [height, setHeight] = useState(cell(pack.height))
  const [notice, setNotice] = useState<{ text: string; failed: boolean } | null>(null)

  const save = useMutation({
    mutationFn: (request: Parameters<typeof updateShipmentPackage>[1]) =>
      updateShipmentPackage(id, request),
    onSuccess: async (message) => {
      setNotice({ text: message, failed: false })
      await queryClient.invalidateQueries({ queryKey: ['shipment-packages'] })
    },
    onError: (failure: Error) => setNotice({ text: failure.message, failed: true }),
  })

  const number = (value: string) => (value.trim() === '' ? null : Number(value))
  const types: readonly string[] = SHIPMENT_PACKAGE_TYPES.includes(packageType as never)
    ? SHIPMENT_PACKAGE_TYPES
    : [packageType, ...SHIPMENT_PACKAGE_TYPES]

  return (
    <form
      className="mt-4"
      onSubmit={(event) => {
        event.preventDefault()
        setNotice(null)
        save.mutate({
          shipmentPackageType: packageType,
          packageNumber: packageNumber.trim() || null,
          length: number(length),
          width: number(width),
          height: number(height),
        })
      }}
    >
      <h4 className="h6">Edit</h4>
      <div className="d-flex flex-column gap-2">
        <label className="form-label mb-0" htmlFor="edit-type">
          packageType
        </label>
        <select
          id="edit-type"
          className="form-select form-select-sm"
          value={packageType}
          onChange={(e) => setPackageType(e.target.value)}
        >
          {types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <label className="form-label mb-0" htmlFor="edit-number">
          packageNumber
        </label>
        <input
          id="edit-number"
          className="form-control form-control-sm"
          value={packageNumber}
          onChange={(e) => setPackageNumber(e.target.value)}
        />
        <label className="form-label mb-0" htmlFor="edit-length">
          length
        </label>
        <input
          id="edit-length"
          type="number"
          min={0}
          step="any"
          className="form-control form-control-sm"
          value={length}
          onChange={(e) => setLength(e.target.value)}
        />
        <label className="form-label mb-0" htmlFor="edit-width">
          width
        </label>
        <input
          id="edit-width"
          type="number"
          min={0}
          step="any"
          className="form-control form-control-sm"
          value={width}
          onChange={(e) => setWidth(e.target.value)}
        />
        <label className="form-label mb-0" htmlFor="edit-height">
          height
        </label>
        <input
          id="edit-height"
          type="number"
          min={0}
          step="any"
          className="form-control form-control-sm"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
        />
        <div className="d-flex align-items-center gap-3 mt-2">
          <button type="submit" className="btn btn-success" disabled={save.isPending}>
            Save
          </button>
          <span
            className={notice?.failed ? 'text-danger' : 'text-success'}
            style={{ minHeight: '1.5rem' }}
            role="status"
          >
            {notice?.text}
          </span>
        </div>
      </div>
    </form>
  )
}

/**
 * The green button under the items: completes the package (`PUT /packing/shipment/{id}/complete`) and
 * shows what the backend answered right below it - the new status on success, the backend's own
 * reason on a refusal (a line that is not PACKED yet, say).
 *
 * Its own component, keyed by the package in the page: the notice belongs to the package it was made
 * for and must not follow the user to the next one.
 */
function CompletePackage({
  id,
  status,
  itemCount,
}: {
  id: string
  status: string | undefined
  itemCount: number
}) {
  const queryClient = useQueryClient()
  const [notice, setNotice] = useState<{ text: string; failed: boolean } | null>(null)
  // Closing a container fixes its contents for good, so the button asks first.
  const [asking, setAsking] = useState(false)
  const complete = useMutation({
    mutationFn: () => completeShipmentPackage(id),
    onSuccess: async (message) => {
      setNotice({ text: message, failed: false })
      await queryClient.invalidateQueries({ queryKey: ['shipment-packages'] })
    },
    onError: (failure: Error) => setNotice({ text: failure.message, failed: true }),
  })

  // The backend refuses both with a message of its own; saying it up front saves the round trip.
  const open = status === undefined || status === 'OPEN'
  const reason = !open
    ? `Only an OPEN package can be completed - this one is ${status}.`
    : itemCount === 0
      ? 'A package without items cannot be completed.'
      : null

  return (
    <div className="mt-3">
      <button
        type="button"
        className="btn btn-success"
        disabled={complete.isPending || reason !== null}
        onClick={() => setAsking(true)}
      >
        {complete.isPending && (
          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
        )}
        Complete container
      </button>
      {asking && (
        <ConfirmModal
          title="Complete container"
          confirmLabel="Complete"
          busy={complete.isPending}
          onCancel={() => setAsking(false)}
          onConfirm={() => {
            setNotice(null)
            complete.mutate(undefined, { onSettled: () => setAsking(false) })
          }}
        >
          Complete this container with {itemCount} item{itemCount === 1 ? '' : 's'}? Once it is
          completed its contents are fixed - no item can be added, changed or taken out any more -
          and it can go into a shipment.
        </ConfirmModal>
      )}
      {reason && <p className="mt-2 mb-0 text-body-secondary small">{reason}</p>}
      {notice && (
        <p
          className={`mt-2 mb-0 ${notice.failed ? 'text-danger' : 'text-success'}`}
          role={notice.failed ? 'alert' : 'status'}
        >
          {notice.text}
        </p>
      )}
    </div>
  )
}

function isRowList(value: unknown): value is ShipmentPackageDto[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((row) => typeof row === 'object' && row !== null)
  )
}

function RowTable({
  rows,
  onDelete,
  deleting,
}: {
  rows: ShipmentPackageDto[]
  onDelete?: (id: string) => void
  deleting?: boolean
}) {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))]

  return (
    <div className="table-responsive">
      <table className="table table-striped table-sm mb-0">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
            {onDelete && <th />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={cell(row.id) || index}>
              {columns.map((column) => (
                <td key={column}>{cell(row[column])}</td>
              ))}
              {onDelete && (
                <td className="text-end">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger border-0 py-0"
                    title="Remove item"
                    aria-label={`Remove item ${cell(row.id)}`}
                    disabled={deleting}
                    onClick={() => onDelete(cell(row.id))}
                  >
                    <svg
                      aria-hidden="true"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 10v6m4-6v6" />
                    </svg>
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** The details of a shipment package, shown below the table; each list (such as `items`) gets a table of its own, everything else is a field. */
export function ShipmentPackageDetailsPage() {
  const { shipmentPackageId } = route.useParams()
  const { data: pack, isPending, error } = useQuery(shipmentPackageQueryOptions(shipmentPackageId))
  const queryClient = useQueryClient()
  const [itemNotice, setItemNotice] = useState<{ text: string; failed: boolean } | null>(null)
  const removeItem = useMutation({
    mutationFn: (packageItemId: string) => deleteShipmentItem(shipmentPackageId, packageItemId),
    onSuccess: async (message) => {
      setItemNotice({ text: message, failed: false })
      await queryClient.invalidateQueries({ queryKey: ['shipment-packages'] })
      await queryClient.invalidateQueries({ queryKey: ['packages'] })
    },
    onError: (failure: Error) => setItemNotice({ text: failure.message, failed: true }),
  })

  const entries = pack ? Object.entries(pack) : []
  const lists = entries.filter(([, value]) => Array.isArray(value))
  const typeKey = TYPE_KEYS.find((key) => pack && key in pack)
  const fields = entries.filter(
    ([key, value]) => !Array.isArray(value) && key !== typeKey && !EDITABLE_KEYS.includes(key),
  )
  const packageNumber = cell(pack?.packageNumber) || 'N/A'

  return (
    <div className="card shadow-sm mt-4">
      <div className="card-body">
        <h3 className="h5">Container {packageNumber}</h3>
        {isPending && <p className="mb-0">Loading details…</p>}
        {error && <p className="mb-0 text-danger">{error.message}</p>}
        {pack && (
          <>
            <dl className="row mb-0">
              {fields.map(([key, value]) => (
                <div key={key} className="row">
                  <dt className="col-sm-3">{key}</dt>
                  <dd className="col-sm-9">{cell(value)}</dd>
                </div>
              ))}
            </dl>
            <EditForm
              key={shipmentPackageId}
              id={shipmentPackageId}
              pack={pack}
              typeKey={typeKey}
            />
            {lists.map(([key, value]) => (
              <section key={key}>
                <h4 className="h6 mt-4">{key}</h4>
                {isRowList(value) ? (
                  <RowTable
                    rows={value}
                    onDelete={
                      key === 'items'
                        ? (id) => {
                            setItemNotice(null)
                            removeItem.mutate(id)
                          }
                        : undefined
                    }
                    deleting={removeItem.isPending}
                  />
                ) : (
                  <p className="text-body-secondary mb-0">
                    {Array.isArray(value) && value.length === 0 ? 'None.' : cell(value)}
                  </p>
                )}
                {key === 'items' && itemNotice && (
                  <p
                    className={`mt-2 mb-0 ${itemNotice.failed ? 'text-danger' : 'text-success'}`}
                    role="status"
                  >
                    {itemNotice.text}
                  </p>
                )}
                {key === 'items' && (
                  <CompletePackage
                    key={shipmentPackageId}
                    id={shipmentPackageId}
                    status={typeof pack.status === 'string' ? pack.status : undefined}
                    itemCount={Array.isArray(value) ? value.length : 0}
                  />
                )}
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
