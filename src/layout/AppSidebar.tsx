import { useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import type { UserDto } from '../shared/api/types'
import { sidebarLinks } from './navigation'
import { NavIcon } from './NavIcon'

export function AppSidebar({ user }: { user: UserDto }) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const links = sidebarLinks(user)

  return (
    <aside className={`app-sidebar${collapsed ? ' app-sidebar-collapsed' : ''}`}>
      <div className="d-flex align-items-center justify-content-between sidebar-heading">
        {!collapsed && <span className="fw-semibold">Navigation</span>}
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary sidebar-toggle"
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((current) => !current)}
        >
          <span aria-hidden="true">{collapsed ? '›' : '‹'}</span>
        </button>
      </div>
      <nav aria-label="Main navigation" className="nav nav-pills flex-column gap-1">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            activeOptions={{ exact: true }}
            title={collapsed ? link.label : undefined}
            aria-label={link.label}
            className={`nav-link d-flex align-items-center gap-2${
              pathname === link.to ||
              (pathname.startsWith(`${link.to}/`) &&
                !(link.to === '/order-items' && pathname === '/order-items/packable') &&
                (link.to !== '/orders' || !/^\/orders\/(create|new)(\/|$)/.test(pathname)))
                ? ' active'
                : ''
            }`}
          >
            <NavIcon name={link.icon} />
            {!collapsed && <span>{link.label}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
