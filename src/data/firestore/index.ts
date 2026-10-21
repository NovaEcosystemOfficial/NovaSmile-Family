/**
 * Data access layer Firestore — non collegato alla UI in STEP 1.
 * Tutte le operazioni restituiscono DataResult esplicito (niente throw verso la UI).
 */

export type { DataError, DataResult } from './errors'
export { fail, firestoreUnavailable, mapFirestoreError, ok } from './errors'

export { PROFILE_SETTINGS_DOC_ID } from './paths'
export {
  appointmentRef,
  appointmentsCol,
  familyRef,
  memberRef,
  membersCol,
  messageRef,
  messagesCol,
  profileSettingsRef,
  routineDayRef,
  routineDaysCol,
  routineRef,
  routinesCol,
  userRef,
} from './refs'

export {
  createFamily,
  getFamily,
  requireFamily,
} from './families'

export { getUserFamilyBinding } from './users'
export type { UserFamilyBinding } from './users'

export {
  getFamilyMember,
  listFamilyMembers,
  upsertFamilyMember,
} from './members'

export { getFamilyProfile, upsertFamilyProfile } from './profile'

export {
  createFamilyMessage,
  getFamilyMessage,
  listFamilyMessages,
} from './messages'

export {
  createFamilyAppointment,
  getFamilyAppointment,
  listFamilyAppointments,
} from './appointments'

export {
  createFamilyRoutine,
  getFamilyRoutine,
  getFamilyRoutineDay,
  listFamilyRoutineDays,
  listFamilyRoutines,
  upsertFamilyRoutineDay,
} from './routines'
