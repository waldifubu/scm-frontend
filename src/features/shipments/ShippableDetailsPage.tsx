import { useQuery } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { shippableByIdQueryOptions, type ShippablePackage } from './shippablePackages'
import {
  formatCubicMeters,
  formatDate,
  formatDimensions,
  formatMoment,
  formatNumber,
} from '../../shared/lib/format'
import { EntityLinkAnchor } from '../../shared/ui/EntityLinkAnchor'

const route = getRouteApi('/authed/shippable-items/$packageId')

/** What a container holds, and where it stands: the details of one row, read off the row itself. */
function ShippableDetails({ row, onClose }: { row: ShippablePackage; onClose: () => void }) {
  return (
    <div className="card shadow-sm mt-4">
      <div className="card-body">
        <div className="d-flex align-items-center mb-2">
          <h3 className="h5 mb-0 me-auto">Container {row.packageNumber ?? row.id}</h3>
          <span className="badge text-bg-success me-3">{row.status}</span>
          <button
            type="button"
            className="btn-close"
            aria-label="Close the details"
            onClick={onClose}
          />
        </div>
        <dl className="row mb-0">
          <dt className="col-sm-3">customer</dt>
          <dd className="col-sm-9">{row.customerId ?? ''}</dd>
          <dt className="col-sm-3">type</dt>
          <dd className="col-sm-9">{row.type ?? ''}</dd>
          <dt className="col-sm-3">packed</dt>
          <dd className="col-sm-9">{formatMoment(row.packedAt)}</dd>
          <dt className="col-sm-3">due date</dt>
          <dd className="col-sm-9">{formatDate(row.dueDate)}</dd>
          <dt className="col-sm-3">weight</dt>
          <dd className="col-sm-9">
            {formatNumber(row.weight)} kg
            {row.packageWeight != null && (
              <span className="text-body-secondary">
                {' '}
                ({formatNumber(row.packageWeight)} kg with the{' '}
                {row.type ? 'tare of its type' : 'tare'})
              </span>
            )}
          </dd>
          <dt className="col-sm-3">dimensions</dt>
          <dd className="col-sm-9">
            {formatDimensions(row.length, row.width, row.height)}
            {row.volume != null && (
              <span className="text-body-secondary">
                {' '}
                — volume {formatCubicMeters(row.volume)} m³
              </span>
            )}
          </dd>
        </dl>
        <h4 className="h6 mt-4">Items</h4>
        {row.items.length === 0 ? (
          <p className="text-body-secondary mb-0">Nothing in this container.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped table-sm mb-0">
              <thead>
                <tr>
                  <th>orderNo</th>
                  <th>sku</th>
                  <th className="text-end">quantity</th>
                  <th className="text-end">of the line</th>
                  <th>status</th>
                </tr>
              </thead>
              <tbody>
                {row.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.orderNo != null ? (
                        <EntityLinkAnchor link={{ kind: 'order', orderNo: String(item.orderNo) }} />
                      ) : (
                        ''
                      )}
                    </td>
                    <td>
                      {item.sku ? <EntityLinkAnchor link={{ kind: 'sku', sku: item.sku }} /> : ''}
                    </td>
                    <td className="text-end">{item.quantity ?? ''}</td>
                    <td className="text-end">{item.totalQuantity ?? ''}</td>
                    <td>{item.fulfillmentStatus ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * One container, by the id in the address (`/shippable-items/{id}`), read with `GET /shipment-packages/{id}`. Its status
 * is shown, so a container that has gone into a shipment meanwhile does not pass for a free one.
 */
export function ShippableDetailsPage() {
  const { packageId } = route.useParams()
  const navigate = useNavigate()
  const { data: row, isPending, error } = useQuery(shippableByIdQueryOptions(packageId))
  const close = () => navigate({ to: '/shippable-items' })

  if (isPending) return <p className="mt-4 mb-0">Loading container…</p>
  if (error) return <p className="mt-4 mb-0 text-danger">{error.message}</p>
  if (!row) {
    return <p className="mt-4 mb-0 text-body-secondary">There is no container {packageId}.</p>
  }
  return <ShippableDetails key={row.id} row={row} onClose={close} />
}
