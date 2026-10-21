import { describe, expect, it } from 'vitest'
import { statusForImmediateSend } from '../src/data/messagesCloud'

describe('statusForImmediateSend', () => {
  it('uses queued so Kids can read the message immediately', () => {
    expect(statusForImmediateSend()).toBe('queued')
  })

  it('does not use draft or delivered for immediate send', () => {
    const status = statusForImmediateSend()
    expect(status).not.toBe('draft')
    expect(status).not.toBe('delivered')
    expect(status).not.toBe('scheduled')
  })
})
