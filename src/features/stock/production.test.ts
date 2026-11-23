import { describe, expect, it } from 'vite-plus/test'
import { mayProduce, nextProgress, productionSummary } from './production'
import type { UserDto } from '../../shared/api/types'

const userWith = (...roles: string[]) => ({ roles }) as unknown as UserDto

describe('mayProduce', () => {
  it('is for admin, manager and warehouse only', () => {
    expect(mayProduce(userWith('WAREHOUSE'))).toBe(true)
    expect(mayProduce(userWith('MANAGER'))).toBe(true)
    expect(mayProduce(userWith('ADMIN'))).toBe(true)
    expect(mayProduce(userWith('CUSTOMER'))).toBe(false)
    expect(mayProduce(userWith('LOGISTICS'))).toBe(false)
  })
})

describe('productionSummary', () => {
  it('says what was built, in the singular and the plural, and when nothing was', () => {
    expect(productionSummary({ produced: 0, content: [] })).toMatch(/Nothing/)
    expect(productionSummary({ produced: 1, content: [] })).toBe('1 unit built.')
    expect(productionSummary({ produced: 3, content: [] })).toBe('3 units built.')
  })
})

describe('nextProgress', () => {
  it('keeps rising but never reaches the ceiling', () => {
    let value = 0
    for (let i = 0; i < 500; i++) {
      const next = nextProgress(value)
      expect(next).toBeGreaterThanOrEqual(value)
      value = next
    }
    expect(value).toBeLessThanOrEqual(92)
  })
})
