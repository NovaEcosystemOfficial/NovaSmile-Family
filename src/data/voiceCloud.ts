import {
  createFamilyVoiceMessage,
  deleteFamilyVoiceMessage,
  listFamilyVoiceMessages,
} from './firestore/voiceMessages'
import { requireFamilyEditor, requireFamilyMember } from './memberGate'
import type { DataResult } from './firestore/errors'
import type { FamilyVoiceMessage } from '../types/cloud'

export async function listVerifiedVoiceMessages(
  familyId: string,
  uid: string,
): Promise<DataResult<FamilyVoiceMessage[]>> {
  const member = await requireFamilyMember(
    familyId,
    uid,
    'Non sei membro di questa famiglia: vocali non disponibili.',
  )
  if (!member.ok) return member
  return listFamilyVoiceMessages(familyId)
}

export async function uploadVerifiedVoiceMessage(
  familyId: string,
  uid: string,
  input: { blob: Blob; durationSec: number; contentType: string },
): Promise<DataResult<FamilyVoiceMessage>> {
  const editor = await requireFamilyEditor(
    familyId,
    uid,
    'Ruolo viewer: non puoi caricare vocali.',
  )
  if (!editor.ok) return editor

  return createFamilyVoiceMessage(familyId, {
    createdByUid: uid,
    blob: input.blob,
    durationSec: input.durationSec,
    contentType: input.contentType,
  })
}

export async function deleteVerifiedVoiceMessage(
  familyId: string,
  uid: string,
  voice: FamilyVoiceMessage,
): Promise<DataResult<true>> {
  const editor = await requireFamilyEditor(familyId, uid)
  if (!editor.ok) return editor
  if (editor.data.role !== 'owner') {
    return failOwnerOnly()
  }
  return deleteFamilyVoiceMessage(familyId, voice)
}

function failOwnerOnly(): DataResult<true> {
  return {
    ok: false,
    error: {
      code: 'firestore/permission-denied',
      message: 'Solo il ruolo owner può eliminare i vocali.',
    },
  }
}
