import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'
import { nextProgress, productionSummary, runProduction } from './production'

/** The shortest time the bar is shown, so a quick answer still reads as work being done. */
const MIN_RUNNING_MS = 1600

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Starts a production run (`POST /produce`) after asking, shows a moving bar while the backend builds and lists
 * what it reports as built or skipped. A run uses up component stock, hence the question.
 */
export function ProduceButton() {
  const queryClient = useQueryClient()
  const [asking, setAsking] = useState(false)
  const [progress, setProgress] = useState(0)
  const run = useMutation({
    mutationFn: async () => {
      const [result] = await Promise.all([runProduction(), pause(MIN_RUNNING_MS)])
      return result
    },
    onMutate: () => setProgress(0),
    onSuccess: async () => {
      setProgress(100)
      await queryClient.invalidateQueries({ queryKey: ['stock'] })
      await queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  useEffect(() => {
    if (!run.isPending) return
    const timer = setInterval(() => setProgress((p) => nextProgress(p)), 100)
    return () => clearInterval(timer)
  }, [run.isPending])

  const result = run.data

  return (
    <div className="produce">
      <button
        type="button"
        className={`produce-button${run.isPending ? ' is-running' : ''}`}
        disabled={run.isPending}
        onClick={() => setAsking(true)}
      >
        <span className="produce-button-icon" aria-hidden="true">
          ⚙
        </span>
        {run.isPending ? 'Producing…' : 'Run production'}
      </button>

      {(run.isPending || result) && (
        <div
          className="progress mt-3"
          role="progressbar"
          aria-label="Production progress"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{ height: '0.9rem' }}
        >
          <div
            className={`progress-bar produce-bar${run.isPending ? ' progress-bar-striped progress-bar-animated' : ' bg-success'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {run.error && (
        <p className="text-danger mt-3 mb-0" role="alert">
          {run.error.message}
        </p>
      )}

      {result && (
        <div className="mt-3">
          <p className="fw-semibold mb-2" role="status">
            {productionSummary(result)}
          </p>
          {result.content.length > 0 && (
            <div className="table-responsive">
              <table className="table table-striped table-sm mb-0">
                <thead>
                  <tr>
                    <th>product</th>
                    <th>sku</th>
                    <th>storehouse</th>
                    <th>result</th>
                    <th>message</th>
                  </tr>
                </thead>
                <tbody>
                  {result.content.map((row, index) => (
                    <tr key={`${row.sku}-${index}`}>
                      <td>{row.productName}</td>
                      <td>
                        <small className="font-monospace">{row.sku}</small>
                      </td>
                      <td>{row.storehouseId ?? ''}</td>
                      <td>
                        <span
                          className={`badge ${row.produced ? 'text-bg-success' : 'text-bg-secondary'}`}
                        >
                          {row.produced ? 'built' : 'skipped'}
                        </span>
                      </td>
                      <td>{row.message ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {asking && (
        <ConfirmModal
          title="Run production"
          confirmLabel="Run production"
          busy={false}
          onCancel={() => setAsking(false)}
          onConfirm={() => {
            setAsking(false)
            run.mutate()
          }}
        >
          Build every product the component stock allows? The components are used up and the
          finished products are booked into stock.
        </ConfirmModal>
      )}
    </div>
  )
}
