import { useState, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Chevron } from '../../shared/ui/Chevron'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'
import { deleteRule, type Choice } from './rules'

/** A drop-down over what a rule can name. With `anyLabel` the first entry is "no condition" (`null`). */
export function ChoiceSelect({
  id,
  label,
  choices,
  value,
  onChange,
  anyLabel,
  loading,
}: {
  id: string
  label: string
  choices: Choice[] | undefined
  value: number | null
  onChange: (value: number | null) => void
  anyLabel?: string
  loading?: boolean
}) {
  return (
    <div className="col-md-6">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="form-select form-select-sm"
        value={value ?? ''}
        disabled={loading}
        onChange={(event) =>
          onChange(event.target.value === '' ? null : Number(event.target.value))
        }
      >
        {anyLabel !== undefined ? (
          <option value="">{anyLabel}</option>
        ) : (
          <option value="" disabled>
            {loading ? 'Loading…' : 'Choose…'}
          </option>
        )}
        {(choices ?? []).map((choice) => (
          <option key={choice.id} value={choice.id}>
            {choice.label}
          </option>
        ))}
      </select>
    </div>
  )
}

/** A number field of a rule; blank means "no condition". */
export function NumberField({
  id,
  label,
  value,
  onChange,
  invalid,
  hint,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  /** One line under the field. */
  hint?: string
}) {
  return (
    <div className="col-md-3 col-6">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        min="0"
        step="any"
        className={`form-control form-control-sm${invalid ? ' is-invalid' : ''}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint && <div className="form-text">{hint}</div>}
    </div>
  )
}

/** The "New ..." button under a table: outline green, an icon and a chevron, unfolding the form it holds. */
export function NewRuleToggle({
  label,
  formId,
  icon,
  aside,
  children,
}: {
  label: string
  formId: string
  icon: ReactNode
  /** Further buttons in the same line, at its right end. */
  aside?: ReactNode
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-4 mb-3">
      <div className="d-flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-outline-success d-inline-flex align-items-center gap-2"
          aria-expanded={open}
          aria-controls={formId}
          onClick={() => setOpen((current) => !current)}
        >
          {icon}
          {label}
          <Chevron up={open} />
        </button>
        {aside && <div className="ms-auto">{aside}</div>}
      </div>
      {open && (
        <div id={formId} className="card shadow-sm mt-3">
          <div className="card-body">{children(() => setOpen(false))}</div>
        </div>
      )}
    </div>
  )
}

/** A head and shoulders with a plus is for people; a rule gets a plus on a page. */
export function NewRuleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 3h8l4 4v14H7zM15 3v5h5M13 12v6m-3-3h6" />
    </svg>
  )
}

/** The explanation above a rule form: what the rule decides and how the winner is picked. Open while creating. */
export function RuleHelp({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <details className="small text-body-secondary mb-3" open={open}>
      <summary className="fw-semibold">How does this rule work?</summary>
      <div className="mt-2">{children}</div>
    </details>
  )
}

/** Delete button of a rule form, behind a confirmation. */
export function DeleteRuleButton({
  kind,
  id,
  onDeleted,
}: {
  kind: 'supplier' | 'distributor'
  id: number
  onDeleted?: () => void
}) {
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const remove = useMutation({
    mutationFn: () => deleteRule(kind, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [`${kind}-rules`] })
      onDeleted?.()
    },
  })
  const close = () => {
    setConfirming(false)
    remove.reset()
  }
  return (
    <>
      <button
        type="button"
        className="btn btn-outline-danger ms-auto"
        onClick={() => setConfirming(true)}
      >
        Delete
      </button>
      {confirming && (
        <ConfirmModal
          title={`Delete rule ${id}?`}
          confirmLabel="Delete"
          danger
          busy={remove.isPending}
          onConfirm={() => remove.mutate()}
          onCancel={close}
        >
          <p className="mb-0">
            The rule is removed for good. Requests and shipments that came about through it are not
            changed; from now on the remaining rules decide.
          </p>
          {remove.error && <p className="text-danger mt-2 mb-0">{remove.error.message}</p>}
        </ConfirmModal>
      )}
    </>
  )
}
