import type { SidebarLink } from './navigation'

/**
 * The drawing of a page, as the navigation and the heading of the page both show it: 24 x 24, one line in the
 * current colour. One place for the paths, so a page and its entry in the navigation cannot drift apart.
 */
export function NavIcon({ name }: { name: SidebarLink['icon'] }) {
  const paths: Record<SidebarLink['icon'], string> = {
    orders: 'M7 3h10v18H5V5h2m2 4h6m-6 4h6m-6 4h6',
    products: 'm12 3 9 5-9 5-9-5 9-5Zm-9 5v9l9 5 9-5V8m-9 5v9',
    components: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
    // Boxes on a shelf: what the warehouse holds, and the forms to book and move it.
    stock: 'M3 4h18M3 12h18M3 20h18M5 4v8m14-8v8M5 12v8m14-8v8M9 7h6M9 15h6',
    packages: 'M3 7 12 3l9 4-9 5-9-5Zm0 0v10l9 4 9-4V7m-9 5v9',
    // A pallet with two cartons on it: what the page lists are the containers a shipment is made of.
    'shipment-packages': 'M4 5h7v6H4zM13 5h7v6h-7zM3 11h18v3H3zM5 14v4M12 14v4M19 14v4',
    // A box leaving: a container that is ready to go into a shipment.
    'shippable-items': 'M3 7h10v10H3zM13 12h8m-3-3 3 3-3 3',
    shipments: 'M3 12h13m-5-5 5 5-5 5M21 5v14',
    items: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
    'packable-items': 'M4 5h16M4 12h16M4 19h16M7 5v.01M7 12v.01M7 19v.01',
    storehouses: 'M3 10 12 4l9 6M5 9v11h14V9M9 20v-7h6v7',
    // A box with an arrow into it: goods asked for from a supplier.
    // An inbox tray: what suppliers were asked for, seen from the supplier.
    'my-requests': 'M3 13h5l1 3h6l1-3h5M3 13l3-8h12l3 8v6H3z',
    requests: 'M21 8v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8M1 4h22v4H1zM12 11v6M9 14l3 3 3-3',
    picking: 'M9 6h11M9 12h11M9 18h11M3 6l1 1 2-2m-3 7 1 1 2-2m-3 7 1 1 2-2',
    'new-orders': 'M7 3h8l4 4v14H7zM15 3v5h5m-9 5h5m-5 4h5',
    'create-order': 'M3 4h2l2.5 12h11L21 8H6m3 12h.01M17 20h.01M12 10h6m-3-3v6',
  }

  return (
    <svg
      aria-hidden="true"
      className="sidebar-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  )
}
