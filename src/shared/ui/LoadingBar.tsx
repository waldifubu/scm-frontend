/**
 * A bar that runs in a loop while something loads. How long it takes is not known, so it shows no amount - the
 * `progressbar` carries no value, which is how a screen reader is told the same.
 */
export function LoadingBar({
  label,
  slim = false,
  className = 'p-3',
}: {
  /** What is loading; shown under the bar, and its name for a screen reader. */
  label: string
  /** Just the thin bar, for a reload while the rows are still on the screen. */
  slim?: boolean
  /** The spacing around the bar and its text; none inside a box that is padded already. */
  className?: string
}) {
  return (
    <div className={slim ? undefined : className}>
      <div className="loading-bar" role="progressbar" aria-label={label}>
        <div className="loading-bar-run" />
      </div>
      {!slim && <p className="mt-2 mb-0 small text-body-secondary">{label}</p>}
    </div>
  )
}

/**
 * Above a table whose rows stay while it loads again (another page, another sort): the thin bar while `active`. Its
 * place is kept, so the table does not jump.
 */
export function ReloadBar({ active }: { active: boolean }) {
  return <div style={{ minHeight: 4 }}>{active && <LoadingBar label="Reloading…" slim />}</div>
}
