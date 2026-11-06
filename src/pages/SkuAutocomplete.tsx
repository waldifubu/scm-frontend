import { useId, useState, type KeyboardEvent } from 'react'
import { suggestSkus, type SkuOption } from '../skuSearch'

interface Props {
  options: SkuOption[]
  /** The SKU chosen, or `null` while the list is not narrowed. */
  value: string | null
  onChange: (sku: string | null) => void
}

/**
 * A search field for one SKU: it suggests what contains the input (the SKU, or the name of the product
 * behind it), arrow keys and Enter pick one, Escape closes the list. A chosen SKU stays in the field
 * with a button that clears it again - the parent narrows its table to that SKU for as long as it is set.
 */
export function SkuAutocomplete({ options, value, onChange }: Props) {
  const listId = useId()
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const suggestions = suggestSkus(options, text)
  const chosen = value === null ? undefined : options.find((option) => option.sku === value)

  function choose(sku: string) {
    onChange(sku)
    setText('')
    setOpen(false)
    setActive(0)
  }

  function clear() {
    onChange(null)
    setText('')
    setOpen(false)
    setActive(0)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActive((index) => Math.min(index + 1, suggestions.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      const pick = suggestions[active]
      if (open && pick) {
        event.preventDefault()
        choose(pick.sku)
      }
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  if (value !== null) {
    return (
      <div className="input-group">
        <span className="input-group-text">SKU</span>
        <input
          className="form-control"
          readOnly
          value={chosen?.name ? `${value} — ${chosen.name}` : value}
          aria-label="Chosen SKU"
        />
        <button type="button" className="btn btn-outline-secondary" onClick={clear} aria-label="Clear the SKU filter">
          Clear
        </button>
      </div>
    )
  }

  return (
    <div className="position-relative">
      <div className="input-group">
        <span className="input-group-text">SKU</span>
        <input
          className="form-control"
          type="search"
          placeholder="Search a SKU or product name…"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && suggestions[active] ? `${listId}-${active}` : undefined}
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          // A click on a suggestion lands after the blur; its mousedown below keeps the list alive until then.
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
      </div>
      {open && (
        <ul id={listId} role="listbox" className="list-group position-absolute w-100 shadow-sm mt-1" style={{ zIndex: 10 }}>
          {suggestions.length === 0 ? (
            <li className="list-group-item text-body-secondary small">No SKU matches.</li>
          ) : (
            suggestions.map((option, index) => (
              <li
                key={option.sku}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                className={`list-group-item list-group-item-action py-1${index === active ? ' active' : ''}`}
                style={{ cursor: 'pointer' }}
                onMouseDown={(event) => {
                  event.preventDefault()
                  choose(option.sku)
                }}
                onMouseEnter={() => setActive(index)}
              >
                <small className="font-monospace">{option.sku}</small>
                {option.name && <span className="ms-2">{option.name}</span>}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
