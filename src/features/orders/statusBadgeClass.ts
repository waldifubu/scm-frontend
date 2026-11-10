/**
 * The class of the badge an order status wears in a table. The colours live in `index.css` under these names
 * (`.badge.status-in-transit`, ...), one per status, chosen so that a row reads without reading the word: grey is
 * new, blue and cyan are being looked at, amber and orange are waiting, purple is the warehouse at work, teal and
 * indigo are on their way, green is arrived, deep green is closed, red is refused, near black is called off.
 */
export function statusBadgeClass(status: unknown): string {
  if (typeof status !== 'string' || !/^[A-Z_]+$/.test(status)) return 'status-unknown'
  return `status-${status.toLowerCase().replaceAll('_', '-')}`
}
