import { describe, expect, it } from 'vite-plus/test'
import {
  packageStatusBadgeClass,
  packageTypeBadgeClass,
  SHIPMENT_PACKAGE_STATUSES,
  SHIPMENT_PACKAGE_TYPES,
} from './shipmentPackages'

describe('packageStatusBadgeClass', () => {
  it('gives every status a colour of its own', () => {
    const classes = SHIPMENT_PACKAGE_STATUSES.map(packageStatusBadgeClass)
    expect(new Set(classes).size).toBe(SHIPMENT_PACKAGE_STATUSES.length)
    expect(packageStatusBadgeClass('PACKED')).toBe('text-bg-success')
  })
})

describe('packageTypeBadgeClass', () => {
  it('colours every known type apart from the others', () => {
    const classes = SHIPMENT_PACKAGE_TYPES.filter((type) => type !== 'OTHER').map(
      packageTypeBadgeClass,
    )
    expect(new Set(classes).size).toBe(classes.length)
  })

  it('falls back to a neutral badge for OTHER and for what it does not know', () => {
    expect(packageTypeBadgeClass('OTHER')).toBe('text-bg-light border')
    expect(packageTypeBadgeClass('SOMETHING_NEW')).toBe('text-bg-light border')
  })
})
