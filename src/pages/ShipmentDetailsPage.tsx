import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useState } from 'react'
import {
  canAssignDistributor,
  canReportReady,
  reportShipmentReady,
  shipmentQueryOptions,
  showsAssignButton,
  statusBadgeClass,
  totalVolume,
} from '../api/shipments'
import { formatCubicMeters, formatDimensions, formatMoment, formatNumber } from '../format'
import { shipmentFields } from '../shipmentFields'
import { AssignDistributorModal } from './AssignDistributorModal'
import { ConfirmModal } from './ConfirmModal'
import { LinkedValue } from './EntityLinkAnchor'
import { ShipmentDataForm } from './ShipmentDataForm'

const route = getRouteApi('/authed/shipments/$shipmentId')

/** One shipment: its data, the packages it carries and what is in them. */
export function ShipmentDetailsPage() {
  const { shipmentId } = route.useParams()
  const { data: shipment, isPending, error } = useQuery(shipmentQueryOptions(shipmentId))
  const [assigning, setAssigning] = useState(false)
  const queryClient = useQueryClient()
  // Reporting ready moves the order lines and their orders on, so it asks first.
  const [askingReady, setAskingReady] = useState(false)
  const ready = useMutation({
    mutationFn: () => reportShipmentReady(shipmentId),
    onSuccess: async () => {
      setNotice('The shipment is READY. Now hand it to a distributor.')
      await queryClient.invalidateQueries({ queryKey: ['shipments'] })
      await queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
  const [notice, setNotice] = useState<string | null>(null)
  const [dataNotice, setDataNotice] = useState<string | null>(null)

  const items = (shipment?.packages ?? []).flatMap((pack) =>
    pack.items.map((item) => ({ pack, item })),
  )

  return (
    <div className="card shadow-sm mt-4">
      <div className="card-body">
        <h3 className="h5 d-flex align-items-center gap-2">
          Shipment {shipmentId}
          {shipment && (
            <span className={`badge ${statusBadgeClass(shipment.status)}`}>{shipment.status}</span>
          )}
        </h3>
        {isPending && <p className="mb-0">Loading details…</p>}
        {error && <p className="mb-0 text-danger">{error.message}</p>}
        {shipment && (
          <>
            <dl className="row mb-0">
              {shipmentFields(shipment).map(([label, value]) => (
                <div key={label} className="row">
                  <dt className="col-sm-4">{label}</dt>
                  <dd className="col-sm-8">{value}</dd>
                </div>
              ))}
            </dl>

            {/* Keyed by what the shipment holds, so a change made elsewhere (a reload, another tab) replaces what is typed. */}
            <ShipmentDataForm
              key={[
                shipment.status,
                shipment.shippingAddress,
                shipment.shippingMethod,
                shipment.requestedDeliveryDate,
                shipment.comment,
              ].join('\u0000')}
              shipment={shipment}
              notice={dataNotice}
              onNotice={setDataNotice}
            />

            <section>
              <h4 className="h6 mt-4">packages</h4>
              {shipment.packages.length === 0 ? (
                <p className="text-body-secondary mb-0">None.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped table-sm mb-0">
                    <thead>
                      <tr>
                        <th>id</th>
                        <th>packageNumber</th>
                        <th>status</th>
                        <th>type</th>
                        <th className="text-nowrap">size (l × w × h)</th>
                        <th className="text-end">weight (kg)</th>
                        <th className="text-end">volume (m³)</th>
                        <th className="text-end">items</th>
                        <th>packedAt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shipment.packages.map((pack) => (
                        <tr key={pack.id}>
                          <td>{pack.id}</td>
                          <td>{pack.packageNumber ?? ''}</td>
                          <td>{pack.status}</td>
                          <td>{pack.type ?? ''}</td>
                          <td className="text-nowrap">
                            {formatDimensions(pack.length, pack.width, pack.height)}
                          </td>
                          <td className="text-end">{formatNumber(pack.weight)}</td>
                          <td className="text-end">{formatCubicMeters(pack.volume)}</td>
                          <td className="text-end">{pack.items.length}</td>
                          <td className="text-nowrap">{formatMoment(pack.packedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {items.length > 0 && (
              <section>
                <h4 className="h6 mt-4">items</h4>
                <div className="table-responsive">
                  <table className="table table-striped table-sm mb-0">
                    <thead>
                      <tr>
                        <th>package</th>
                        <th>orderNo</th>
                        <th>sku</th>
                        <th className="text-end">quantity</th>
                        <th className="text-end">of line</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(({ pack, item }) => (
                        <tr key={item.id}>
                          <td>{pack.packageNumber ?? pack.id}</td>
                          <td>
                            <LinkedValue column="orderNo" value={item.orderNo}>
                              {item.orderNo ?? ''}
                            </LinkedValue>
                          </td>
                          <td>
                            <small className="font-monospace">
                              <LinkedValue column="sku" value={item.sku}>
                                {item.sku}
                              </LinkedValue>
                            </small>
                          </td>
                          <td className="text-end">{item.quantity}</td>
                          <td className="text-end">{item.totalQuantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <div className="d-flex flex-wrap align-items-center gap-3 mt-4">
              {canReportReady(shipment.status) && (
                <button
                  type="button"
                  className="btn btn-success"
                  disabled={
                    ready.isPending ||
                    !shipment.shippingAddress?.trim() ||
                    shipment.packages.length === 0
                  }
                  title={
                    !shipment.shippingAddress?.trim()
                      ? 'A shipment needs a shipping address before it can be reported ready - add it under "edit data".'
                      : shipment.packages.length === 0
                        ? 'A shipment without a package cannot be reported ready.'
                        : undefined
                  }
                  onClick={() => {
                    setNotice(null)
                    ready.reset()
                    setAskingReady(true)
                  }}
                >
                  Report ready
                </button>
              )}
              {showsAssignButton(shipment.status) && (
                <button
                  type="button"
                  className="btn btn-orange"
                  disabled={!canAssignDistributor(shipment.status)}
                  title={
                    canAssignDistributor(shipment.status)
                      ? undefined
                      : shipment.status === 'CREATED'
                        ? 'Report the shipment ready first - a distributor can only be assigned from READY.'
                        : `A shipment in ${shipment.status} cannot be handed to a distributor - only READY, DISPATCH_REQUESTED or DECLINED.`
                  }
                  onClick={() => {
                    setNotice(null)
                    setAssigning(true)
                  }}
                >
                  Assign distributor
                </button>
              )}
              {notice && (
                <span className="text-success" role="status">
                  {notice}
                </span>
              )}
              {ready.error && (
                <span className="text-danger" role="alert">
                  {ready.error.message}
                </span>
              )}
            </div>
            {askingReady && (
              <ConfirmModal
                title="Report shipment ready"
                confirmLabel="Report ready"
                busy={ready.isPending}
                onCancel={() => setAskingReady(false)}
                onConfirm={() =>
                  ready.mutate(undefined, { onSettled: () => setAskingReady(false) })
                }
              >
                Report shipment {shipment.id} ready? The order lines in its{' '}
                {shipment.packages.length} package
                {shipment.packages.length === 1 ? '' : 's'} move on to READY_FOR_DISPATCH, and so do
                the orders once all their lines are in a ready shipment. Packages can no longer be
                added or taken out after this.
              </ConfirmModal>
            )}
            {assigning && (
              <AssignDistributorModal
                shipment={shipment}
                query={{
                  customerId: shipment.customerId,
                  weight: shipment.weight,
                  volume: totalVolume(shipment.packages),
                }}
                onClose={() => setAssigning(false)}
                onAssigned={(message) => {
                  setAssigning(false)
                  setNotice(message)
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
