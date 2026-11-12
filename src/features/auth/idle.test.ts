import { describe, expect, it } from 'vite-plus/test'
import { IDLE_TIMEOUT_MS, PROMPT_BEFORE_IDLE_MS, secondsLeft } from './idle'

describe('idle timing', () => {
  it('starts at sixty seconds, with the question before the end', () => {
    expect(IDLE_TIMEOUT_MS).toBe(60_000)
    expect(PROMPT_BEFORE_IDLE_MS).toBeGreaterThan(0)
    expect(PROMPT_BEFORE_IDLE_MS).toBeLessThan(IDLE_TIMEOUT_MS)
  })

  it('rounds up, so a started second still counts', () => {
    expect(secondsLeft(20_000)).toBe(20)
    expect(secondsLeft(9_001)).toBe(10)
    expect(secondsLeft(1)).toBe(1)
  })

  it('never goes below zero', () => {
    expect(secondsLeft(0)).toBe(0)
    expect(secondsLeft(-250)).toBe(0)
  })
})
