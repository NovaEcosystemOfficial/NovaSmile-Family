import { describe, expect, it } from 'vitest'
import { localDateTimeToIso, todayDateInput } from '../src/data/dateTime'
import { computeDayProgress } from '../src/data/routinesCloud'
import type { FamilyRoutine, FamilyRoutineDay } from '../src/types/cloud'

describe('dateTime', () => {
  it('formats today as yyyy-mm-dd', () => {
    expect(todayDateInput(new Date('2026-10-21T12:00:00'))).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    )
  })

  it('converts local date+time to ISO', () => {
    const iso = localDateTimeToIso('2026-10-21', '07:30')
    expect(iso).toBeTruthy()
    expect(new Date(iso!).getFullYear()).toBe(2026)
  })

  it('rejects invalid inputs', () => {
    expect(localDateTimeToIso('21-10-2026', '07:30')).toBeNull()
    expect(localDateTimeToIso('2026-10-21', '7:30')).toBeNull()
  })
})

describe('computeDayProgress', () => {
  const routines: FamilyRoutine[] = [
    {
      id: 'a',
      familyId: 'f',
      title: 'A',
      description: '',
      period: 'mattina',
      points: 10,
      active: true,
      sortOrder: 1,
    },
    {
      id: 'b',
      familyId: 'f',
      title: 'B',
      description: '',
      period: 'sera',
      points: 5,
      active: true,
      sortOrder: 2,
    },
  ]

  it('counts completions and prefers day.pointsEarned', () => {
    const day: FamilyRoutineDay = {
      id: '2026-10-21',
      familyId: 'f',
      date: '2026-10-21',
      completions: {
        a: { completed: true },
        b: { completed: false },
      },
      pointsEarned: 10,
    }
    expect(computeDayProgress(routines, day)).toEqual({
      completed: 1,
      total: 2,
      points: 10,
    })
  })
})
