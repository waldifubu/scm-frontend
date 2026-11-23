import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ChoiceSelect, DeleteRuleButton, NumberField, RuleHelp } from './RuleParts'
import {
  customerChoices,
  distributorChoices,
  numberOrNull,
  saveDistributorRule,
  type DistributorRule,
} from './rules'

const text = (value: number | null | undefined) =>
  value === null || value === undefined ? '' : String(value)

/** Whether the bound is a usable number: blank (no bound) or zero and up. */
const usable = (value: number | null) => value === null || (Number.isFinite(value) && value >= 0)

/** `[min, max)`: with both set, the minimum has to be below the maximum or the range matches nothing. */
const empty = (min: number | null, max: number | null) => min !== null && max !== null && min >= max

/**
 * A distributor rule to create (`rule` absent) or change. The carrier is required; the customer and the two
 * ranges are conditions, left blank for "any". Weight is in kg, volume in cm³, bounds are `[min, max)`.
 */
export function DistributorRuleForm({
  rule,
  onDone,
}: {
  rule?: DistributorRule
  onDone?: () => void
}) {
  const queryClient = useQueryClient()
  const distributors = useQuery(distributorChoices())
  const customers = useQuery(customerChoices())
  const [distributorId, setDistributorId] = useState<number | null>(rule?.distributorId ?? null)
  const [customerId, setCustomerId] = useState<number | null>(rule?.customerId ?? null)
  const [minWeight, setMinWeight] = useState(text(rule?.minWeight))
  const [maxWeight, setMaxWeight] = useState(text(rule?.maxWeight))
  const [minVolume, setMinVolume] = useState(text(rule?.minVolume))
  const [maxVolume, setMaxVolume] = useState(text(rule?.maxVolume))
  const [priority, setPriority] = useState(String(rule?.priority ?? 0))

  const minW = numberOrNull(minWeight)
  const maxW = numberOrNull(maxWeight)
  const minV = numberOrNull(minVolume)
  const maxV = numberOrNull(maxVolume)
  const priorityNumber = numberOrNull(priority)
  const weightBad = !usable(minW) || !usable(maxW) || empty(minW, maxW)
  const volumeBad = !usable(minV) || !usable(maxV) || empty(minV, maxV)
  const valid =
    distributorId !== null &&
    !weightBad &&
    !volumeBad &&
    priorityNumber !== null &&
    Number.isInteger(priorityNumber)

  const save = useMutation({
    mutationFn: () =>
      saveDistributorRule(
        {
          distributorId: distributorId ?? 0,
          customerId,
          minWeight: minW,
          maxWeight: maxW,
          minVolume: minV,
          maxVolume: maxV,
          priority: priorityNumber ?? 0,
        },
        rule?.id,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['distributor-rules'] })
      onDone?.()
    },
  })
  const idPrefix = rule ? `distributor-rule-${rule.id}` : 'new-distributor-rule'

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        save.mutate()
      }}
    >
      <h3 className="h5">{rule ? `Rule ${rule.id}` : 'New distributor rule'}</h3>
      <RuleHelp open={!rule}>
        <p className="mb-1">
          A distributor rule decides <strong>which carrier a shipment is offered to</strong>. It
          fits a shipment when every condition it sets holds:
        </p>
        <ul className="mb-1">
          <li>
            <strong>distributor</strong> - the carrier. Rules of a deactivated carrier are skipped,
            the next rule gets its turn.
          </li>
          <li>
            <strong>customer</strong> - only shipments for this customer; <em>any</em> means every
            customer.
          </li>
          <li>
            <strong>weight</strong> (kg) and <strong>volume</strong> (cm³) - a range per dimension,
            from (included) up to but not including the upper bound, so 0-50 and 50-100 never both
            claim 50. Leave a bound blank for no limit on that side, both blank for no condition.
          </li>
          <li>
            The rule that sets the <strong>most conditions</strong> wins (the customer, the weight
            range and the volume range count one each). A rule with no conditions is the catch-all.
          </li>
          <li>
            <strong>priority</strong> only decides between rules that set <em>the same number</em>{' '}
            of conditions: the higher number wins, with equal numbers the older rule (lower id). It
            never lets a less specific rule beat a more specific one.
          </li>
        </ul>
        <p className="mb-0">A shipment that no rule fits gets no suggested carrier.</p>
      </RuleHelp>
      <div className="row g-3">
        <ChoiceSelect
          id={`${idPrefix}-distributor`}
          label="distributor"
          choices={distributors.data}
          loading={distributors.isPending}
          value={distributorId}
          onChange={setDistributorId}
        />
        <ChoiceSelect
          id={`${idPrefix}-customer`}
          label="customer"
          anyLabel="any customer"
          choices={customers.data}
          loading={customers.isPending}
          value={customerId}
          onChange={setCustomerId}
        />
        <NumberField
          id={`${idPrefix}-minWeight`}
          label="weight from (kg)"
          value={minWeight}
          onChange={setMinWeight}
          invalid={weightBad}
        />
        <NumberField
          id={`${idPrefix}-maxWeight`}
          label="weight below (kg)"
          value={maxWeight}
          onChange={setMaxWeight}
          invalid={weightBad}
        />
        <NumberField
          id={`${idPrefix}-minVolume`}
          label="volume from (cm³)"
          value={minVolume}
          onChange={setMinVolume}
          invalid={volumeBad}
        />
        <NumberField
          id={`${idPrefix}-maxVolume`}
          label="volume below (cm³)"
          value={maxVolume}
          onChange={setMaxVolume}
          invalid={volumeBad}
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
      {(weightBad || volumeBad) && (
        <p className="text-danger small mt-2 mb-0">
          A range needs a minimum below its maximum; either may be left blank.
        </p>
      )}
      <div className="d-flex align-items-center gap-3 mt-3">
        <button type="submit" className="btn btn-primary" disabled={!valid || save.isPending}>
          {save.isPending ? 'Saving…' : rule ? 'Save' : 'Create'}
        </button>
        {save.isSuccess && rule && <span className="text-success">Saved.</span>}
        {save.error && <span className="text-danger">{save.error.message}</span>}
        {rule && <DeleteRuleButton kind="distributor" id={rule.id} />}
      </div>
    </form>
  )
}
