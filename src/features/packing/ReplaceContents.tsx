import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  contentCandidates,
  contentsProblem,
  contentsUnchanged,
  replaceContainerItems,
} from './containerContents'
import { lonelyPackagesQueryOptions } from './packages'
import type { ShipmentPackageDto } from './shipmentPackages'
import { LoadingBar } from '../../shared/ui/LoadingBar'

/**
 * Replaces what an OPEN container holds (`PUT /packing/shipment/{id}/items`): its own items and the loose ones as
 * checkboxes, saving sends the ticked ones as the new content. What is unticked becomes loose again. Only the first
 * page of loose items is offered; the Packages page lists the rest.
 */
export function ReplaceContents({
  id,
  items,
}: {
  id: string
  items: readonly ShipmentPackageDto[]
}) {
  const queryClient = useQueryClient()
  const loose = useQuery(lonelyPackagesQueryOptions(0))
  const candidates = contentCandidates(items, loose.data?.content ?? [])
  const [chosen, setChosen] = useState<Set<number>>(
    () => new Set(candidates.filter((item) => item.held).map((item) => item.id)),
  )
  const [saved, setSaved] = useState(false)
  const save = useMutation({
    mutationFn: () =>
      replaceContainerItems(
        id,
        [...chosen].sort((a, b) => a - b),
      ),
    onSuccess: async () => {
      setSaved(true)
      await queryClient.invalidateQueries({ queryKey: ['shipment-packages'] })
      await queryClient.invalidateQueries({ queryKey: ['packages'] })
    },
  })

  const problem = contentsProblem(candidates, chosen)
  const unchanged = contentsUnchanged(candidates, chosen)
  const toggle = (itemId: number) => {
    save.reset()
    setSaved(false)
    setChosen((current) => {
      const next = new Set(current)
      if (!next.delete(itemId)) next.add(itemId)
      return next
    })
  }

  return (
    <div className="mt-3">
      <h5 className="h6">Replace contents</h5>
      <p className="text-body-secondary small mb-2">
        Tick what the container should hold: its own items and loose ones of the same order.
        Unticked items become loose again; ticking nothing empties the container.
      </p>
      {loose.isPending && <LoadingBar label="Loading loose items…" className="" />}
      {loose.error && <p className="text-danger">{loose.error.message}</p>}
      {candidates.length === 0 && !loose.isPending && (
        <p className="text-body-secondary mb-2">No items to choose from.</p>
      )}
      <ul className="list-unstyled mb-3">
        {candidates.map((item) => (
          <li key={item.id}>
            <label className="d-flex align-items-center gap-2">
              <input
                type="checkbox"
                className="form-check-input mt-0"
                checked={chosen.has(item.id)}
                onChange={() => toggle(item.id)}
              />
              <span>
                Item {item.id}{' '}
                <small className="text-body-secondary">
                  (order {item.orderNo}, {item.sku}, qty {item.quantity},{' '}
                  {item.held ? 'in this container' : 'loose'})
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
          {save.isPending ? 'Saving…' : 'Save contents'}
        </button>
        {problem && <span className="text-body-secondary">{problem}</span>}
        {saved && (
          <span className="text-success" role="status">
            Contents saved.
          </span>
        )}
        {save.error && (
          <span className="text-danger" role="alert">
            {save.error.message}
          </span>
        )}
      </div>
    </div>
  )
}
