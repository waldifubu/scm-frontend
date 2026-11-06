import { describe, expect, it } from 'vitest'
import { actionsFor } from './supplierActions'

const names = (status: string) => actionsFor(status).map((entry) => entry.action)

describe('actionsFor', () => {
  it('lets an open request be approved or rejected', () => {
    expect(names('OPEN')).toEqual(['approve', 'reject'])
  })

  it('lets an approved request go on its way or be called off', () => {
    expect(names('APPROVED')).toEqual(['intransit', 'cancel'])
  })

  it('lets a request on its way be delivered or called off', () => {
    expect(names('IN_TRANSIT')).toEqual(['delivered', 'cancel'])
  })

  it.each(['DELIVERED', 'IN_STOCK', 'REJECTED', 'CANCELLED', 'SOMETHING_NEW'])('offers nothing in %s', (status) => {
    expect(actionsFor(status)).toEqual([])
  })

  it('marks only rejecting and calling off as ending the request', () => {
    const ending = ['OPEN', 'APPROVED', 'IN_TRANSIT'].flatMap(actionsFor).filter((entry) => entry.ends).map((entry) => entry.action)
    expect(ending).toEqual(['reject', 'cancel', 'cancel'])
  })
})
