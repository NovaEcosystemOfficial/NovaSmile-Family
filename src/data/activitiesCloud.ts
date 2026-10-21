import { listFamilyActivities } from './firestore/activities'
import { requireFamilyMember } from './memberGate'
import type { DataResult } from './firestore/errors'
import type { FamilyActivity } from '../types/cloud'

export async function listVerifiedActivities(
  familyId: string,
  uid: string,
  options?: { max?: number },
): Promise<DataResult<FamilyActivity[]>> {
  const member = await requireFamilyMember(
    familyId,
    uid,
    'Non sei membro di questa famiglia: attività non disponibili.',
  )
  if (!member.ok) return member
  return listFamilyActivities(familyId, options)
}
