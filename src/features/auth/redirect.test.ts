import { describe, expect, it } from 'vite-plus/test'
import { safeRedirect } from './redirect'

describe('safeRedirect', () => {
  it.each([
    ['/orders/123', '/orders/123'],
    ['/products?page=2', '/products?page=2'],
    [undefined, '/'],
    ['', '/'],
    ['https://attacker.example', '/'],
    ['//attacker.example', '/'],
    ['/\\attacker.example', '/'],
    ['orders/123', '/'],
  ])('keeps only an internal path: %s', (target, expected) => {
    expect(safeRedirect(target)).toBe(expected)
  })
})
