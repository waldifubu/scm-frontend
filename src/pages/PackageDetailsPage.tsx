import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { packageQueryOptions, type PackageDto } from '../api/packages'
import { LinkedValue } from './EntityLinkAnchor'

const route = getRouteApi('/authed/packages/$packageId')

function cell(value: unknown): string {
  if (value === null || value === undefined) return ''
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

function isRowList(value: unknown): value is PackageDto[] {
  return Array.isArray(value) && value.length > 0 && value.every((row) => typeof row === 'object' && row !== null)
}

/** A sibling is a package id, or an object that holds one. */
function siblingId(value: unknown): string {
  if (value && typeof value === 'object') {
    const row = value as Record<string, unknown>
    return cell(row.id ?? row.packageId)
  }
  return cell(value)
}

function SiblingLinks({ value }: { value: unknown }) {
  const ids = (Array.isArray(value) ? value : [value]).map(siblingId).filter((id) => id !== '')
  if (ids.length === 0) return <p className="text-body-secondary mb-0">None.</p>
  return (
    <p className="mb-0">
      {ids.map((id) => (
        <Link key={id} to="/packages/$packageId" params={{ packageId: id }} className="me-3">
          {id}
        </Link>
      ))}
    </p>
  )
}

function RowTable({ rows }: { rows: PackageDto[] }) {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))]

  return (
    <div className="table-responsive">
      <table className="table table-striped table-sm mb-0">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={cell(row.id) || index}>
              {columns.map((column) => (
                <td key={column}>
                  <LinkedValue column={column} value={row[column]}>
                    {cell(row[column])}
                  </LinkedValue>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** The details of a package, shown below the packages table; each list gets a table of its own, everything else is a field. */
export function PackageDetailsPage() {
  const { packageId } = route.useParams()
  const { data: pack, isPending, error } = useQuery(packageQueryOptions(packageId))

  const entries = pack ? Object.entries(pack) : []
  const isList = ([key, value]: [string, unknown]) => Array.isArray(value) && key !== 'siblings'
  const lists = entries.filter(isList)
  const fields = entries.filter((entry) => !isList(entry) && entry[0] !== 'siblings')
  const siblings = entries.find(([key]) => key === 'siblings')

  return (
    <div className="card shadow-sm mt-4">
      <div className="card-body">
        <h3 className="h5">Package {packageId}</h3>
        {isPending && <p className="mb-0">Loading details…</p>}
        {error && <p className="mb-0 text-danger">{error.message}</p>}
        {pack && (
          <>
            <dl className="row mb-0">
              {fields.map(([key, value]) => (
                <div key={key} className="row">
                  <dt className="col-sm-3">{key}</dt>
                  <dd className="col-sm-9">
                    <LinkedValue column={key} value={value}>
                      {cell(value)}
                    </LinkedValue>
                  </dd>
                </div>
              ))}
            </dl>
            {siblings && (
              <section>
                <h4 className="h6 mt-4">siblings</h4>
                <SiblingLinks value={siblings[1]} />
              </section>
            )}
            {lists.map(([key, value]) => (
              <section key={key}>
                <h4 className="h6 mt-4">{key}</h4>
                {isRowList(value) ? (
                  <RowTable rows={value} />
                ) : (
                  <p className="text-body-secondary mb-0">
                    {Array.isArray(value) && value.length === 0 ? 'None.' : cell(value)}
                  </p>
                )}
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  )
}