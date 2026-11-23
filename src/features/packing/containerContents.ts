import { api } from '../../shared/api/client'
import type { ShipmentPackageDto } from './shipmentPackages'

/** One package item as the editor offers it: where it is now, and which order it belongs to. */
export interface ContentCandidate {
  id: number
  orderNo: string
  sku: string
  quantity: string
  /** In the container being edited already; the others are loose. */
  held: boolean
}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

function candidateOf(row: ShipmentPackageDto, held: boolean): ContentCandidate | null {
  const id = Number(row.id)
  if (row.id === null || row.id === undefined || !Number.isInteger(id)) return null
  return {
    id,
    orderNo: text(row.orderNo),
    sku: text(row.sku),
    quantity: text(row.quantity),
    held,
  }
}

/**
 * What the container may hold after the change: what it holds now plus the loose items. A container holds the
 * items of one order only, so once it holds something the loose items of other orders are not offered; an empty
 * one is offered every loose item. An item held and also listed as loose appears once, as held.
 */
export function contentCandidates(
  held: readonly ShipmentPackageDto[],
  loose: readonly ShipmentPackageDto[],
): ContentCandidate[] {
  const own = held.flatMap((row) => candidateOf(row, true) ?? [])
  const orders = new Set(own.map((item) => item.orderNo).filter((orderNo) => orderNo !== ''))
  const known = new Set(own.map((item) => item.id))
  const free = loose.flatMap((row) => {
    const item = candidateOf(row, false)
    if (!item || known.has(item.id)) return []
    return orders.size === 0 || orders.has(item.orderNo) ? [item] : []
  })
  return [...own, ...free]
}

/** Why the chosen items cannot be saved, or `null`. Nothing chosen is fine - it empties the container. */
export function contentsProblem(
  candidates: readonly ContentCandidate[],
  chosen: ReadonlySet<number>,
): string | null {
  const orders = new Set(
    candidates.filter((item) => chosen.has(item.id) && item.orderNo !== '').map((i) => i.orderNo),
  )
  return orders.size > 1 ? 'A container holds the items of one order only.' : null
}

/** True when the choice is exactly what the container holds now. */
export function contentsUnchanged(
  candidates: readonly ContentCandidate[],
  chosen: ReadonlySet<number>,
): boolean {
  const held = candidates.filter((item) => item.held)
  return held.length === chosen.size && held.every((item) => chosen.has(item.id))
}

/**
 * `PUT /packing/shipment/{id}/items`: makes the OPEN container hold exactly these package items; `[]` empties it.
 * What leaves becomes loose again, it is not deleted. 409 for an item in another container or a container that is
 * no longer OPEN, 400 for items of two orders.
 */
export async function replaceContainerItems(
  shipmentPackageId: string,
  packageItemIds: number[],
): Promise<void> {
  await api(`/packing/shipment/${encodeURIComponent(shipmentPackageId)}/items`, {
    method: 'PUT',
    body: JSON.stringify({ packageItemIds }),
  })
}

export interface NewContainer {
  shipmentPackageType: string
  packageNumber: string
  length: string
  width: string
  height: string
}

export const emptyNewContainer: NewContainer = {
  shipmentPackageType: 'CARTON',
  packageNumber: '',
  length: '',
  width: '',
  height: '',
}

/** Dimensions are optional, but a one that is typed has to be a number above nothing. */
export function newContainerProblem(form: NewContainer): string | null {
  for (const key of ['length', 'width', 'height'] as const) {
    if (form[key].trim() !== '') {
      const value = Number(form[key])
      if (!Number.isFinite(value) || value <= 0) return `The ${key} must be a number above 0.`
    }
  }
  return null
}

/** The body of `POST /packing/shipment` for an empty container; blank optional fields are left out. */
export function newContainerBody(form: NewContainer) {
  const number = (value: string) => (value.trim() === '' ? undefined : Number(value))
  return {
    shipmentPackageType: form.shipmentPackageType,
    ...(form.packageNumber.trim() === '' ? {} : { packageNumber: form.packageNumber.trim() }),
    ...(number(form.length) === undefined ? {} : { length: number(form.length) }),
    ...(number(form.width) === undefined ? {} : { width: number(form.width) }),
    ...(number(form.height) === undefined ? {} : { height: number(form.height) }),
  }
}

/** `POST /packing/shipment`: makes an empty OPEN container; the answer carries its id. */
export function createContainer(form: NewContainer): Promise<{ id: number }> {
  return api<{ id: number }>('/packing/shipment', {
    method: 'POST',
    body: JSON.stringify(newContainerBody(form)),
  })
}
