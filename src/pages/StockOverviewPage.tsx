import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { meQueryOptions } from '../api/auth'
import { productsQueryOptions } from '../api/products'
import { addStock, transferStock, type StockRow } from '../api/stock'
import { storehouseChoicesQueryOptions, type StorehouseChoice } from '../api/storehouses'
import { hasRole } from '../api/types'
import { addStockRequest, transferStockRequest } from '../stockForms'
import type { SkuOption } from '../skuSearch'
import { ProductStockCard } from './ProductStockCard'
import { SkuAutocomplete } from './SkuAutocomplete'
import { StockInventoryCard } from './StockInventoryCard'

type Notice = { text: string; failed: boolean } | null

function StorehouseSelect({
  id,
  label,
  value,
  onChange,
  choices,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  choices: StorehouseChoice[]
}) {
  return (
    <>
      <label className="form-label mb-0" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="form-select form-select-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Choose a storehouse…</option>
        {choices.map((choice) => (
          <option key={choice.id} value={choice.id}>
            {choice.name}
          </option>
        ))}
      </select>
    </>
  )
}

function QuantityField({
  id,
  value,
  onChange,
}: {
  id: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <>
      <label className="form-label mb-0" htmlFor={id}>
        Quantity
      </label>
      <input
        id={id}
        type="number"
        min={1}
        step={1}
        className="form-control form-control-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </>
  )
}

function FormFooter({ notice }: { notice: Notice }) {
  return (
    <div className="card-footer" style={{ minHeight: '3rem' }} role="status">
      {notice && (
        <span className={notice.failed ? 'text-danger' : 'text-success'}>{notice.text}</span>
      )}
    </div>
  )
}

/** `POST /stock/add`: more of an article into a storehouse. */
function BookStockForm({
  options,
  choices,
  onBooked,
}: {
  options: SkuOption[]
  choices: StorehouseChoice[]
  onBooked: (sku: string) => void
}) {
  const queryClient = useQueryClient()
  const [sku, setSku] = useState<string | null>(null)
  const [storehouseId, setStorehouseId] = useState('')
  const [qty, setQty] = useState('')
  const [notice, setNotice] = useState<Notice>(null)

  const book = useMutation({
    mutationFn: addStock,
    onSuccess: async (row: StockRow) => {
      setNotice({
        text: `Booked. ${row.storehouseName ?? 'The storehouse'} now holds ${row.onHand} (${row.available} available).`,
        failed: false,
      })
      setQty('')
      onBooked(row.sku)
      await queryClient.invalidateQueries({ queryKey: ['stock'] })
    },
    onError: (failure: Error) => setNotice({ text: failure.message, failed: true }),
  })

  return (
    <form
      className="card shadow-sm h-100"
      onSubmit={(event) => {
        event.preventDefault()
        const result = addStockRequest({ sku, storehouseId, qty })
        if (result.error !== undefined) setNotice({ text: result.error, failed: true })
        else {
          setNotice(null)
          book.mutate(result.request)
        }
      }}
    >
      <div className="card-body d-flex flex-column gap-2">
        <h3 className="h5">Book stock</h3>
        <p className="small text-body-secondary mb-1">
          Adds to what a storehouse holds of an article, as a goods receipt does.
        </p>
        <SkuAutocomplete options={options} value={sku} onChange={setSku} />
        <StorehouseSelect
          id="book-storehouse"
          label="Storehouse"
          value={storehouseId}
          onChange={setStorehouseId}
          choices={choices}
        />
        <QuantityField id="book-qty" value={qty} onChange={setQty} />
        <button
          type="submit"
          className="btn btn-success align-self-start mt-2"
          disabled={book.isPending}
        >
          Book
        </button>
      </div>
      <FormFooter notice={notice} />
    </form>
  )
}

