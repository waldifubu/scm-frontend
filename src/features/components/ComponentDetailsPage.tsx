import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { useState, type ReactNode } from 'react'
import { meQueryOptions } from '../auth/auth'
import { componentQueryOptions, patchComponent, type ComponentDto } from './components'
import { hasRole } from '../../shared/api/types'
import { formOf, formProblem, patchOf, type ComponentForm } from './componentEdit'
import { cell } from '../../shared/lib/format'

const route = getRouteApi('/authed/components/$sku')

/** A product reads as its name with the article number in brackets, and links to its details. */
function productValue(product: unknown): ReactNode {
  if (typeof product !== 'object' || product === null) return cell(product)
  const { name, articleNo } = product as Record<string, unknown>
  if (articleNo === null || articleNo === undefined) return cell(name)
  return (
    <Link to="/products/$articleNo" params={{ articleNo: cell(articleNo) }}>
      {`${cell(name)} (${cell(articleNo)})`}
    </Link>
  )
}

/** The fields `PATCH /components/{sku}` changes - they are typed into in the details list itself. */
const EDITABLE: readonly { key: keyof ComponentForm; type?: string }[] = [
  { key: 'name' },
  { key: 'manufacturer' },
  { key: 'description' },
  { key: 'externalId' },
  { key: 'weight', type: 'number' },
  { key: 'qty', type: 'number' },
]
const EDITABLE_KEYS: readonly string[] = EDITABLE.map(({ key }) => key)

/**
 * The details list of one component. When the user may change it, the editable fields are text fields
 * in their rows, and Save under the list sends only what differs (`PATCH /components/{sku}`).
 * Like the shipment's data form it is built anew when the component changes, and the page holds the
 * notice, which would otherwise go with the rebuild.
 */
function ComponentFields({
  sku,
  component,
  fields,
  editable,
  notice,
  onNotice,
}: {
  sku: string
  component: ComponentDto
  fields: [string, unknown][]
  editable: boolean
  notice: string | null
  onNotice: (message: string | null) => void
}) {
  const queryClient = useQueryClient()
  const saved = formOf(component)
  const [form, setForm] = useState(saved)
  const patch = patchOf(component, form)
  const problem = formProblem(form)
  const dirty = Object.keys(patch).length > 0

  const save = useMutation({
    mutationFn: () => patchComponent(sku, patch),
    onSuccess: async () => {
      onNotice('Component saved.')
      await queryClient.invalidateQueries({ queryKey: ['components'] })
    },
  })

  const set = (field: keyof ComponentForm) => (value: string) => {
    onNotice(null)
    save.reset()
    setForm((current) => ({ ...current, [field]: value }))
  }

  // An editable field the backend left out (a null) still gets its row, so it can be filled in.
  const missing = EDITABLE_KEYS.filter((key) => !fields.some(([name]) => name === key))
  const rows: [string, unknown][] = editable
    ? [...fields, ...missing.map((key): [string, unknown] => [key, null])]
    : fields

  return (
    <form
      id="component-edit-form"
      onSubmit={(event) => {
        event.preventDefault()
        if (dirty && !problem) save.mutate()
      }}
    >
      <dl className="row mb-0">
        {rows.map(([key, value]) => {
          const field = editable ? EDITABLE.find((entry) => entry.key === key) : undefined
          return (
            <div key={key} className="row mb-1">
              <dt className="col-sm-3">{key}</dt>
              <dd className="col-sm-9 mb-0">
                {field ? (
                  <input
                    id={`component-${field.key}`}
                    aria-label={field.key}
                    className="form-control form-control-sm"
                    type={field.type ?? 'text'}
                    step={field.key === 'weight' ? 'any' : undefined}
                    min={field.key === 'qty' ? 1 : field.key === 'weight' ? 0 : undefined}
                    value={form[field.key]}
                    onChange={(event) => set(field.key)(event.target.value)}
                  />
                ) : key === 'product' ? (
                  productValue(value)
                ) : (
                  cell(value)
                )}
              </dd>
            </div>
          )
        })}
      </dl>
      {editable && (
        <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
          <button
            type="submit"
            className="btn btn-success"
            disabled={!dirty || !!problem || save.isPending}
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            disabled={!dirty || save.isPending}
            onClick={() => {
              onNotice(null)
              save.reset()
              setForm(saved)
            }}
          >
            Reset
          </button>
          {problem && dirty && <span className="text-danger">{problem}</span>}
          {save.error && (
            <span className="text-danger" role="alert">
              {save.error.message}
            </span>
          )}
          {notice && (
            <span className="text-success" role="status">
              {notice}
            </span>
          )}
        </div>
      )}
    </form>
  )
}

/** Every field of one component, shown below the components table; a list gets a table of its own. */
export function ComponentDetailsPage() {
  const { sku } = route.useParams()
  const { data: component, isPending, error } = useQuery(componentQueryOptions(sku))
  const { data: user } = useQuery(meQueryOptions)
  const [notice, setNotice] = useState<string | null>(null)
  // The roles `PATCH /components/{sku}` lets through; anybody else would get a 403.
  const canEdit = user
    ? ['ADMIN', 'MANAGER', 'WAREHOUSE'].some((role) => hasRole(user, role))
    : false

  const entries = component ? Object.entries(component) : []
  const lists = entries.filter(([, value]) => Array.isArray(value))
  const fields = entries.filter(([, value]) => !Array.isArray(value))

  return (
    <div className="card shadow-sm mt-4">
      <div className="card-body">
        <h3 className="h5">Component {sku}</h3>
        {isPending && <p className="mb-0">Loading details…</p>}
        {error && <p className="mb-0 text-danger">{error.message}</p>}
        {component && (
          <>
            {/* Keyed by what the component holds, so a change made elsewhere replaces what is typed. */}
            <ComponentFields
              key={Object.values(formOf(component)).join('|')}
              sku={sku}
              component={component}
              fields={fields}
              editable={canEdit}
              notice={notice}
              onNotice={setNotice}
            />
            {lists.map(([key, value]) => {
              const rows = (value as unknown[]).filter(
                (row): row is Record<string, unknown> => typeof row === 'object' && row !== null,
              )
              const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))]
              return (
                <section key={key}>
                  <h4 className="h6 mt-4">{key}</h4>
                  {rows.length === 0 ? (
                    <p className="text-body-secondary mb-0">None.</p>
                  ) : (
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
                                <td key={column}>{cell(row[column])}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
