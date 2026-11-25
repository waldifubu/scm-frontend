import { describe, expect, it } from 'vite-plus/test'
import { lonelyPackageColumns, packageColumns } from './packageColumns'
import { lonelyPackagesPath } from './packages'

describe('the columns of the packages', () => {
  it('shows every field but SKU and run number', () => {
    expect(packageColumns.map((column) => column.id)).toEqual([
      'id',
      'createdAt',
      'orderItemId',
      'orderNo',
      'quantity',
      'totalQuantity',
      'siblings',
      'shipmentPackageId',
      'fulfillmentStatus',
    ])
  })

  it('sorts by all of them but the siblings, and the lonely ones by none', () => {
    expect(
      packageColumns.filter((column) => !column.enableSorting).map((column) => column.id),
    ).toEqual(['siblings'])
    expect(lonelyPackageColumns.some((column) => column.enableSorting)).toBe(false)
  })

  it('asks the lonely packages for a number of rows', () => {
    expect(lonelyPackagesPath(2, 'PACKED', 10)).toBe(
      '/lonely-packages?fulfillmentStatus=PACKED&size=10&page=2',
    )
    expect(lonelyPackagesPath(0, undefined, 50)).toBe('/lonely-packages?size=50')
    expect(lonelyPackagesPath(0, undefined, 50, '106324')).toBe(
      '/lonely-packages?size=50&orderNo=106324',
    )
  })
})
