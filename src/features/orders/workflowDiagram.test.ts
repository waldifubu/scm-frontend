import { describe, expect, it } from 'vite-plus/test'
import { ORDER_STATUSES } from './orders'
import { workflowDiagram } from './workflowDiagram'

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
