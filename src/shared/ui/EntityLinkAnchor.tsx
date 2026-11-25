import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { entityLinkOf, type EntityLink } from '../lib/entityLinks'
import { meQueryOptions } from '../../features/auth/auth'
import { mayOpen } from '../../layout/navigation'

/**
 * The link for an {@link EntityLink}: an order number goes to that order's details, a SKU to the details
 * of the product behind it. In the ordinary link style, not the plain one the rest of a table row uses -
 * these are the cells that lead somewhere other than the row they sit in. An order number is plain text for
 * somebody who may not open the order: the link would only lead them back to the start page.
 */
export function EntityLinkAnchor({ link }: { link: EntityLink }) {
  const { data: user } = useQuery(meQueryOptions)
  if (link.kind === 'order') {
    if (user && !mayOpen(user, `/orders/${link.orderNo}`)) return <>{link.orderNo}</>
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
