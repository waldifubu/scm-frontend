/** Points down while the form is closed (it opens) and turns up as it opens (it closes). */
export function Chevron({ up }: { up: boolean }) {
  return (
    <svg
      className={up ? 'chevron up' : 'chevron'}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 5.5 8 10.5l5-5" />
    </svg>
  )
}
