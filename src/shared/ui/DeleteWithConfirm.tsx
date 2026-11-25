import { useMutation } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { ConfirmModal } from './ConfirmModal'

/**
 * A red Delete button that asks before it deletes: the window says what goes (`children`), only its confirming
 * button calls `onDelete`. A refusal of the backend (the thing is still referenced, 409) is shown in the window, so
 * it is not lost; after a success `onDeleted` runs - the page usually leaves the thing that is gone.
 */
export function DeleteWithConfirm({
  title,
  children,
  onDelete,
  onDeleted,
  label = 'Delete',
  icon,
  small = true,
}: {
  title: string
  children: ReactNode
  onDelete: () => Promise<unknown>
  onDeleted: () => void
  label?: string
  /** Shown in front of the label on the button (not in the window). */
  icon?: ReactNode
  /** The size of the button; off next to buttons of the normal size. */
  small?: boolean
}) {
  const [asking, setAsking] = useState(false)
  const remove = useMutation({
    mutationFn: onDelete,
    onSuccess: () => {
      setAsking(false)
      onDeleted()
    },
  })
  const close = () => {
    setAsking(false)
    remove.reset()
  }

  return (
    <>
      <button
        type="button"
        className={`btn btn-outline-danger${icon ? ' d-inline-flex align-items-center gap-2' : ''}${small ? ' btn-sm' : ''}`}
        onClick={() => setAsking(true)}
      >
        {icon}
        {label}
      </button>
      {asking && (
        <ConfirmModal
          title={title}
          confirmLabel={label}
          danger
          busy={remove.isPending}
          onConfirm={() => remove.mutate()}
          onCancel={close}
        >
          {children}
          {remove.error && (
            <p className="text-danger mt-2 mb-0" role="alert">
              {remove.error.message}
            </p>
          )}
        </ConfirmModal>
      )}
    </>
  )
}
