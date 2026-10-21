import { describe, expect, it } from 'vitest'
import { pickTrustedFamilyId, profileToPreferences } from '../src/data/familyTrust'
import type { FamilyMember } from '../src/types/cloud'

function member(
  overrides: Partial<FamilyMember> & Pick<FamilyMember, 'uid' | 'familyId'>,
): FamilyMember {
  return {
    role: 'owner',
    displayName: 'Test',
    email: 't@example.com',
    joinedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('pickTrustedFamilyId', () => {
  it('restituisce null senza cache o membership', () => {
    expect(pickTrustedFamilyId(null, null, 'u1')).toBeNull()
    expect(
      pickTrustedFamilyId('fam-a', null, 'u1'),
    ).toBeNull()
  })

  it('accetta solo membership coerente con uid e familyId', () => {
    expect(
      pickTrustedFamilyId(
        'fam-a',
        member({ uid: 'u1', familyId: 'fam-a' }),
        'u1',
      ),
    ).toBe('fam-a')

    expect(
      pickTrustedFamilyId(
        'fam-a',
        member({ uid: 'u2', familyId: 'fam-a' }),
        'u1',
      ),
    ).toBeNull()

    expect(
      pickTrustedFamilyId(
        'fam-a',
        member({ uid: 'u1', familyId: 'fam-b' }),
        'u1',
      ),
    ).toBeNull()

    expect(
      pickTrustedFamilyId(
        'fam-other',
        member({ uid: 'u1', familyId: 'fam-a' }),
        'u1',
      ),
    ).toBeNull()
  })
})

describe('profileToPreferences', () => {
  it('mappa i campi cloud sul modello UI locale', () => {
    expect(
      profileToPreferences({
        parentDisplayName: 'Alex',
        childName: 'Sam',
        greetingStyle: 'energico',
        showPoints: false,
        reminderSound: true,
      }),
    ).toEqual({
      parentName: 'Alex',
      childName: 'Sam',
      greetingStyle: 'energico',
      showPoints: false,
      reminderSound: true,
    })
  })
})
