import type { ShipmentPackageDto } from './api/shipmentPackages'

/** One container a person can pick in the "Add to container" form, with what the grid shows of it. */
export interface ContainerChoice {
  id: number
  packageNumber: string
  type: string
  /** The order whose items it holds (a container holds one order's items only); empty while it holds none. */
  orderNo: string
  /** How many package items it holds right now. */
  packages: number
  weight: number | null
  /** In cm³, as the backend works it out. */
  volume: number | null
}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

/** The order numbers of the items, each once, in the order they appear. */
function orderNumbers(items: unknown): string {
  if (!Array.isArray(items)) return ''
  const numbers: string[] = []
  for (const item of items) {
    const orderNo = text((item as { orderNo?: unknown } | null)?.orderNo)
    if (orderNo !== '' && !numbers.includes(orderNo)) numbers.push(orderNo)
  }
  return numbers.join(', ')
}

/**
 * The containers of a `GET /shipment-packages` answer as the rows of the choice grid, in the order they came.
 * The number of items is the backend's own `packages` figure, or the length of `items` where it is missing.
 * A row without a usable id cannot be addressed and is left out.
 */
export function containerChoices(rows: readonly ShipmentPackageDto[]): ContainerChoice[] {
  const choices: ContainerChoice[] = []
  for (const row of rows) {
    const id = Number(row.id)
    if (row.id === null || row.id === undefined || !Number.isInteger(id)) continue
    choices.push({
      id,
      packageNumber: text(row.packageNumber),
      type: text(row.type),
      orderNo: orderNumbers(row.items),
      packages:
        typeof row.packages === 'number'
          ? row.packages
          : Array.isArray(row.items)
            ? row.items.length
            : 0,
      weight: numberOrNull(row.weight),
      volume: numberOrNull(row.volume),
    })
  }
  return choices
}

/**
 * Whether the items with these order numbers may go into the container: a container holds the items of one order
 * only, so it fits when it is empty, or when every chosen item belongs to the order it already holds. Nothing
 * chosen yet leaves every container open; items of two orders fit none that holds something, and an empty
 * container takes only one order's items, so it is refused as well (the backend would answer 400).
 */
export function containerFits(
  choice: Pick<ContainerChoice, 'orderNo'>,
  chosenOrders: readonly string[],
): boolean {
  const orders = new Set(chosenOrders.filter((orderNo) => orderNo !== ''))
  if (orders.size === 0) return true
  if (orders.size > 1) return false
  return choice.orderNo === '' || orders.has(choice.orderNo)
}
