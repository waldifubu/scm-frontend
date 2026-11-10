import { describe, expect, it } from 'vite-plus/test'
import { ORDER_STATUSES } from './orders'
import { describeStatus, statusOfNodeId } from './statusDescriptions'

describe('statusDescriptions', () => {
  it('explain every status', () => {
    for (const status of ORDER_STATUSES) expect(describeStatus(status), status).toBeTruthy()
  })

  it('explain nothing else', () => {
    expect(describeStatus('toString')).toBeUndefined()
    expect(describeStatus(undefined)).toBeUndefined()
    expect(describeStatus(3)).toBeUndefined()
  })

  it('read the status off a Mermaid node id', () => {
    expect(statusOfNodeId('flowchart-IN_TRANSIT-7')).toBe('IN_TRANSIT')
    expect(statusOfNodeId('mermaid-1_flowchart-CREATED-0')).toBe('CREATED')
    expect(statusOfNodeId('ends')).toBeUndefined()
    expect(statusOfNodeId(null)).toBeUndefined()
  })
})
