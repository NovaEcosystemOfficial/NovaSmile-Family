import { describe, expect, it } from 'vitest'
import { isValidFirebaseUid } from '../src/data/membersCloud'

describe('isValidFirebaseUid', () => {
  it('accepts typical Firebase Auth UIDs', () => {
    expect(isValidFirebaseUid('abcdefghijklmnopqrstuv')).toBe(true)
    expect(isValidFirebaseUid('AbCdEfGhIjKlMnOpQrStUvWxYz12')).toBe(true)
  })

  it('rejects short, empty, or malformed values', () => {
    expect(isValidFirebaseUid('')).toBe(false)
    expect(isValidFirebaseUid('short')).toBe(false)
    expect(isValidFirebaseUid('uid with spaces!!!!!!!!!!!')).toBe(false)
    expect(isValidFirebaseUid('uid/with/slashxxxxxxxxxxxx')).toBe(false)
  })
})
