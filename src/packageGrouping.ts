/**
 * The default look of the package list: the items of one order together (by order number, lowest first), and within
 * an order the newest first (`createdAt` is `yyyy-MM-dd HH:mm:ss`, which sorts as text). Items without an order
 * number come last. Stable: items equal in both keep the order the backend gave them.
 *
 * Done on the page that was fetched, not on the server: the backend sorts by one key, and its default is by date.
 * So a group is complete within a page; an order whose items spread over two pages shows up in both.
 */
export function groupByOrder<T extends Record<string, unknown>>(items: readonly T[]): T[] {
  const orderNo = (item: T) => (item.orderNo === null || item.orderNo === undefined || item.orderNo === '' ? null : Number(item.orderNo))
  const created = (item: T) => String(item.createdAt ?? '')
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const x = orderNo(a.item)
      const y = orderNo(b.item)
      if (x !== y) {
        if (x === null) return 1
        if (y === null) return -1
        if (Number.isNaN(x) || Number.isNaN(y)) return String(a.item.orderNo).localeCompare(String(b.item.orderNo))
        return x - y
      }
      const dates = created(b.item).localeCompare(created(a.item))
      return dates !== 0 ? dates : a.index - b.index
    })
    .map(({ item }) => item)
}
