/**
 * How a fulfillment status looks in a table: its colour class (in `index.css`) and its drawing (24 x 24, one line).
 * The colours follow the way of a line: grey waits, blue is held, amber and orange are picked, purple and indigo
 * are packed, green is handed on, near black is called off.
 */
const ICONS: Readonly<Record<string, string>> = {
  // A clock.
  WAITING: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2',
  // A bookmark: held for this order.
  RESERVED: 'M6 3h12v18l-6-4-6 4z',
  // A trolley being filled.
  PICKING: 'M3 4h2l2.5 12h11L21 8H6M9 20h.01M17 20h.01',
  // A tick.
  PICKED: 'M4 12l5 5L20 6',
  // An open box.
  PACKING: 'M3 10h18v10H3zM3 10 6 4h12l3 6M12 10v4',
  // A closed box.
  PACKED: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 5 9-5M12 12v9',
  // A truck.
  READY_FOR_DISPATCH: 'M2 6h12v10H2zM14 10h4l4 3v3h-8M6 19h.01M18 19h.01',
  // A crossed circle.
  CANCELLED: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M9 9l6 6m0-6-6 6',
}

/** A question mark, for a status the page does not know. */
const UNKNOWN_ICON = 'M9 9a3 3 0 1 1 4 2.8c-.7.3-1 .9-1 1.7v.5M12 18h.01'

export function fulfillmentBadge(status: unknown): { className: string; icon: string } {
  const icon = typeof status === 'string' && Object.hasOwn(ICONS, status) ? ICONS[status] : null
  return icon
    ? { className: `fulfillment-${String(status).toLowerCase().replaceAll('_', '-')}`, icon }
    : { className: 'fulfillment-unknown', icon: UNKNOWN_ICON }
}
