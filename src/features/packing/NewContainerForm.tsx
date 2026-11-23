import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import {
  createContainer,
  emptyNewContainer,
  newContainerProblem,
  type NewContainer,
} from './containerContents'
import { SHIPMENT_PACKAGE_TYPES } from './shipmentPackages'

const DIMENSIONS = ['length', 'width', 'height'] as const

/**
 * The form of a new, empty container (`POST /packing/shipment`). Number and dimensions are optional - without a
 * number the backend makes one. Afterwards the page opens the container, where its contents are chosen.
 */
export function NewContainerForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [form, setForm] = useState<NewContainer>(emptyNewContainer)
  const problem = newContainerProblem(form)
  const create = useMutation({
    mutationFn: () => createContainer(form),
    onSuccess: async (container) => {
      await queryClient.invalidateQueries({ queryKey: ['shipment-packages'] })
      onDone()
      void navigate({
        to: '/shipment-packages/$shipmentPackageId',
        params: { shipmentPackageId: String(container.id) },
      })
    },
  })
  const set = (key: keyof NewContainer, value: string) => {
    create.reset()
    setForm((current) => ({ ...current, [key]: value }))
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (!problem) create.mutate()
      }}
    >
      <h3 className="h5">New container</h3>
      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <label className="form-label" htmlFor="new-container-type">
            type
          </label>
          <select
            id="new-container-type"
            className="form-select form-select-sm"
            value={form.shipmentPackageType}
            onChange={(event) => set('shipmentPackageType', event.target.value)}
          >
            {SHIPMENT_PACKAGE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="new-container-number">
            packageNumber (optional)
          </label>
          <input
            id="new-container-number"
            className="form-control form-control-sm"
            value={form.packageNumber}
            onChange={(event) => set('packageNumber', event.target.value)}
          />
        </div>
        {DIMENSIONS.map((key) => (
          <div className="col-md-4" key={key}>
            <label className="form-label" htmlFor={`new-container-${key}`}>
              {key} (optional)
            </label>
            <input
              id={`new-container-${key}`}
              type="number"
              min={0}
              step="any"
              className="form-control form-control-sm"
              value={form[key]}
              onChange={(event) => set(key, event.target.value)}
            />
          </div>
        ))}
      </div>
      <div className="d-flex flex-wrap align-items-center gap-2">
        <button type="submit" className="btn btn-success" disabled={!!problem || create.isPending}>
          {create.isPending ? 'Creating…' : 'Create'}
        </button>
        {problem && <span className="text-body-secondary">{problem}</span>}
        {create.error && (
          <span className="text-danger" role="alert">
            {create.error.message}
          </span>
        )}
      </div>
    </form>
  )
}
