import { describe, expect, it } from 'vite-plus/test'
import { ORDER_STATUSES } from './orders'
import type { OrderWorkflowDiagram } from './workflow'
import { describeNode, flowFrom, workflowDiagram } from './workflowDiagram'

describe('workflowDiagram', () => {
  it('has a node for every status the order list knows', () => {
    const diagram = workflowDiagram(null)
    for (const status of ORDER_STATUSES) {
      expect(diagram, status).toMatch(new RegExp(`\\b${status}\\b`))
    }
  })

  it('marks the status the order stands in', () => {
    expect(workflowDiagram('IN_TRANSIT')).toContain('class IN_TRANSIT current')
  })

  it('marks nothing for a status it does not know, or for no status', () => {
    expect(workflowDiagram(undefined)).not.toContain('current\n')
    expect(workflowDiagram(null)).not.toMatch(/\n {2}class \w+ current/)
    expect(workflowDiagram(42)).not.toMatch(/\n {2}class \w+ current/)
  })

  it('does not let a status carry Mermaid syntax into the diagram', () => {
    const diagram = workflowDiagram('CREATED\n  click CREATED call alert()')
    expect(diagram).not.toContain('alert')
  })
})

describe('workflowDiagram direction', () => {
  it('runs left to right unless asked otherwise', () => {
    expect(workflowDiagram(null)).toMatch(/^flowchart LR\n/)
    expect(workflowDiagram(null, 'TB')).toMatch(/^flowchart TB\n/)
  })
})

// What `GET /orders/workflow/diagram` answers today (OrderWorkflowDiagramServiceImplTest holds the same arrows).
const forward = (from: string, to: string) => ({ from, to, kind: 'FORWARD' as const })
const BACKEND = {
  nodes: [
    'CREATED',
    'REVIEW',
    'ACKNOWLEDGED',
    'WAIT_SUPPLY',
    'IN_FULFILLMENT',
    'READY_FOR_DISPATCH',
    'IN_TRANSIT',
    'PARTIALLY_DELIVERED',
    'DELIVERED',
    'COMPLETED',
    'REJECTED',
    'CANCELLED',
  ].map((id) => ({ id, label: id.replaceAll('_', ' '), description: `About ${id}` })),
  edges: [
    forward('CREATED', 'REVIEW'),
    forward('CREATED', 'ACKNOWLEDGED'),
    forward('CREATED', 'WAIT_SUPPLY'),
    forward('REVIEW', 'ACKNOWLEDGED'),
    forward('REVIEW', 'WAIT_SUPPLY'),
    forward('ACKNOWLEDGED', 'IN_FULFILLMENT'),
    forward('WAIT_SUPPLY', 'IN_FULFILLMENT'),
    forward('IN_FULFILLMENT', 'READY_FOR_DISPATCH'),
    forward('READY_FOR_DISPATCH', 'IN_TRANSIT'),
    forward('IN_TRANSIT', 'PARTIALLY_DELIVERED'),
    forward('IN_TRANSIT', 'DELIVERED'),
    forward('PARTIALLY_DELIVERED', 'DELIVERED'),
    forward('DELIVERED', 'COMPLETED'),
    { from: 'IN_FULFILLMENT', to: 'REVIEW', kind: 'BACK' as const, label: 'all released' },
    {
      from: 'READY_FOR_DISPATCH',
      to: 'IN_FULFILLMENT',
      kind: 'BACK' as const,
      label: 'shipment cancelled',
    },
  ],
  ends: ['REJECTED', 'CANCELLED'],
} as OrderWorkflowDiagram

/** The arrows of a diagram text, whatever the node texts and the order they are written in. */
function arrows(text: string): string[] {
  const found: string[] = []
  for (const raw of text.replace(/\["[^"]*"\]/g, '').split('\n')) {
    const line = raw.trim()
    const plain = /^(\w+) --> (\w+)$/.exec(line)
    const labelled = /^(\w+) -->\|([^|]*)\| (\w+)$/.exec(line)
    const dotted = /^(\w+) -\. ([^.]*) \.-> (\w+)$/.exec(line)
    if (plain) found.push(`${plain[1]}>${plain[2]}`)
    if (labelled) found.push(`${labelled[1]}>${labelled[3]} ${labelled[2]?.trim()}`)
    if (dotted) found.push(`${dotted[1]}>${dotted[3]} ${dotted[2]?.trim()}`)
  }
  return found.sort()
}

describe('flowFrom', () => {
  it('draws the same arrows as the built-in flow, so a drift between backend and frontend turns this red', () => {
    expect(arrows(flowFrom(BACKEND))).toEqual(arrows(workflowDiagram(null)))
  })

  it('puts the ends beside the flow and gives them no arrows', () => {
    const flow = flowFrom(BACKEND)
    expect(flow).toContain('subgraph ends')
    expect(flow).toContain('class REJECTED,CANCELLED terminal')
    expect(arrows(flow).join()).not.toMatch(/REJECTED|CANCELLED/)
  })

  it('breaks a long name at the space nearest the middle and keeps a short one whole', () => {
    const flow = flowFrom(BACKEND)
    expect(flow).toContain('READY_FOR_DISPATCH["READY FOR<br/>DISPATCH"]')
    expect(flow).toContain('WAIT_SUPPLY["WAIT<br/>SUPPLY"]')
    expect(flow).toContain('IN_TRANSIT["IN TRANSIT"]')
  })

  it('draws a step back dotted and labelled', () => {
    expect(flowFrom(BACKEND)).toContain('IN_FULFILLMENT -. all released .-> REVIEW')
  })

  it('does not let what the server sent become Mermaid syntax', () => {
    const evil = {
      nodes: [{ id: 'CREATED', label: 'A"] --> X["B', description: '' }],
      edges: [{ from: 'CREATED', to: 'x\n  click', kind: 'FORWARD' }],
      ends: ['REJECTED\n  click'],
    } as unknown as OrderWorkflowDiagram
    const flow = flowFrom(evil)
    expect(flow).not.toContain('click')
    expect(flow).not.toContain('X["B')
  })

  it('is what workflowDiagram draws once the diagram is there, with the status marked', () => {
    const text = workflowDiagram('IN_TRANSIT', 'TB', BACKEND)
    expect(text).toMatch(/^flowchart TB\n/)
    expect(text).toContain('class IN_TRANSIT current')
    expect(text).toContain('IN_FULFILLMENT -. all released .-> REVIEW')
  })
})

describe('describeNode', () => {
  it('reads what the backend says a status means, and nothing for an unknown one or no diagram', () => {
    expect(describeNode(BACKEND, 'DELIVERED')).toBe('About DELIVERED')
    expect(describeNode(BACKEND, 'NOPE')).toBeUndefined()
    expect(describeNode(undefined, 'DELIVERED')).toBeUndefined()
  })
})
