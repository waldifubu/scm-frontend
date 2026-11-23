import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ChoiceSelect, DeleteRuleButton, NumberField, RuleHelp } from './RuleParts'
import {
  componentChoices,
  numberOrNull,
  productChoices,
  saveSupplierRule,
  supplierChoices,
  type SupplierRule,
} from './rules'

/**
 * A supplier rule to create (`rule` absent) or change. The supplier is required; component and product are
 * conditions, and "any" leaves them open.
 */
export function SupplierRuleForm({ rule, onDone }: { rule?: SupplierRule; onDone?: () => void }) {
  const queryClient = useQueryClient()
  const suppliers = useQuery(supplierChoices())
  const components = useQuery(componentChoices())
  const products = useQuery(productChoices())
  const [supplierId, setSupplierId] = useState<number | null>(rule?.supplierId ?? null)
  const [componentId, setComponentId] = useState<number | null>(rule?.componentId ?? null)
  const [productId, setProductId] = useState<number | null>(rule?.productId ?? null)
  const [priority, setPriority] = useState(String(rule?.priority ?? 0))
  const save = useMutation({
    mutationFn: () =>
      saveSupplierRule(
        {
          supplierId: supplierId ?? 0,
          componentId,
          productId,
          priority: numberOrNull(priority) ?? 0,
        },
        rule?.id,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['supplier-rules'] })
      onDone?.()
    },
  })
  const idPrefix = rule ? `supplier-rule-${rule.id}` : 'new-supplier-rule'
  const priorityNumber = numberOrNull(priority)
  const valid = supplierId !== null && priorityNumber !== null && Number.isInteger(priorityNumber)

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        save.mutate()
      }}
    >
      <h3 className="h5">{rule ? `Rule ${rule.id}` : 'New supplier rule'}</h3>
      <RuleHelp open={!rule}>
        <p className="mb-1">
          A supplier rule decides <strong>which supplier a component request is placed with</strong>
          . Every component of a request is looked at on its own; of all rules that fit it, one
          wins:
        </p>
        <ul className="mb-1">
          <li>
            <strong>supplier</strong> - who gets the request. Rules of a deactivated supplier are
            skipped, the next rule gets its turn.
          </li>
          <li>
            <strong>component</strong> / <strong>product</strong> - the conditions. <em>any</em>{' '}
            means no condition. A rule fits a component when every condition it sets holds: the
            component itself, or the product it belongs to.
          </li>
          <li>
            The <strong>more specific</strong> rule wins: one naming the component beats one naming
            only its product, which beats a rule that names neither (the catch-all, which ranks
            last).
          </li>
          <li>
            <strong>priority</strong> only decides between rules that are <em>equally specific</em>:
            the higher number wins, and with equal numbers the older rule (lower id). It never lets
            a less specific rule beat a more specific one.
          </li>
        </ul>
        <p className="mb-0">
          A component that no rule covers makes the whole request fail with a 409, so keep a
          catch-all (both conditions on <em>any</em>) as a fallback.
        </p>
      </RuleHelp>
      <div className="row g-3">
        <ChoiceSelect
          id={`${idPrefix}-supplier`}
          label="supplier"
          choices={suppliers.data}
          loading={suppliers.isPending}
          value={supplierId}
          onChange={setSupplierId}
        />
        <ChoiceSelect
          id={`${idPrefix}-component`}
          label="component"
          anyLabel="any component"
          choices={components.data}
          loading={components.isPending}
          value={componentId}
          onChange={setComponentId}
        />
        <ChoiceSelect
          id={`${idPrefix}-product`}
          label="product"
          anyLabel="any product"
          choices={products.data}
          loading={products.isPending}
          value={productId}
          onChange={setProductId}
        />
        <NumberField
          id={`${idPrefix}-priority`}
          label="priority"
          hint="Higher wins between equally specific rules. Default 0."
          value={priority}
          onChange={setPriority}
          invalid={priorityNumber === null || !Number.isInteger(priorityNumber)}
        />
      </div>
      <div className="d-flex align-items-center gap-3 mt-3">
        <button type="submit" className="btn btn-primary" disabled={!valid || save.isPending}>
          {save.isPending ? 'Saving…' : rule ? 'Save' : 'Create'}
        </button>
        {save.isSuccess && rule && <span className="text-success">Saved.</span>}
        {save.error && <span className="text-danger">{save.error.message}</span>}
        {rule && <DeleteRuleButton kind="supplier" id={rule.id} />}
      </div>
    </form>
  )
}
