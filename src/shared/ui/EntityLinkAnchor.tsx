import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { entityLinkOf, type EntityLink } from '../lib/entityLinks'

/**
 * The link for an {@link EntityLink}: an order number goes to that order's details, a SKU to the details
 * of the product behind it. In the ordinary link style, not the plain one the rest of a table row uses -
 * these are the cells that lead somewhere other than the row they sit in.
 */
export function EntityLinkAnchor({ link }: { link: EntityLink }) {
  if (link.kind === 'order') {
    return (
      <Link to="/orders/$orderNumber" params={{ orderNumber: link.orderNo }}>
        {link.orderNo}
      </Link>
    )
  }
  return (
    <Link to="/products/sku/$sku" params={{ sku: link.sku }}>
      {link.sku}
    </Link>
  )
}

/**
 * A table cell's value: a link where the column leads somewhere (`orderNo`, `sku` - see `entityLinkOf`),
 * else `children`, which is what the cell would have shown anyway.
 */
export function LinkedValue({
  column,
  value,
  children,
}: {
  column: string
  value: unknown
  children?: ReactNode
}) {
  const link = entityLinkOf(column, value)
  return link ? <EntityLinkAnchor link={link} /> : <>{children}</>
}
