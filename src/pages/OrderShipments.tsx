import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { meQueryOptions } from '../api/auth'
import { orderShipmentsQueryOptions } from '../api/orderShipments'
import { statusBadgeClass } from '../api/shipments'
import { hasRole } from '../api/types'
import { formatMoment } from '../format'

/**
 * The shipments an order travels in: status, tracking number, address, when it left and arrived, and which of
 * the order's packages are in it. Shown for an order that is in shipments (`showsShipments`). The carrier's name
 * comes from the backend for staff only; a customer's rows simply have none. Only the planning side may open a
 * shipment's page, so only they get the link.
 */
export function OrderShipments({ orderNumber }: { orderNumber: string }) {
  const { data: user } = useQuery(meQueryOptions)
  const { data: shipments, isPending, error } = useQuery(orderShipmentsQueryOptions(orderNumber))
  const opensShipment = user != null && (hasRole(user, 'LOGISTICS') || hasRole(user, 'ADMIN'))
  const showsCarrier = (shipments ?? []).some((shipment) => shipment.distributorName !== undefined)

  return (
    <>
      <h4 className="h6 mt-4">Shipments</h4>
      {isPending && <p className="mb-0">Loading shipments…</p>}
      {error && <p className="mb-0 text-danger">{error.message}</p>}
      {shipments && shipments.length === 0 && <p className="text-body-secondary mb-0">No shipment yet.</p>}
      {shipments && shipments.length > 0 && (
        <div className="table-responsive">
          <table className="table table-sm mb-0">
            <thead>
              <tr>
                <th>shipment</th>
                <th>status</th>
                <th>packages</th>
                <th>tracking</th>
                <th>address</th>
                <th>shipped</th>
                <th>delivered</th>
                {showsCarrier && <th>carrier</th>}
              </tr>
            </thead>
            <tbody>
              {shipments.map((shipment) => (
                <tr key={shipment.id}>
                  <td>
                    {opensShipment ? (
                      <Link to="/shipments/$shipmentId" params={{ shipmentId: String(shipment.id) }}>
                        {shipment.id}
                      </Link>
                    ) : (
                      shipment.id
                    )}
                  </td>
                  <td>
                    <span className={`badge ${statusBadgeClass(shipment.status)}`}>{shipment.status}</span>
                  </td>
                  <td>{shipment.packageNumbers.join(', ')}</td>
                  <td>{shipment.trackingNumber ?? ''}</td>
                  <td>{shipment.shippingAddress ?? ''}</td>
                  <td>{formatMoment(shipment.shippedAt)}</td>
                  <td>{formatMoment(shipment.deliveredAt)}</td>
                  {showsCarrier && <td>{shipment.distributorName ?? ''}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
