/**
 * The Mermaid source of the order workflow, with the status an order stands in marked.
 *
 * The steps are the ones the backend takes (see `OrderStatus` there): placed, confirmed - or parked until stock
 * is there -, reviewed, approved, in fulfilment, and from then on whatever the shipments its lines travel in
 * make of it. A dotted arrow goes back: a cancelled shipment hands its packages back and the order falls with
 * them. Rejected and cancelled are ends that can be reached from several steps, so they stand beside the flow
 * instead of hanging off one arbitrary node.
 */
const FLOW = `
  CREATED["CREATED"] --> ACKNOWLEDGED["ACKNOWLEDGED"]
  CREATED --> WAIT_SUPPLY["WAIT<br/>SUPPLY"]
  ACKNOWLEDGED --> REVIEW["REVIEW"]
  REVIEW --> APPROVED["APPROVED"]
  APPROVED --> IN_FULFILLMENT["IN<br/>FULFILLMENT"]
  WAIT_SUPPLY --> IN_FULFILLMENT
  IN_FULFILLMENT --> READY_FOR_DISPATCH["READY FOR<br/>DISPATCH"]
  READY_FOR_DISPATCH --> IN_TRANSIT["IN TRANSIT"]
  IN_TRANSIT --> PARTIALLY_DELIVERED["PARTIALLY<br/>DELIVERED"]
  IN_TRANSIT --> DELIVERED["DELIVERED"]
  PARTIALLY_DELIVERED --> DELIVERED
  DELIVERED --> COMPLETED["COMPLETED"]
  READY_FOR_DISPATCH -. shipment cancelled .-> IN_FULFILLMENT
  subgraph ends [" "]
    direction LR
    REJECTED["REJECTED"]
    CANCELLED["CANCELLED"]
  end
  classDef current fill:#0d6efd,stroke:#0a58ca,color:#fff,stroke-width:3px
  classDef terminal fill:#f8f9fa,stroke:#adb5bd,color:#495057
  class REJECTED,CANCELLED terminal`

/** Which way the flow runs: left to right (wide), or top to bottom (tall, to fit a screen without scrolling). */
export type FlowDirection = 'LR' | 'TB'

/**
 * The diagram, the node of `status` highlighted; a status the diagram does not know highlights nothing.
 */
export function workflowDiagram(status: unknown, direction: FlowDirection = 'LR'): string {
  const head = `flowchart ${direction}`
  const current = typeof status === 'string' && /^[A-Z_]+$/.test(status) ? status : null
  return current
    ? `${head}${FLOW}
  class ${current} current`
    : `${head}${FLOW}`
}
