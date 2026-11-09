/** Where a paged list stands, and which pages the buttons beside it lead to. Pages count from 0, as the backend's do. */
export interface PageNav {
  pages: number
  /** The page before this one, or `null` on the first. */
  previous: number | null
  /** The page after this one, or `null` on the last. */
  next: number | null
  last: number
}

export function pageNav(page: number, size: number, total: number): PageNav {
  // A list with no size (or none yet) is one page; an empty one still has its page 0.
  const pages = size > 0 ? Math.max(1, Math.ceil(total / size)) : 1
  const last = pages - 1
  // A page typed past the end (or below 0) is neither a "next" nor a "previous" of anything real: clamp, so the
  // buttons lead back into the list.
  const current = Math.min(Math.max(page, 0), last)
  return {
    pages,
    last,
    previous: current > 0 ? current - 1 : null,
    next: current < last ? current + 1 : null,
  }
}
