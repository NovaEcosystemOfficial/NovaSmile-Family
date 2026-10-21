import { Timestamp, type DocumentData } from 'firebase/firestore'
import type {
  AppointmentStatus,
  CloudMessageStatus,
  Family,
  FamilyAppointment,
  FamilyMember,
  FamilyMessage,
  FamilyProfileSettings,
  FamilyRoutine,
  FamilyRoutineDay,
  FamilyStatus,
  GreetingStyle,
  MemberRole,
  RoutineCompletionEntry,
  RoutinePeriod,
} from '../../types/cloud'

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function timestampToIso(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString()
  }
  if (typeof value === 'string') {
    return value
  }
  return ''
}

export function isoToTimestamp(iso: string): Timestamp {
  return Timestamp.fromDate(new Date(iso))
}

function asFamilyStatus(value: unknown): FamilyStatus {
  return value === 'archived' ? 'archived' : 'active'
}

function asMemberRole(value: unknown): MemberRole {
  if (value === 'parent' || value === 'viewer' || value === 'owner') {
    return value
  }
  return 'viewer'
}

function asGreetingStyle(value: unknown): GreetingStyle {
  if (value === 'energico' || value === 'tranquillo' || value === 'caldo') {
    return value
  }
  return 'caldo'
}

function asMessageStatus(value: unknown): CloudMessageStatus {
  switch (value) {
    case 'draft':
    case 'queued':
    case 'scheduled':
    case 'delivered':
    case 'failed':
      return value
    default:
      return 'draft'
  }
}

function asAppointmentStatus(value: unknown): AppointmentStatus {
  switch (value) {
    case 'scheduled':
    case 'cancelled':
    case 'sent':
    case 'failed':
      return value
    default:
      return 'scheduled'
  }
}

function asRoutinePeriod(value: unknown): RoutinePeriod {
  if (value === 'mattina' || value === 'pomeriggio' || value === 'sera') {
    return value
  }
  return 'mattina'
}

function asCompletions(value: unknown): Record<string, RoutineCompletionEntry> {
  if (!value || typeof value !== 'object') return {}
  const out: Record<string, RoutineCompletionEntry> = {}
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!entry || typeof entry !== 'object') continue
    const row = entry as Record<string, unknown>
    out[key] = {
      completed: asBoolean(row.completed),
      completedAt: row.completedAt
        ? timestampToIso(row.completedAt)
        : undefined,
      source:
        row.source === 'parent' ||
        row.source === 'child' ||
        row.source === 'system'
          ? row.source
          : undefined,
    }
  }
  return out
}

export function familyFromDoc(
  id: string,
  data: DocumentData,
): Family {
  return {
    id,
    name: asString(data.name),
    createdAt: timestampToIso(data.createdAt),
    createdByUid: asString(data.createdByUid),
    status: asFamilyStatus(data.status),
  }
}

export function memberFromDoc(
  uid: string,
  familyId: string,
  data: DocumentData,
): FamilyMember {
  return {
    uid,
    familyId,
    role: asMemberRole(data.role),
    displayName: asString(data.displayName),
    email: asString(data.email),
    joinedAt: timestampToIso(data.joinedAt),
  }
}

export function profileFromDoc(
  familyId: string,
  data: DocumentData,
): FamilyProfileSettings {
  return {
    familyId,
    parentDisplayName: asString(data.parentDisplayName),
    childName: asString(data.childName),
    greetingStyle: asGreetingStyle(data.greetingStyle),
    showPoints: asBoolean(data.showPoints, true),
    reminderSound: asBoolean(data.reminderSound, true),
    updatedAt: timestampToIso(data.updatedAt),
    updatedByUid: asString(data.updatedByUid),
  }
}

export function messageFromDoc(
  id: string,
  familyId: string,
  data: DocumentData,
): FamilyMessage {
  return {
    id,
    familyId,
    type: 'text',
    text: asString(data.text),
    status: asMessageStatus(data.status),
    createdAt: timestampToIso(data.createdAt),
    createdByUid: asString(data.createdByUid),
    scheduledFor: data.scheduledFor
      ? timestampToIso(data.scheduledFor)
      : undefined,
    deliveredAt: data.deliveredAt
      ? timestampToIso(data.deliveredAt)
      : undefined,
  }
}

export function appointmentFromDoc(
  id: string,
  familyId: string,
  data: DocumentData,
): FamilyAppointment {
  return {
    id,
    familyId,
    text: asString(data.text),
    scheduledFor: timestampToIso(data.scheduledFor),
    status: asAppointmentStatus(data.status),
    createdAt: timestampToIso(data.createdAt),
    createdByUid: asString(data.createdByUid),
  }
}

export function routineFromDoc(
  id: string,
  familyId: string,
  data: DocumentData,
): FamilyRoutine {
  return {
    id,
    familyId,
    title: asString(data.title),
    description: asString(data.description),
    period: asRoutinePeriod(data.period),
    points: asNumber(data.points),
    active: asBoolean(data.active, true),
    sortOrder: asNumber(data.sortOrder),
  }
}

export function routineDayFromDoc(
  id: string,
  familyId: string,
  data: DocumentData,
): FamilyRoutineDay {
  return {
    id,
    familyId,
    date: asString(data.date, id),
    completions: asCompletions(data.completions),
    pointsEarned: asNumber(data.pointsEarned),
  }
}
