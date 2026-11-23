import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  createStorehouse,
  emptyStorehouseEdit,
  isStorehouseComplete,
  saveStorehouse,
  storehouseEditOf,
  type StorehouseDto,
  type StorehouseEdit,
} from './storehouses'

const FIELDS: { key: keyof StorehouseEdit; label: string }[] = [
  { key: 'name', label: 'name' },
  { key: 'address', label: 'address' },
  { key: 'city', label: 'city' },
  { key: 'country', label: 'country' },
]

/**
 * The form under the table: the data of one storehouse, with a Save button - or, without a `storehouse`, the same
 * form for a new one with a Create button. The id is shown, not editable.
 */
export function StorehouseEditForm({
  storehouse,
  onClose,
}: {
  storehouse?: StorehouseDto & { id: number }
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [edit, setEdit] = useState<StorehouseEdit>(() =>
    storehouse ? storehouseEditOf(storehouse) : emptyStorehouseEdit,
  )
  const save = useMutation({
    mutationFn: () => (storehouse ? saveStorehouse(storehouse.id, edit) : createStorehouse(edit)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['storehouses'] })
      // A created storehouse is a finished form: close it, the next one starts empty.
      if (!storehouse) onClose()
    },
  })
  const set = (key: keyof StorehouseEdit, value: string) => {
    save.reset()
    setEdit((current) => ({ ...current, [key]: value }))
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (isStorehouseComplete(edit)) save.mutate()
      }}
    >
      <h3 className="h5">{storehouse ? `Storehouse ${storehouse.id}` : 'New storehouse'}</h3>
      <div className="row g-3 mb-3">
        {FIELDS.map(({ key, label }) => (
          <div className="col-md-6" key={key}>
            <label className="form-label" htmlFor={`storehouse-${storehouse?.id ?? 'new'}-${key}`}>
              {label}
            </label>
            <input
              id={`storehouse-${storehouse?.id ?? 'new'}-${key}`}
              className="form-control form-control-sm"
              value={edit[key]}
              maxLength={255}
              required={key === 'name'}
              onChange={(event) => set(key, event.target.value)}
            />
          </div>
        ))}
      </div>
      <div className="d-flex flex-wrap align-items-center gap-2">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!isStorehouseComplete(edit) || save.isPending}
        >
          {save.isPending ? 'Saving…' : storehouse ? 'Save' : 'Create'}
        </button>
        <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
          Close
        </button>
        {save.isSuccess && <span className="text-success">Saved.</span>}
        {save.error && <span className="text-danger">{save.error.message}</span>}
      </div>
    </form>
  )
}
