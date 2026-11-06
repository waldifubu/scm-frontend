import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useId } from 'react'
import { distributorQueryOptions, type DistributorQuery } from '../api/distributors'
import { assignDistributor, type ShipmentDetail } from '../api/shipments'
import { displayName } from '../api/types'

interface Props {
  shipment: ShipmentDetail
  /** What the carrier is looked up for: the customer, weight and volume of the shipment. */
  query: DistributorQuery
  onClose: () => void
  /** Called once the backend has taken the assignment, with what to tell the person. */
  onAssigned: (message: string) => void
}

/**
 * The carriers a shipment can be handed to - those the rules name for it, best first, else every active one; one row each with an orange Assign button. Handing it over
 * is `PUT /shipments/{id}/distributor/{distributorId}`: the shipment goes to DISPATCH_REQUESTED, and the
 * carrier answers from their own list. A refusal (the shipment moved on in the meantime, say) is shown
 * in the window and leaves it open, so nothing is lost by trying.
 */
export function AssignDistributorModal({ shipment, query, onClose, onAssigned }: Props) {
  const titleId = useId()
  const queryClient = useQueryClient()
  const { data, isPending, error } = useQuery(distributorQueryOptions(query))

  const assign = useMutation({
    mutationFn: (distributorId: number) => assignDistributor(shipment.id, distributorId),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ['shipments'] })
      onAssigned(
        `Shipment ${updated.id} was handed to ${updated.distributorName ?? 'the distributor'} and is now ${updated.status}.`,
      )
    },
  })

  // Escape closes, like any dialog - unless an assignment is under way and a close would hide its answer.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !assign.isPending) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [assign.isPending, onClose])

  const distributors = data?.content ?? []
  // Only a carrier a rule named has one; the list of every active carrier (the fallback) has none, and no empty column.
  const showRule = distributors.some((distributor) => distributor.ruleId != null)

  return (
    <>
      <div
        className="modal d-block"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={(event) => {
          // A click on the dimmed area outside the window closes it; one inside does not bubble up to here.
          if (event.target === event.currentTarget && !assign.isPending) onClose()
        }}
      >
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title h5" id={titleId}>
                Assign distributor to shipment {shipment.id}
              </h2>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose} disabled={assign.isPending} />
            </div>
            <div className="modal-body">
              {assign.error && (
                <p className="text-danger" role="alert">
                  {assign.error.message}
                </p>
              )}
              {data?.fallback && (
                <p className="small text-body-secondary">
                  No rule names a distributor for this shipment - choose among all active distributors.
                </p>
              )}
              {isPending && <p className="mb-0">Loading distributors…</p>}
              {error && <p className="mb-0 text-danger">{error.message}</p>}
              {data && distributors.length === 0 && (
                <p className="mb-0 text-body-secondary">There is no active distributor to hand the shipment to.</p>
              )}
              {distributors.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>E-mail</th>
                        <th>User name</th>
                        <th className="text-end">id</th>
                        {showRule && <th className="text-end">rule</th>}
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {distributors.map((distributor) => {
                        const current = distributor.id === shipment.distributorId
                        return (
                          <tr key={distributor.id}>
                            <td className="text-nowrap">
                              {displayName(distributor)}
                              {current && (
                                <span className={`badge ms-2 ${shipment.status === 'DECLINED' ? 'text-bg-danger' : 'text-bg-secondary'}`}>
                                  {shipment.status === 'DECLINED' ? 'declined' : 'assigned'}
                                </span>
                              )}
                            </td>
                            <td>{distributor.email}</td>
                            <td>{distributor.username}</td>
                            <td className="text-end">{distributor.id}</td>
                            {showRule && <td className="text-end">{distributor.ruleId ?? ''}</td>}
                            <td className="text-end">
                              <button
                                type="button"
                                className="btn btn-sm btn-orange"
                                disabled={current || assign.isPending}
                                onClick={() => assign.mutate(distributor.id)}
                              >
                                {assign.isPending && assign.variables === distributor.id ? 'Assigning…' : 'Assign'}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer justify-content-between">
              <span className="small text-body-secondary">
                {data && data.total > distributors.length
                  ? `Showing ${distributors.length} of ${data.total} distributors.`
                  : `${distributors.length} active distributor${distributors.length === 1 ? '' : 's'}.`}
              </span>
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={assign.isPending}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  )
}
