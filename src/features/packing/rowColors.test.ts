import { describe, expect, it } from 'vite-plus/test'
import { groupColors, PASTEL_RAINBOW } from './rowColors'

describe('PASTEL_RAINBOW', () => {
  it('has the eight colours of the rainbow, each different', () => {
    expect(PASTEL_RAINBOW).toHaveLength(8)
    expect(new Set(PASTEL_RAINBOW).size).toBe(8)
  })

  it('runs through the hues in rainbow order and keeps them all pastel', () => {
    const parsed = PASTEL_RAINBOW.map((c) =>
      /^hsl\((\d+) (\d+)% (\d+)%\)$/.exec(c)!.slice(1).map(Number),
    )

    const hues = parsed.map(([h]) => h!)
    expect(hues).toEqual([...hues].sort((a, b) => a - b))
    for (const [, saturation, lightness] of parsed) {
      expect(saturation).toBeGreaterThanOrEqual(60)
      expect(saturation).toBeLessThanOrEqual(80)
      expect(lightness).toBeGreaterThanOrEqual(84)
      expect(lightness).toBeLessThanOrEqual(93)
    }
  })

  it('stays within a narrow band of lightness, so no colour is louder than the rest', () => {
    const lightness = PASTEL_RAINBOW.map((c) => Number(/(\d+)%\)$/.exec(c)![1]))

    expect(Math.max(...lightness) - Math.min(...lightness)).toBeLessThanOrEqual(6)
  })
})

describe('groupColors', () => {
  it('gives rows with the same key the same colour', () => {
    const colors = groupColors([9038, 9038, 9040, 9038])

    expect(colors[0]).toBe(colors[1])
    expect(colors[0]).toBe(colors[3])
    expect(colors[2]).not.toBe(colors[0])
  })

  it('does not tell a number from the same number as text', () => {
    const colors = groupColors([9038, '9038'])

    expect(colors[0]).toBe(colors[1])
  })

  it('hands the colours out in the order the groups first appear', () => {
    const colors = groupColors(['a', 'b', 'c'])

    expect(colors).toEqual([PASTEL_RAINBOW[0], PASTEL_RAINBOW[1], PASTEL_RAINBOW[2]])
  })

  it('never gives two groups that follow each other the same colour', () => {
    const keys = Array.from({ length: 40 }, (_, i) => `order-${Math.floor(i / 2)}`)
    const colors = groupColors(keys)

    for (let i = 1; i < keys.length; i++) {
      if (keys[i] !== keys[i - 1]) expect(colors[i]).not.toBe(colors[i - 1])
    }
  })

  it('starts over with the first colour once the palette has run round', () => {
    const colors = groupColors(Array.from({ length: 9 }, (_, i) => `g${i}`))

    expect(colors[8]).toBe(colors[0])
    expect(colors[7]).not.toBe(colors[8])
  })

  it('colours a group the same wherever its rows are, not only side by side', () => {
    const colors = groupColors(['a', 'b', 'a', 'c', 'b'])

    expect(colors[0]).toBe(colors[2])
    expect(colors[1]).toBe(colors[4])
  })

  it('leaves a row without a key uncoloured and does not count it as a group', () => {
    const colors = groupColors([null, 'a', undefined, '', '  ', 'b'])

    expect(colors).toEqual([null, PASTEL_RAINBOW[0], null, null, null, PASTEL_RAINBOW[1]])
  })

  it('is empty for no rows', () => {
    expect(groupColors([])).toEqual([])
  })
})
