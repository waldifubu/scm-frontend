import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { formatNumber } from '../../shared/lib/format'
import { replacementProblem, replaceShipmentPackages, type ShipmentDetail } from './shipments'
import { shippablePackagesQueryOptions } from './shippablePackages'
import { LoadingBar } from '../../shared/ui/LoadingBar'

/**
 * Replaces what a CREATED shipment holds (`PUT /shipments/{id}/packages`): the packages it has now plus the free
 * PACKED ones of the same customer, as checkboxes; saving sends the ticked ones as the new content. Only the first
 * page of free packages is offered - what is not on it can still be added from the Ready for Shipment list.
 */
export function ShipmentPackagesEditor({ shipment }: { shipment: ShipmentDetail }) {
  const queryClient = useQueryClient()
  const free = useQuery(shippablePackagesQueryOptions())
  const [chosen, setChosen] = useState<Set<number>>(
    () => new Set(shipment.packages.map((p) => p.id)),
  )
  const [saved, setSaved] = useState(false)
  const save = useMutation({
    mutationFn: () =>
      replaceShipmentPackages(
        shipment.id,
        [...chosen].sort((a, b) => a - b),
      ),
    onSuccess: async () => {
      setSaved(true)
      await queryClient.invalidateQueries({ queryKey: ['shipments'] })
      await queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const candidates = (free.data?.content ?? []).filter(
    (pack) => pack.customerId === shipment.customerId && pack.items.length > 0,
  )
  const rows = [
    ...shipment.packages.map((p) => ({
      id: p.id,
      number: p.packageNumber,
      weight: p.weight,
      held: true,
    })),
    ...candidates
      .filter((p) => !shipment.packages.some((held) => held.id === p.id))
      .map((p) => ({ id: p.id, number: p.packageNumber, weight: p.weight, held: false })),
  ]
  const problem = replacementProblem([...chosen])
  const unchanged =
    chosen.size === shipment.packages.length && shipment.packages.every((p) => chosen.has(p.id))

  const toggle = (id: number) => {
    save.reset()
    setSaved(false)
    setChosen((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  return (
    <section className="mt-4">
      <h4 className="h6">replace packages</h4>
      <p className="text-body-secondary small mb-2">
        Tick what the shipment should hold: its own packages and free packed ones of the same
        customer.
      </p>
      {free.isPending && <LoadingBar label="Loading free packages…" className="" />}
      {free.error && <p className="text-danger">{free.error.message}</p>}
      <ul className="list-unstyled mb-3">
        {rows.map((row) => (
          <li key={row.id}>
            <label className="d-flex align-items-center gap-2">
              <input
                type="checkbox"
                className="form-check-input mt-0"
                checked={chosen.has(row.id)}
                onChange={() => toggle(row.id)}
              />
              <span>
                {row.number ?? `Package ${row.id}`}{' '}
                <small className="text-body-secondary">
                  (id {row.id}, {formatNumber(row.weight)} kg
                  {row.held ? ', in this shipment' : ', free'})
                </small>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="d-flex flex-wrap align-items-center gap-2">
        <button
          type="button"
          className="btn btn-success"
          disabled={!!problem || unchanged || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? 'Saving…' : 'Save packages'}
        </button>
        {problem && <span className="text-body-secondary">{problem}</span>}
        {saved && (
          <span className="text-success" role="status">
            Packages saved.
          </span>
        )}
        {save.error && (
          <span className="text-danger" role="alert">
            {save.error.message}
          </span>
        )}
      </div>
    </section>
  )
}
