import { pageNav } from '../paging'

/** The buttons to the page before and after a paged list, with where the list stands. Pages count from 0. */
export function Pager({
  page,
  size,
  total,
  onPage,
}: {
  page: number
  size: number
  total: number
  onPage: (page: number) => void
}) {
  const nav = pageNav(page, size, total)
  return (
    <div className="d-flex align-items-center gap-2">
      <button
        type="button"
        className="btn btn-outline-secondary btn-sm"
        aria-label="Previous page"
        disabled={nav.previous === null}
        onClick={() => nav.previous !== null && onPage(nav.previous)}
      >
        ‹
      </button>
      <span aria-live="polite">Page {Math.min(Math.max(page, 0), nav.last) + 1} of {nav.pages}</span>
      <button
        type="button"
        className="btn btn-outline-secondary btn-sm"
        aria-label="Next page"
        disabled={nav.next === null}
        onClick={() => nav.next !== null && onPage(nav.next)}
      >
        ›
      </button>
    </div>
  )
}
