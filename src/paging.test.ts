import { describe, expect, it } from 'vite-plus/test'
import { pageNav } from './paging'

describe('pageNav', () => {
  it('has nowhere to go on a list of one page', () => {
    expect(pageNav(0, 25, 10)).toEqual({ pages: 1, last: 0, previous: null, next: null })
  })

  it('counts a part-filled last page', () => {
    expect(pageNav(0, 25, 26).pages).toBe(2)
    expect(pageNav(0, 25, 50).pages).toBe(2)
    expect(pageNav(0, 25, 51).pages).toBe(3)
  })

  it('leads forwards from the first page and backwards from the last', () => {
    expect(pageNav(0, 10, 35)).toMatchObject({ previous: null, next: 1 })
    expect(pageNav(1, 10, 35)).toMatchObject({ previous: 0, next: 2 })
    expect(pageNav(3, 10, 35)).toMatchObject({ previous: 2, next: null })
  })

  it('treats an empty list as one empty page', () => {
    expect(pageNav(0, 25, 0)).toEqual({ pages: 1, last: 0, previous: null, next: null })
  })

  it('does not divide by a size of 0', () => {
    expect(pageNav(0, 0, 5).pages).toBe(1)
  })

  it('leads back into the list from a page typed past the end', () => {
    expect(pageNav(9, 10, 35)).toMatchObject({ previous: 2, next: null })
    expect(pageNav(-4, 10, 35)).toMatchObject({ previous: null, next: 1 })
  })
})
