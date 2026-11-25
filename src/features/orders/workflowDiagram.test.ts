import { describe, expect, it } from 'vite-plus/test'
import type { OrderWorkflowDiagram } from './workflow'
import { describeNode, flowFrom, statusOfNodeId, workflowDiagram } from './workflowDiagram'

// An answer shaped like the one of `GET /orders/workflow/diagram`.
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
  it('draws every arrow the answer names, and no other', () => {
    expect(arrows(flowFrom(BACKEND))).toEqual(
      BACKEND.edges
        .map((edge) => `${edge.from}>${edge.to}${edge.label ? ` ${edge.label}` : ''}`)
        .sort(),
    )
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
})

describe('workflowDiagram', () => {
  it('draws the answer left to right unless asked otherwise', () => {
    expect(workflowDiagram(BACKEND, null)).toMatch(/^flowchart LR\n/)
    expect(workflowDiagram(BACKEND, null, 'TB')).toMatch(/^flowchart TB\n/)
    expect(workflowDiagram(BACKEND, null)).toContain('IN_FULFILLMENT -. all released .-> REVIEW')
  })

  it('marks the status the order stands in', () => {
    expect(workflowDiagram(BACKEND, 'IN_TRANSIT')).toContain('class IN_TRANSIT current')
  })

  it('marks nothing for no status, or for something that is none', () => {
    for (const status of [undefined, null, 42]) {
      expect(workflowDiagram(BACKEND, status)).not.toMatch(/\n {2}class \w+ current/)
    }
  })

  it('does not let a status carry Mermaid syntax into the diagram', () => {
    expect(workflowDiagram(BACKEND, 'CREATED\n  click CREATED call alert()')).not.toContain('alert')
  })
})

describe('statusOfNodeId', () => {
  it('reads the status off a Mermaid node id', () => {
    expect(statusOfNodeId('flowchart-IN_TRANSIT-7')).toBe('IN_TRANSIT')
    expect(statusOfNodeId('mermaid-1_flowchart-CREATED-0')).toBe('CREATED')
    expect(statusOfNodeId('ends')).toBeUndefined()
    expect(statusOfNodeId(null)).toBeUndefined()
  })
})

describe('describeNode', () => {
  it('reads what the backend says a status means, and nothing for an unknown one or no diagram', () => {
    expect(describeNode(BACKEND, 'DELIVERED')).toBe('About DELIVERED')
    expect(describeNode(BACKEND, 'NOPE')).toBeUndefined()
    expect(describeNode(undefined, 'DELIVERED')).toBeUndefined()
  })
})