/** `POST /stock/transfer`: an article from one storehouse to another. */
function TransferStockForm({
  options,
  choices,
  onMoved,
}: {
  options: SkuOption[]
  choices: StorehouseChoice[]
  onMoved: (sku: string) => void
}) {
  const queryClient = useQueryClient()
  const [sku, setSku] = useState<string | null>(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [qty, setQty] = useState('')
  const [notice, setNotice] = useState<Notice>(null)

  const transfer = useMutation({
    mutationFn: transferStock,
    onSuccess: async (row: StockRow) => {
      setNotice({
        text: `Moved. ${row.storehouseName ?? 'The target'} now holds ${row.onHand}.`,
        failed: false,
      })
      setQty('')
      onMoved(row.sku)
      await queryClient.invalidateQueries({ queryKey: ['stock'] })
    },
    onError: (failure: Error) => setNotice({ text: failure.message, failed: true }),
  })

  return (
    <form
      className="card shadow-sm h-100"
      onSubmit={(event) => {
        event.preventDefault()
        const result = transferStockRequest({ sku, from, to, qty })
        if (result.error !== undefined) setNotice({ text: result.error, failed: true })
        else {
          setNotice(null)
          transfer.mutate(result.request)
        }
      }}
    >
      <div className="card-body d-flex flex-column gap-2">
        <h3 className="h5">Transfer stock</h3>
        <p className="small text-body-secondary mb-1">
          Takes it out of one storehouse and books it into another.
        </p>
        <SkuAutocomplete options={options} value={sku} onChange={setSku} />
        <StorehouseSelect
          id="transfer-from"
          label="From"
          value={from}
          onChange={setFrom}
          choices={choices}
        />
        <StorehouseSelect
          id="transfer-to"
          label="To"
          value={to}
          onChange={setTo}
          choices={choices}
        />
        <QuantityField id="transfer-qty" value={qty} onChange={setQty} />
        <button
          type="submit"
          className="btn btn-primary align-self-start mt-2"
          disabled={transfer.isPending}
        >
          Transfer
        </button>
      </div>
      <FormFooter notice={notice} />
    </form>
  )
}

/**
 * The warehouse's stock desk: look up where an article is stored, book more of it into a storehouse
 * (`POST /stock/add`) and move it between two (`POST /stock/transfer`). For warehouse staff and admins -
 * the backend answers 403 to everybody else. What one storehouse holds is its own page, `/stock/storehouse/{id}`.
 */
export function StockOverviewPage() {
  const { data: user } = useQuery(meQueryOptions)
  const { data: products } = useQuery(productsQueryOptions({ size: 1000 }))
  const { data: storehouses } = useQuery(storehouseChoicesQueryOptions)
  const [lookup, setLookup] = useState<string | null>(null)

  if (!user) return null
  if (!hasRole(user, 'WAREHOUSE') && !hasRole(user, 'ADMIN')) {
    return <p className="text-danger">Only warehouse staff and admins may see the stock.</p>
  }

  const options: SkuOption[] = (products?.content ?? []).flatMap((product) =>
    typeof product.sku === 'string'
      ? [{ sku: product.sku, name: typeof product.name === 'string' ? product.name : undefined }]
      : [],
  )
  const choices = storehouses ?? []

  return (
    <>
      <StockInventoryCard />
      <div className="card shadow-sm">
        <div className="card-body d-flex flex-column gap-3">
          <h3 className="h5 mb-0">Stock of an article, storehouse by storehouse</h3>
          <SkuAutocomplete options={options} value={lookup} onChange={setLookup} />
        </div>
      </div>
      {lookup !== null && <ProductStockCard sku={lookup} />}
      <div className="row g-3 mt-1">
        <div className="col-12 col-lg-6">
          <BookStockForm options={options} choices={choices} onBooked={setLookup} />
        </div>
        <div className="col-12 col-lg-6">
          <TransferStockForm options={options} choices={choices} onMoved={setLookup} />
        </div>
      </div>
    </>
  )
}
