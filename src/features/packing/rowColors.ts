/**
 * Eight pastels, the colours of the rainbow in the order a rainbow has them: red, orange, yellow, green,
 * aqua, blue, violet, pink. Saturation is the same for all; the lightness is nudged per hue, because at
 * equal lightness yellow and green read brighter than blue and violet - the pastels then sit together as one
 * set, none of them louder than the rest, and dark text stays readable on every one.
 */
export const PASTEL_RAINBOW: readonly string[] = [
  'hsl(0 70% 90%)', // red
  'hsl(30 70% 88%)', // orange
  'hsl(50 70% 86%)', // yellow
  'hsl(120 70% 88%)', // green
  'hsl(170 70% 86%)', // aqua
  'hsl(210 70% 90%)', // blue
  'hsl(260 70% 91%)', // violet
  'hsl(330 70% 91%)', // pink
]

/**
 * A colour for each row, by the group it belongs to: rows with the same key get the same colour, rows with
 * a different key a different one - the colours are handed out in the order the groups first appear, so two
 * groups that follow each other never share one (until the palette runs round, eight groups later). A row
 * without a key has no colour.
 *
 * By first appearance and not by a hash of the key, on purpose: a hash gives two neighbouring groups the same
 * colour now and then, and a group reads as one only if its neighbours do not look like it.
 */
export function groupColors(
  keys: readonly (string | number | null | undefined)[],
): (string | null)[] {
  const byGroup = new Map<string, string>()
  return keys.map((key) => {
    if (key === null || key === undefined || String(key).trim() === '') return null
    const group = String(key)
    let color = byGroup.get(group)
    if (color === undefined) {
      color = PASTEL_RAINBOW[byGroup.size % PASTEL_RAINBOW.length]!
      byGroup.set(group, color)
    }
    return color
  })
}
