import { describe, expect, it } from 'vitest'
import { requestStatusClass } from './requestStatus'

const STATUSES = ['OPEN', 'APPROVED', 'IN_TRANSIT', 'DELIVERED', 'IN_STOCK', 'REJECTED', 'CANCELLED']

describe('requestStatusClass', () => {
  it('gives every status a colour of its own', () => {
    expect(new Set(STATUSES.map(requestStatusClass)).size).toBe(STATUSES.length)
  })

  it('keeps to the quiet tones - never a solid text-bg colour', () => {
    for (const status of [...STATUSES, 'SOMETHING_NEW']) {
      expect(requestStatusClass(status)).not.toMatch(/text-bg-/)
      expect(requestStatusClass(status)).toMatch(/^badge /)
    }
  })

  it('shows an unknown status in grey', () => {
    expect(requestStatusClass('SOMETHING_NEW')).toContain('secondary-subtle')
  })
})
