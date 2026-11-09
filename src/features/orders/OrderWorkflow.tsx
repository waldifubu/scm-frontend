import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import RenderMermaid from 'react-x-mermaid'
import { describeStatus, statusOfNodeId } from './statusDescriptions'
import { workflowDiagram } from './workflowDiagram'

// Text a size that reads next to the page's own, and a diagram that keeps that size (`useMaxWidth: false`)
// instead of shrinking to the card: it scrolls sideways where it is wider.
const WIDE_CONFIG = {
  theme: 'neutral',
  securityLevel: 'strict',
  themeVariables: { fontSize: '18px' },
  flowchart: { useMaxWidth: false, nodeSpacing: 30, rankSpacing: 40, padding: 12 },
} as const

// The tall variant runs top to bottom and is scaled to the height of the window by CSS, so it is drawn compact.
const TALL_CONFIG = {
  theme: 'neutral',
  securityLevel: 'strict',
  themeVariables: { fontSize: '16px' },
  flowchart: { useMaxWidth: false, nodeSpacing: 20, rankSpacing: 22, padding: 8 },
} as const

/**
 * The whole order workflow as a diagram that can be folded away. With a `status` that state is highlighted;
 * the column to the right explains it. The tall variant has no status to start from, so there resting the pointer
 * on any state explains that one.
 *
 * `tall` draws the flow top to bottom and fits it to the height of the window, for a page of its own (the start
 * page); the default runs left to right and scrolls sideways, centred on the current state.
 *
 * It pulls in Mermaid, which is large, so pages load this file only when it is shown.
 */
export function OrderWorkflow({ status, tall = false }: { status?: unknown; tall?: boolean }) {
  const [open, setOpen] = useState(true)
  const [hovered, setHovered] = useState<string>()
  const scroller = useRef<HTMLDivElement>(null)

  // The wide diagram is wider than most cards, and the part that matters is where the order is: scroll it to the
  // middle of the view. Mermaid draws asynchronously, so wait for the highlighted node to appear.
  useEffect(() => {
    const box = scroller.current
    if (tall || !open || !box) return
    const centre = () => {
      const node = box.querySelector<SVGGraphicsElement>('.node.current')
      if (!node) return false
      const at = node.getBoundingClientRect()
      const frame = box.getBoundingClientRect()
      box.scrollLeft += at.left - frame.left - (frame.width - at.width) / 2
      return true
    }
    if (centre()) return
    const watch = new MutationObserver(() => {
      if (centre()) watch.disconnect()
    })
    watch.observe(box, { childList: true, subtree: true })
    return () => watch.disconnect()
  }, [status, tall, open])

  // One listener for the whole drawing: Mermaid owns the nodes, so they are found from the event.
  const point = (event: MouseEvent) => {
    const node = (event.target as Element).closest?.('.node')
    const hit = statusOfNodeId(node?.id)
    if (describeStatus(hit)) setHovered(hit)
    else if (!node) setHovered(undefined)
  }

  const shown = hovered ?? (typeof status === 'string' ? status : undefined)
  const text = describeStatus(shown)

  return (
    <div className="card shadow-sm mt-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center">
          <h3 className="h5 mb-0">Workflow</h3>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            aria-expanded={open}
            onClick={() => setOpen((was) => !was)}
          >
            {open ? 'Hide' : 'Show'}
          </button>
        </div>
        {open && (
          <div className="d-flex flex-wrap gap-3 mt-3">
            <div
              ref={scroller}
              className={`order-workflow flex-grow-1 overflow-x-auto${tall ? ' order-workflow-tall' : ''}`}
              onMouseOver={tall ? point : undefined}
              onMouseLeave={tall ? () => setHovered(undefined) : undefined}
            >
              <RenderMermaid
                mermaidCode={workflowDiagram(status, tall ? 'TB' : 'LR')}
                mermaidConfig={tall ? TALL_CONFIG : WIDE_CONFIG}
                disableCopy
                disableDownload
              />
            </div>
            <aside className="order-workflow-note" aria-live="polite">
              {text ? (
                <>
                  <h4 className="h6">{shown?.replaceAll('_', ' ')}</h4>
                  <p className="mb-0">{text}</p>
                </>
              ) : (
                tall && (
                  <p className="text-body-secondary mb-0">Point at a state to see what it means.</p>
                )
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
