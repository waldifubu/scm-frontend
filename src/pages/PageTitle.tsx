import type { ReactNode } from 'react'
import type { SidebarLink } from '../navigation'
import { NavIcon } from './NavIcon'

/**
 * The heading of a page: the icon the page has in the navigation, then its title. The same drawing in both
 * places, so the page a person lands on says it is the one they clicked. `className` is for placement
 * (`me-auto` where the filters sit to the right of the title).
 */
export function PageTitle({
  icon,
  className,
  children,
}: {
  icon: SidebarLink['icon']
  className?: string
  children: ReactNode
}) {
  return (
    <h2 className={`h4 mb-0 d-flex align-items-center gap-2${className ? ` ${className}` : ''}`}>
      <NavIcon name={icon} />
      {children}
    </h2>
  )
}
