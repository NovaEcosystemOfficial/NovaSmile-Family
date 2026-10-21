import { getFamilyMember } from './firestore/members'
import { fail, type DataResult } from './firestore/errors'
import type { FamilyMember, MemberRole } from '../types/cloud'

export async function requireFamilyMember(
  familyId: string,
  uid: string,
  deniedMessage = 'Non sei membro di questa famiglia.',
): Promise<DataResult<FamilyMember>> {
  const member = await getFamilyMember(familyId, uid)
  if (!member.ok) return member
  if (!member.data) {
    return fail('firestore/permission-denied', deniedMessage)
  }
  return { ok: true, data: member.data }
}

export async function requireFamilyEditor(
  familyId: string,
  uid: string,
  deniedMessage = 'Ruolo insufficiente per questa operazione.',
): Promise<DataResult<FamilyMember>> {
  const member = await requireFamilyMember(familyId, uid)
  if (!member.ok) return member
  const role: MemberRole = member.data.role
  if (role === 'viewer') {
    return fail('firestore/permission-denied', deniedMessage)
  }
  return member
}

export function localDateId(date = new Date()): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
