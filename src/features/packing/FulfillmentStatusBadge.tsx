import { fulfillmentBadge } from './fulfillmentBadge'
import { cell } from '../../shared/lib/format'

/** A fulfillment status as a coloured badge with its icon; the word stays, the icon only helps the eye. */
export function FulfillmentStatusBadge({ status }: { status: unknown }) {
  const { className, icon } = fulfillmentBadge(status)
  return (
    <span className={`badge d-inline-flex align-items-center gap-1 text-nowrap ${className}`}>
      <svg
        aria-hidden="true"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={icon} />
      </svg>
      {cell(status).replaceAll('_', ' ')}
    </span>
  )
}
