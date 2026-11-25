import { useQuery } from '@tanstack/react-query'
import { categoriesQueryOptions } from '../categories/categories'

/** More than there will ever be: the picker offers every category at once. */
const ALL_CATEGORIES = { size: 1000 }

/** A checkbox per category; a product may be filed under several, or none. `GET /categories` is for admins only. */
export function CategoryPicker({
  idPrefix,
  selected,
  onChange,
}: {
  /** Tells the checkboxes of one form from those of another on the same page. */
  idPrefix: string
  selected: number[]
  onChange: (next: number[]) => void
}) {
  const { data, isPending, error } = useQuery(categoriesQueryOptions(ALL_CATEGORIES))

  return (
    <fieldset className="mb-3">
      <legend className="form-label fs-6">categories</legend>
      {isPending && <span className="text-body-secondary">Loading categories…</span>}
      {error && <span className="text-danger">{error.message}</span>}
      {data && data.content.length === 0 && (
        <span className="text-body-secondary">There are no categories yet.</span>
      )}
      <div className="d-flex flex-wrap column-gap-3">
        {data?.content.map((category) => (
          <div className="form-check" key={category.id}>
            <input
              id={`${idPrefix}-${category.id}`}
              className="form-check-input"
              type="checkbox"
              checked={selected.includes(category.id)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selected, category.id]
                    : selected.filter((id) => id !== category.id),
                )
              }
            />
            <label className="form-check-label" htmlFor={`${idPrefix}-${category.id}`}>
              {category.name}
            </label>
          </div>
        ))}
      </div>
    </fieldset>
  )
}
