import type { ComponentDto, ComponentPatch } from './api/components'

/** The edit form as text, one string per field, the way the inputs hold it. */
export interface ComponentForm {
  name: string
  manufacturer: string
  description: string
  externalId: string
  weight: string
  qty: string
}

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

/** The form filled from a component. */
export function formOf(component: ComponentDto): ComponentForm {
  return {
    name: text(component.name),
    manufacturer: text(component.manufacturer),
    description: text(component.description),
    externalId: text(component.externalId),
    weight: text(component.weight),
    qty: text(component.qty),
  }
}

/** What is wrong with the form, or `null`: the rules the backend answers with a 400. */
export function formProblem(form: ComponentForm): string | null {
  if (form.name.trim() === '') return 'Name must not be empty.'
  const qty = Number(form.qty)
  if (form.qty.trim() === '' || !Number.isInteger(qty) || qty < 1) return 'Qty has to be a whole number of at least 1.'
  if (form.weight.trim() !== '' && !(Number(form.weight) >= 0)) return 'Weight cannot be negative.'
  return null
}

/**
 * Only what differs from the component as loaded - a PATCH names the fields it changes. Clearing a
 * text field sends `''`, which the backend turns into "no value". Empty when nothing changed.
 */
export function patchOf(component: ComponentDto, form: ComponentForm): ComponentPatch {
  const before = formOf(component)
  const patch: ComponentPatch = {}
  if (form.name.trim() !== before.name) patch.name = form.name.trim()
  if (form.manufacturer.trim() !== before.manufacturer) patch.manufacturer = form.manufacturer.trim()
  if (form.description.trim() !== before.description) patch.description = form.description.trim()
  if (form.externalId.trim() !== before.externalId) patch.externalId = form.externalId.trim()
  if (form.weight.trim() !== '' && Number(form.weight) !== Number(before.weight)) patch.weight = Number(form.weight)
  if (Number(form.qty) !== Number(before.qty)) patch.qty = Number(form.qty)
  return patch
}
