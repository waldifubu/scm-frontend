import { describe, expect, it } from 'vite-plus/test'
import {
  formatCubicMeters,
  formatDate,
  formatDimensions,
  formatMoment,
  formatNumber,
  productLabel,
  shorten,
} from './format'

describe('formatMoment', () => {
  it('drops the T and anything beyond the second', () => {
    expect(formatMoment('2026-10-25T18:07:59')).toBe('2026-10-25 18:07:59')
    expect(formatMoment('2026-10-25T18:07:59.123456')).toBe('2026-10-25 18:07:59')
  })

  it('leaves a moment that is already spelled out alone', () => {
    expect(formatMoment('2026-10-25 18:07:59')).toBe('2026-10-25 18:07:59')
  })

  it('shows nothing as an empty cell', () => {
    expect(formatMoment(null)).toBe('')
    expect(formatMoment(undefined)).toBe('')
    expect(formatMoment('')).toBe('')
  })
})

describe('formatDate', () => {
  it('keeps a date and cuts a moment back to its date', () => {
    expect(formatDate('2026-11-02')).toBe('2026-11-02')
    expect(formatDate('2026-11-02T10:00:00')).toBe('2026-11-02')
    expect(formatDate(null)).toBe('')
  })
})

describe('formatNumber', () => {
  it('cuts a long fraction and drops a trailing zero', () => {
    expect(formatNumber(17.3)).toBe('17.3')
    expect(formatNumber(2)).toBe('2')
    expect(formatNumber(1.23456)).toBe('1.23')
    expect(formatNumber(1.5, 0)).toBe('2')
  })

  it('keeps zero and shows nothing as an empty cell', () => {
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(null)).toBe('')
    expect(formatNumber(undefined)).toBe('')
  })
})

describe('formatDimensions', () => {
  it('joins the three sizes', () => {
    expect(formatDimensions(60, 40, 30.5)).toBe('60 × 40 × 30.5')
  })

  it('marks a size that is missing and leaves the cell empty when all are', () => {
    expect(formatDimensions(60, null, 30)).toBe('60 × ? × 30')
    expect(formatDimensions(null, undefined, null)).toBe('')
    expect(formatDimensions()).toBe('')
  })

  it('shows a size of zero, which is what a new package starts with', () => {
    expect(formatDimensions(0, 0, 0)).toBe('0 × 0 × 0')
  })
})

describe('productLabel', () => {
  it('puts the article number in brackets behind the name', () => {
    expect(productLabel('Regal', 1004)).toBe('Regal (1004)')
    expect(productLabel(' Regal ', '1004')).toBe('Regal (1004)')
  })

  it('shows what there is when one of the two is missing', () => {
    expect(productLabel(null, 1004)).toBe('1004')
    expect(productLabel('Regal', undefined)).toBe('Regal')
    expect(productLabel('  ', 7)).toBe('7')
  })

  it('is empty for neither', () => {
    expect(productLabel(null, null)).toBe('')
    expect(productLabel({}, [])).toBe('')
  })
})

describe('formatCubicMeters', () => {
  it('turns cm³ into m³', () => {
    expect(formatCubicMeters(1_000_000)).toBe('1')
    expect(formatCubicMeters(6000)).toBe('0.006')
    expect(formatCubicMeters(0)).toBe('0')
  })

  it('is empty where nothing is known', () => {
    expect(formatCubicMeters(null)).toBe('')
    expect(formatCubicMeters(undefined)).toBe('')
  })
})

describe('shorten', () => {
  it('leaves a text of up to 20 characters alone', () => {
    expect(shorten('12345678901234567890')).toBe('12345678901234567890')
    expect(shorten('kurz')).toBe('kurz')
  })

  it('cuts a longer one to 20 characters and an ellipsis', () => {
    expect(shorten('123456789012345678901')).toBe('12345678901234567890…')
  })

  it('takes another limit', () => {
    expect(shorten('abcdef', 3)).toBe('abc…')
  })

  it('is empty where there is nothing', () => {
    expect(shorten(null)).toBe('')
    expect(shorten(undefined)).toBe('')
    expect(shorten('')).toBe('')
  })
})
