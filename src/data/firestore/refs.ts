import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore'
import { PROFILE_SETTINGS_DOC_ID } from './paths'

export function userRef(db: Firestore, uid: string): DocumentReference {
  return doc(db, 'users', uid)
}

export function familyRef(db: Firestore, familyId: string): DocumentReference {
  return doc(db, 'families', familyId)
}

export function membersCol(
  db: Firestore,
  familyId: string,
): CollectionReference {
  return collection(db, 'families', familyId, 'members')
}

export function memberRef(
  db: Firestore,
  familyId: string,
  uid: string,
): DocumentReference {
  return doc(db, 'families', familyId, 'members', uid)
}

export function profileSettingsRef(
  db: Firestore,
  familyId: string,
): DocumentReference {
  return doc(db, 'families', familyId, 'profile', PROFILE_SETTINGS_DOC_ID)
}

export function messagesCol(
  db: Firestore,
  familyId: string,
): CollectionReference {
  return collection(db, 'families', familyId, 'messages')
}

export function messageRef(
  db: Firestore,
  familyId: string,
  messageId: string,
): DocumentReference {
  return doc(db, 'families', familyId, 'messages', messageId)
}

export function appointmentsCol(
  db: Firestore,
  familyId: string,
): CollectionReference {
  return collection(db, 'families', familyId, 'appointments')
}

export function appointmentRef(
  db: Firestore,
  familyId: string,
  appointmentId: string,
): DocumentReference {
  return doc(db, 'families', familyId, 'appointments', appointmentId)
}

export function routinesCol(
  db: Firestore,
  familyId: string,
): CollectionReference {
  return collection(db, 'families', familyId, 'routines')
}

export function routineRef(
  db: Firestore,
  familyId: string,
  routineId: string,
): DocumentReference {
  return doc(db, 'families', familyId, 'routines', routineId)
}

export function routineDaysCol(
  db: Firestore,
  familyId: string,
): CollectionReference {
  return collection(db, 'families', familyId, 'routineDays')
}

export function routineDayRef(
  db: Firestore,
  familyId: string,
  dateId: string,
): DocumentReference {
  return doc(db, 'families', familyId, 'routineDays', dateId)
}
