/** A moment as the backend sends it (ISO, or `yyyy-MM-dd HH:mm:ss`), shown as date and time to the second; nothing is an empty cell. */
export function formatMoment(value: string | null | undefined): string {
  return value ? value.replace('T', ' ').slice(0, 19) : ''
}

/** A product as a person names it: its name with the article number in brackets. Whichever is missing is left out. */
export function productLabel(name: unknown, articleNo: unknown): string {
  const text = (value: unknown) => (typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '')
  const label = text(name)
  const number = text(articleNo)
  if (label && number) return `${label} (${number})`
  return label || number
}

/** A date, `yyyy-MM-dd`, as it is; a moment is cut back to its date. Nothing is an empty cell. */
export function formatDate(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : ''
}

/** A number as it reads in a table: nothing is an empty cell, and a long fraction is cut to `digits` places. */
export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined) return ''
  return String(Number(value.toFixed(digits)))
}

/**
 * A volume the backend works out in cm³ (length × width × height of a package), shown in m³: 1 m³ is 1,000,000 cm³.
 * Four decimals, because a parcel is a few thousandths of a cubic metre; none known is an empty cell.
 */
export function formatCubicMeters(cubicCentimeters: number | null | undefined): string {
  if (cubicCentimeters === null || cubicCentimeters === undefined) return ''
  return formatNumber(cubicCentimeters / 1_000_000, 4)
}

/** `length × width × height`, with the parts that are known; none known is an empty cell. */
export function formatDimensions(length?: number | null, width?: number | null, height?: number | null): string {
  const parts = [length, width, height]
  if (parts.every((part) => part === null || part === undefined)) return ''
  return parts.map((part) => (part === null || part === undefined ? '?' : formatNumber(part))).join(' × ')
}

/** A free text cut to its first `max` characters and an ellipsis; a short one is left as it is. */
export function shorten(value: string | null | undefined, max = 20): string {
  if (!value) return ''
  return value.length > max ? `${value.slice(0, max)}…` : value
}
