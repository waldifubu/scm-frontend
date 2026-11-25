import type { OrderWorkflowDiagram } from './workflow'

/**
 * The Mermaid source of the order workflow, drawn from what the backend sends (`GET /orders/workflow/diagram`): the
 * nodes, the arrows worth drawing - a dotted one for a step that takes the order back - and the ends, which stand
 * beside the flow instead of hanging off one arbitrary node. Nothing of the flow itself is kept here.
 */

const NODE_ID = /^[A-Z_]+$/

/** Text that goes between quotes or on an arrow: words only, whatever the server sent. */
const words = (text: string) => text.replace(/[^A-Za-z0-9 ,.'-]/g, '')

/** A node's text on one line when it is short, otherwise on two, broken at the space nearest the middle. */
function nodeText(label: string): string {
  const text = words(label)
  if (text.length <= 10) return text
  let best = -1
  for (let at = text.indexOf(' '); at !== -1; at = text.indexOf(' ', at + 1)) {
    if (best === -1 || Math.abs(at - text.length / 2) < Math.abs(best - text.length / 2)) best = at
  }
  return best === -1 ? text : `${text.slice(0, best)}<br/>${text.slice(best + 1)}`
}

/**
 * The flow of the backend's diagram: a node for every status that is not an end, an arrow for every arrow it names
 * (dotted and labelled when it goes back), and the ends beside the flow. A status that is not a plain name is
 * left out - what the server sends does not become Mermaid syntax.
 */
export function flowFrom(diagram: OrderWorkflowDiagram): string {
  const ends = diagram.ends.filter((status) => NODE_ID.test(status))
  const lines = [
    ...diagram.nodes
      .filter((node) => NODE_ID.test(node.id) && !ends.includes(node.id))
      .map((node) => `  ${node.id}["${nodeText(node.label)}"]`),
    ...diagram.edges
      .filter((edge) => NODE_ID.test(edge.from) && NODE_ID.test(edge.to))
      .map((edge) => {
        const label = edge.label ? words(edge.label) : ''
        if (edge.kind === 'BACK') return `  ${edge.from} -. ${label} .-> ${edge.to}`
        return label ? `  ${edge.from} -->|${label}| ${edge.to}` : `  ${edge.from} --> ${edge.to}`
      }),
    '  subgraph ends [" "]',
    '    direction LR',
    ...ends.map((status) => `    ${status}["${nodeText(status.replaceAll('_', ' '))}"]`),
    '  end',
    '  classDef current fill:#0d6efd,stroke:#0a58ca,color:#fff,stroke-width:3px',
    '  classDef terminal fill:#f8f9fa,stroke:#adb5bd,color:#495057',
    ...(ends.length > 0 ? [`  class ${ends.join(',')} terminal`] : []),
  ]
  return `\n${lines.join('\n')}`
}

/** What the backend says a status means, or `undefined` when the diagram is not there or does not know it. */
export function describeNode(
  diagram: OrderWorkflowDiagram | undefined,
  status: unknown,
): string | undefined {
  return diagram?.nodes.find((node) => node.id === status)?.description
}

/** Which way the flow runs: left to right (wide), or top to bottom (tall, to fit a screen without scrolling). */
export type FlowDirection = 'LR' | 'TB'

/** The diagram with the node of `status` highlighted; a status that is not a plain name highlights nothing. */
export function workflowDiagram(
  diagram: OrderWorkflowDiagram,
  status: unknown,
  direction: FlowDirection = 'LR',
): string {
  const text = `flowchart ${direction}${flowFrom(diagram)}`
  const current = typeof status === 'string' && NODE_ID.test(status) ? status : null
  return current
    ? `${text}
  class ${current} current`
    : text
}

/** The status a Mermaid node belongs to, read from the id Mermaid gives it (`flowchart-IN_TRANSIT-7`). */
export function statusOfNodeId(id: string | null | undefined): string | undefined {
  return id?.match(/flowchart-([A-Z_]+)-\d+/)?.[1]
}
