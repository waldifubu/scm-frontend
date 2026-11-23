import { api } from '../../shared/api/client'
import { hasRole, type Schemas, type UserDto } from '../../shared/api/types'

export type ProductionResult = Schemas['ProductionResultDto']
export type ProductionRun = Schemas['ProductionPageResponse']

/** Who may start a run - the roles `POST /produce` is open to; the backend answers 403 to everybody else. */
export function mayProduce(user: UserDto): boolean {
  return hasRole(user, 'ADMIN') || hasRole(user, 'MANAGER') || hasRole(user, 'WAREHOUSE')
}

/** `POST /produce`: builds every product the component stock allows; the answer says what was built. */
export function runProduction(): Promise<ProductionRun> {
  return api<ProductionRun>('/produce', { method: 'POST' })
}

/** One line for the head of the result list. */
export function productionSummary(run: Pick<ProductionRun, 'produced' | 'content'>): string {
  if (run.produced === 0)
    return 'Nothing could be built - the components in stock do not cover a product.'
  return `${run.produced} unit${run.produced === 1 ? '' : 's'} built.`
}

/**
 * The next value of a progress bar that has no real progress to report (the call is one request): it closes in on
 * `ceiling` without ever reaching it, so the bar keeps moving while the backend works and only the answer fills it.
 */
export function nextProgress(current: number, ceiling = 92): number {
  return Math.min(ceiling, current + (ceiling - current) * 0.08 + 0.4)
}
