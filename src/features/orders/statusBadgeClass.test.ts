import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vite-plus/test'
import { ORDER_STATUSES } from './orders'
import { statusBadgeClass } from './statusBadgeClass'

const css = readFileSync(new URL('../../index.css', import.meta.url), 'utf8')

describe('statusBadgeClass', () => {
  it('names a class for every status, each its own', () => {
    const classes = ORDER_STATUSES.map(statusBadgeClass)
    expect(new Set(classes).size).toBe(ORDER_STATUSES.length)
    expect(statusBadgeClass('IN_TRANSIT')).toBe('status-in-transit')
  })

  it('has the colours of every one of them in the stylesheet', () => {
    for (const status of ORDER_STATUSES) {
      expect(css, status).toContain(`.badge.${statusBadgeClass(status)}`)
    }
    expect(css).toContain('.badge.status-unknown')
  })

  it('falls back to a neutral class for what is no status', () => {
    expect(statusBadgeClass(undefined)).toBe('status-unknown')
    expect(statusBadgeClass(null)).toBe('status-unknown')
    expect(statusBadgeClass(7)).toBe('status-unknown')
    expect(statusBadgeClass('in transit; drop table')).toBe('status-unknown')
  })
})
