/**
 * What to do with the colour a user carries (`UserDto.color`): paint the navigation bar with it, and
 * keep the text on it readable.
 *
 * The backend stores a free string - `#0D6EFD`, `#FA96008F` with an alpha channel, possibly a name or
 * nothing at all - so nothing here assumes a format. The browser is asked what the string means.
 */

export type BarTheme = 'dark' | 'light'

export interface BarStyle {
  /** The value to use as `background-color`, exactly as the user has it. */
  background: string
  /**
   * Bootstrap's `data-bs-theme` for the bar: `dark` is light text on a dark ground, `light` the reverse.
   */
  theme: BarTheme
}

let canvas: CanvasRenderingContext2D | null | undefined
const cache = new Map<string, BarStyle | null>()

function context(): CanvasRenderingContext2D | null {
  if (canvas === undefined) {
    canvas = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  }
  return canvas
}

/** The colour as red, green, blue on a white page - what the eye gets of a translucent colour. */
function onWhite(color: string): [number, number, number] | null {
  const context2d = context()
  if (!context2d || !CSS.supports('color', color)) return null

  context2d.clearRect(0, 0, 1, 1)
  context2d.fillStyle = color
  context2d.fillRect(0, 0, 1, 1)
  const [red, green, blue, alpha] = context2d.getImageData(0, 0, 1, 1).data
  const opacity = alpha / 255
  return [red, green, blue].map((channel) => channel * opacity + 255 * (1 - opacity)) as [number, number, number]
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
function luminance([red, green, blue]: [number, number, number]): number {
  const linear = (channel: number) => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue)
}

/**
 * How to paint a bar in this colour, or `null` for none - nothing set, or something that is no CSS
 * colour (the bar then keeps its default).
 *
 * Light text on a dark ground or dark text on a light one, whichever contrasts more: against white the
 * ratio is `1.05 / (L + 0.05)`, against black `(L + 0.05) / 0.05`.
 */
export function barStyle(color: string | null | undefined): BarStyle | null {
  const background = color?.trim()
  if (!background) return null

  const known = cache.get(background)
  if (known !== undefined) return known

  const rgb = onWhite(background)
  const style: BarStyle | null = rgb
    ? {
        background,
        theme: 1.05 / (luminance(rgb) + 0.05) >= (luminance(rgb) + 0.05) / 0.05 ? 'dark' : 'light',
      }
    : null
  cache.set(background, style)
  return style
}
