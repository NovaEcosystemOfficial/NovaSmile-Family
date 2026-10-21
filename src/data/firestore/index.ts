/**
 * Data access layer Firestore (Spark, client-only).
 * Tutte le operazioni restituiscono DataResult esplicito (niente throw verso la UI).
 */

export type { DataError, DataResult } from './errors'
export { fail, firestoreUnavailable, mapFirestoreError, ok } from './errors'

export { PROFILE_SETTINGS_DOC_ID } from './paths'
export {
  activitiesCol,
  activityRef,
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
  voiceMessageRef,
  voiceMessagesCol,
} from './refs'

export {
  createFamily,
  getFamily,
  requireFamily,
} from './families'

export { getUserFamilyBinding } from './users'
export type { UserFamilyBinding } from './users'

export {
  createViewerMember,
  getFamilyMember,
  listFamilyMembers,
  removeFamilyMember,
  upsertFamilyMember,
} from './members'

export { getFamilyProfile, upsertFamilyProfile } from './profile'

export {
  createFamilyMessage,
  deleteFamilyMessage,
  getFamilyMessage,
  listFamilyMessages,
  updateFamilyMessage,
} from './messages'

export {
  createFamilyAppointment,
  deleteFamilyAppointment,
  getFamilyAppointment,
  listFamilyAppointments,
  updateFamilyAppointment,
} from './appointments'

export {
  createFamilyRoutine,
  getFamilyRoutine,
  getFamilyRoutineDay,
  listFamilyRoutineDays,
  listFamilyRoutines,
  upsertFamilyRoutineDay,
} from './routines'

export {
  createFamilyActivity,
  listFamilyActivities,
} from './activities'

export {
  createFamilyVoiceMessage,
  deleteFamilyVoiceMessage,
  listFamilyVoiceMessages,
} from './voiceMessages'
