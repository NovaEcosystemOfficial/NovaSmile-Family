/**
 * Modelli cloud NovaSmile Family (schema analisi).
 * Separati dai tipi demo UI in `types/index.ts`.
 * Le date esposte al data layer sono ISO 8601 string.
 */

export type FamilyStatus = 'active' | 'archived'

export type MemberRole = 'owner' | 'parent' | 'viewer'

export type GreetingStyle = 'caldo' | 'energico' | 'tranquillo'

export type CloudMessageStatus =
  | 'draft'
  | 'queued'
  | 'scheduled'
  | 'delivered'
  | 'failed'

export type AppointmentStatus = 'scheduled' | 'cancelled' | 'sent' | 'failed'

export type RoutinePeriod = 'mattina' | 'pomeriggio' | 'sera'

export type ActivityTone = 'success' | 'info' | 'warning'

export interface Family {
  id: string
  name: string
  createdAt: string
  createdByUid: string
  status: FamilyStatus
}

export interface FamilyMember {
  uid: string
  familyId: string
  role: MemberRole
  displayName: string
  email: string
  joinedAt: string
}

export interface FamilyProfileSettings {
  familyId: string
  parentDisplayName: string
  childName: string
  greetingStyle: GreetingStyle
  showPoints: boolean
  reminderSound: boolean
  updatedAt: string
  updatedByUid: string
}

export interface FamilyMessage {
  id: string
  familyId: string
  type: 'text'
  text: string
  status: CloudMessageStatus
  createdAt: string
  createdByUid: string
  scheduledFor?: string
  deliveredAt?: string
}

export interface FamilyAppointment {
  id: string
  familyId: string
  text: string
  scheduledFor: string
  status: AppointmentStatus
  createdAt: string
  createdByUid: string
}

export interface FamilyRoutine {
  id: string
  familyId: string
  title: string
  description: string
  period: RoutinePeriod
  points: number
  active: boolean
  sortOrder: number
}

export interface RoutineCompletionEntry {
  completed: boolean
  completedAt?: string
  source?: 'parent' | 'child' | 'system'
}

/** Documento giornaliero: id = yyyy-mm-dd */
export interface FamilyRoutineDay {
  id: string
  familyId: string
  date: string
  completions: Record<string, RoutineCompletionEntry>
  pointsEarned: number
}

export interface FamilyActivity {
  id: string
  familyId: string
  title: string
  detail: string
  tone: ActivityTone
  createdAt: string
}

/** Metadati vocale: file in Storage, non blob in Firestore. */
export interface FamilyVoiceMessage {
  id: string
  familyId: string
  storagePath: string
  contentType: string
  durationSec: number
  byteSize: number
  status: 'uploaded' | 'failed'
  createdAt: string
  createdByUid: string
}

/** Input tipizzati per create/update (senza id generati dal server). */

export interface CreateFamilyInput {
  name: string
  createdByUid: string
  status?: FamilyStatus
}

export interface UpsertMemberInput {
  uid: string
  role: MemberRole
  displayName: string
  email: string
}

export interface UpsertProfileInput {
  parentDisplayName: string
  childName: string
  greetingStyle: GreetingStyle
  showPoints: boolean
  reminderSound: boolean
  updatedByUid: string
}

export interface CreateMessageInput {
  text: string
  createdByUid: string
  status?: CloudMessageStatus
  scheduledFor?: string
}

export interface CreateAppointmentInput {
  text: string
  scheduledFor: string
  createdByUid: string
  status?: AppointmentStatus
}

export interface CreateRoutineInput {
  title: string
  description: string
  period: RoutinePeriod
  points: number
  active?: boolean
  sortOrder?: number
}

export interface UpsertRoutineDayInput {
  date: string
  completions: Record<string, RoutineCompletionEntry>
  pointsEarned: number
}
