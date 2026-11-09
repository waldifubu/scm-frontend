/**
 * A small truck, drawn like the icons of the navigation (24 x 24, a line in the current colour), for a
 * button that says a shipment is on the road. Decorative: the button's text says it.
 */
export function TruckIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 7h12v9H2zM14 10h4l4 3v3h-8M6 19.5a1.5 1.5 0 1 0 0-.01M17 19.5a1.5 1.5 0 1 0 0-.01" />
    </svg>
  )
}
