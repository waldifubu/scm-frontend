/** `path` asking for page `page` (counted from 0). The first page is the backend's default, so it adds nothing. */
export function withPage(path: string, page: number): string {
  if (!(page > 0)) return path
  return `${path}${path.includes('?') ? '&' : '?'}page=${page}`
}
