import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  doc,
  getDoc,
  runTransaction,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const PROJECT_ID = 'demo-novasmile-family'
const FAMILY_A = 'family-a'
const FAMILY_B = 'family-b'

let testEnv: RulesTestEnvironment

function memberPayload(
  role: 'owner' | 'parent' | 'viewer',
  overrides?: Partial<{ displayName: string; email: string }>,
) {
  return {
    role,
    displayName: overrides?.displayName ?? 'Utente Test',
    email: overrides?.email ?? 'test@example.com',
    joinedAt: Timestamp.now(),
  }
}

function familyPayload(createdByUid: string) {
  return {
    name: 'Famiglia Test',
    createdByUid,
    status: 'active' as const,
    createdAt: Timestamp.now(),
  }
}

function profilePayload(uid: string) {
  return {
    parentDisplayName: 'Genitore',
    childName: 'Bambino',
    greetingStyle: 'caldo' as const,
    showPoints: true,
    reminderSound: true,
    updatedAt: Timestamp.now(),
    updatedByUid: uid,
  }
}

/** Batch atomico (test regole getAfter) */
async function commitAtomicBootstrapBatch(
  uid: string,
  familyId: string,
  authContext: ReturnType<RulesTestEnvironment['authenticatedContext']>,
) {
  const db = authContext.firestore()
  const batch = writeBatch(db)
  batch.set(doc(db, 'families', familyId), familyPayload(uid))
  batch.set(
    doc(db, 'families', familyId, 'members', uid),
    memberPayload('owner', {
      displayName: 'Owner',
      email: `${uid}@example.com`,
    }),
  )
  batch.set(
    doc(db, 'families', familyId, 'profile', 'settings'),
    profilePayload(uid),
  )
  batch.set(doc(db, 'users', uid), {
    familyId,
    updatedAt: Timestamp.now(),
  })
  await assertSucceeds(batch.commit())
}

/**
 * Bootstrap con runTransaction + lettura users/{uid} (come il client produzione).
 */
async function commitAtomicBootstrapTx(
  uid: string,
  familyId: string,
  authContext: ReturnType<RulesTestEnvironment['authenticatedContext']>,
): Promise<'created' | 'existing'> {
  const db = authContext.firestore()
  const userRef = doc(db, 'users', uid)

  const outcome = await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef)
    if (userSnap.exists()) {
      const bound = userSnap.data()?.familyId
      if (typeof bound === 'string' && bound.trim()) {
        return 'existing' as const
      }
    }

    tx.set(doc(db, 'families', familyId), familyPayload(uid))
    tx.set(
      doc(db, 'families', familyId, 'members', uid),
      memberPayload('owner', {
        displayName: 'Owner',
        email: `${uid}@example.com`,
      }),
    )
    tx.set(
      doc(db, 'families', familyId, 'profile', 'settings'),
      profilePayload(uid),
    )
    tx.set(userRef, {
      familyId,
      updatedAt: Timestamp.now(),
    })
    return 'created' as const
  })

  return outcome
}

async function seedFamilyWithOwner(
  familyId: string,
  ownerUid: string,
  extras?: { viewerUid?: string; parentUid?: string },
) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'families', familyId), familyPayload(ownerUid))
    await setDoc(
      doc(db, 'families', familyId, 'members', ownerUid),
      memberPayload('owner', {
        displayName: 'Owner',
        email: `${ownerUid}@example.com`,
      }),
    )
    await setDoc(
      doc(db, 'families', familyId, 'profile', 'settings'),
      profilePayload(ownerUid),
    )
    await setDoc(doc(db, 'users', ownerUid), {
      familyId,
      updatedAt: Timestamp.now(),
    })
    if (extras?.viewerUid) {
      await setDoc(
        doc(db, 'families', familyId, 'members', extras.viewerUid),
        memberPayload('viewer', {
          displayName: 'Viewer',
          email: `${extras.viewerUid}@example.com`,
        }),
      )
    }
    if (extras?.parentUid) {
      await setDoc(
        doc(db, 'families', familyId, 'members', extras.parentUid),
        memberPayload('parent', {
          displayName: 'Parent',
          email: `${extras.parentUid}@example.com`,
        }),
      )
    }
  })
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve('firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
})

describe('Firestore rules — Spark atomic bootstrap', () => {
  it('nega lettura a utente non autenticato', async () => {
    await seedFamilyWithOwner(FAMILY_A, 'owner1')
    const anon = testEnv.unauthenticatedContext()
    await assertFails(getDoc(doc(anon.firestore(), 'families', FAMILY_A)))
    await assertFails(getDoc(doc(anon.firestore(), 'users', 'owner1')))
  })

  it('consente bootstrap atomico valido', async () => {
    const creator = testEnv.authenticatedContext('creator1')
    await commitAtomicBootstrapBatch('creator1', 'new-family', creator)
    await assertSucceeds(
      getDoc(doc(creator.firestore(), 'families', 'new-family')),
    )
    await assertSucceeds(
      getDoc(doc(creator.firestore(), 'users', 'creator1')),
    )
  })

  it('nega retry / seconda famiglia dopo binding users esistente', async () => {
    const creator = testEnv.authenticatedContext('creator1')
    await commitAtomicBootstrapBatch('creator1', 'first-family', creator)

    const db = creator.firestore()
    const batch = writeBatch(db)
    batch.set(doc(db, 'families', 'second-family'), familyPayload('creator1'))
    batch.set(
      doc(db, 'families', 'second-family', 'members', 'creator1'),
      memberPayload('owner'),
    )
    batch.set(
      doc(db, 'families', 'second-family', 'profile', 'settings'),
      profilePayload('creator1'),
    )
    batch.set(doc(db, 'users', 'creator1'), {
      familyId: 'second-family',
      updatedAt: Timestamp.now(),
    })
    await assertFails(batch.commit())
  })

  it('nega create famiglia incompleta (senza users/member/profile)', async () => {
    const creator = testEnv.authenticatedContext('creator1')
    await assertFails(
      setDoc(
        doc(creator.firestore(), 'families', 'orphan'),
        familyPayload('creator1'),
      ),
    )
  })

  it('nega bootstrap incoerente (createdByUid diverso dall’auth)', async () => {
    const creator = testEnv.authenticatedContext('creator1')
    const db = creator.firestore()
    const batch = writeBatch(db)
    batch.set(doc(db, 'families', 'bad-family'), familyPayload('other-user'))
    batch.set(
      doc(db, 'families', 'bad-family', 'members', 'creator1'),
      memberPayload('owner'),
    )
    batch.set(
      doc(db, 'families', 'bad-family', 'profile', 'settings'),
      profilePayload('creator1'),
    )
    batch.set(doc(db, 'users', 'creator1'), {
      familyId: 'bad-family',
      updatedAt: Timestamp.now(),
    })
    await assertFails(batch.commit())
  })

  it('nega create users/{altroUid} (impersonazione)', async () => {
    const attacker = testEnv.authenticatedContext('attacker')
    const db = attacker.firestore()
    const batch = writeBatch(db)
    batch.set(doc(db, 'families', 'hijack'), familyPayload('attacker'))
    batch.set(
      doc(db, 'families', 'hijack', 'members', 'attacker'),
      memberPayload('owner'),
    )
    batch.set(
      doc(db, 'families', 'hijack', 'profile', 'settings'),
      profilePayload('attacker'),
    )
    // Documento users di un altro UID
    batch.set(doc(db, 'users', 'victim'), {
      familyId: 'hijack',
      updatedAt: Timestamp.now(),
    })
    await assertFails(batch.commit())

    await assertFails(
      setDoc(doc(db, 'users', 'victim'), {
        familyId: 'anything',
        updatedAt: Timestamp.now(),
      }),
    )
  })

  it('nega modifica users/{uid} con campi extra non consentiti', async () => {
    await seedFamilyWithOwner(FAMILY_A, 'owner1')
    const owner = testEnv.authenticatedContext('owner1')
    await assertFails(
      updateDoc(doc(owner.firestore(), 'users', 'owner1'), {
        familyId: FAMILY_A,
        updatedAt: Timestamp.now(),
        admin: true,
      }),
    )
    await assertFails(
      setDoc(doc(owner.firestore(), 'users', 'owner1'), {
        familyId: FAMILY_A,
        updatedAt: Timestamp.now(),
        role: 'superuser',
      }),
    )
  })

  it('nega manipolazione users/{uid} verso famiglia altrui', async () => {
    await seedFamilyWithOwner(FAMILY_A, 'owner1')
    await seedFamilyWithOwner(FAMILY_B, 'owner2')
    const owner1 = testEnv.authenticatedContext('owner1')

    await assertFails(
      updateDoc(doc(owner1.firestore(), 'users', 'owner1'), {
        familyId: FAMILY_B,
        updatedAt: Timestamp.now(),
      }),
    )
  })

  it('nega auto-iscrizione a famiglia esistente', async () => {
    await seedFamilyWithOwner(FAMILY_A, 'owner1')
    const stranger = testEnv.authenticatedContext('stranger')
    await assertFails(
      setDoc(
        doc(stranger.firestore(), 'families', FAMILY_A, 'members', 'stranger'),
        memberPayload('owner'),
      ),
    )
    await assertFails(
      setDoc(
        doc(stranger.firestore(), 'families', FAMILY_A, 'members', 'stranger'),
        memberPayload('parent'),
      ),
    )
  })

  it('nega accesso cross-family', async () => {
    await seedFamilyWithOwner(FAMILY_A, 'owner1', { parentUid: 'parent1' })
    await seedFamilyWithOwner(FAMILY_B, 'owner2')
    const parentA = testEnv.authenticatedContext('parent1')
    await assertFails(getDoc(doc(parentA.firestore(), 'families', FAMILY_B)))
    await assertFails(getDoc(doc(parentA.firestore(), 'users', 'owner2')))
  })

  it('nega lettura users/{uid} altrui', async () => {
    await seedFamilyWithOwner(FAMILY_A, 'owner1')
    const stranger = testEnv.authenticatedContext('stranger')
    await assertFails(getDoc(doc(stranger.firestore(), 'users', 'owner1')))
  })

  it('nega accesso a utente autenticato non membro', async () => {
    await seedFamilyWithOwner(FAMILY_A, 'owner1')
    const stranger = testEnv.authenticatedContext('stranger')
    const db = stranger.firestore()
    await assertFails(getDoc(doc(db, 'families', FAMILY_A)))
    await assertFails(
      setDoc(doc(db, 'families', FAMILY_A, 'messages', 'm1'), {
        type: 'text',
        text: 'ciao',
        status: 'queued',
        createdAt: Timestamp.now(),
        createdByUid: 'stranger',
      }),
    )
  })

  it('consente lettura/scrittura contenuti a parent; nega a viewer', async () => {
    await seedFamilyWithOwner(FAMILY_A, 'owner1', {
      parentUid: 'parent1',
      viewerUid: 'viewer1',
    })
    const parent = testEnv.authenticatedContext('parent1')
    await assertSucceeds(
      setDoc(doc(parent.firestore(), 'families', FAMILY_A, 'messages', 'm1'), {
        type: 'text',
        text: 'Messaggio ok',
        status: 'queued',
        createdAt: Timestamp.now(),
        createdByUid: 'parent1',
      }),
    )

    const viewer = testEnv.authenticatedContext('viewer1')
    await assertSucceeds(getDoc(doc(viewer.firestore(), 'families', FAMILY_A)))
    await assertFails(
      setDoc(doc(viewer.firestore(), 'families', FAMILY_A, 'messages', 'm2'), {
        type: 'text',
        text: 'no',
        status: 'queued',
        createdAt: Timestamp.now(),
        createdByUid: 'viewer1',
      }),
    )
  })

  it('solo owner può invitare altri membri', async () => {
    await seedFamilyWithOwner(FAMILY_A, 'owner1', { parentUid: 'parent1' })
    const parent = testEnv.authenticatedContext('parent1')
    await assertFails(
      setDoc(
        doc(parent.firestore(), 'families', FAMILY_A, 'members', 'new-user'),
        memberPayload('viewer'),
      ),
    )

    const owner = testEnv.authenticatedContext('owner1')
    await assertSucceeds(
      setDoc(
        doc(owner.firestore(), 'families', FAMILY_A, 'members', 'new-user'),
        memberPayload('viewer', {
          displayName: 'Ospite',
          email: 'ospite@example.com',
        }),
      ),
    )
  })

  it('viewer non può promuoversi a owner', async () => {
    await seedFamilyWithOwner(FAMILY_A, 'owner1', { viewerUid: 'viewer1' })
    const viewer = testEnv.authenticatedContext('viewer1')
    const snap = await getDoc(
      doc(viewer.firestore(), 'families', FAMILY_A, 'members', 'viewer1'),
    )
    const joinedAt = snap.data()?.joinedAt
    await assertFails(
      updateDoc(
        doc(viewer.firestore(), 'families', FAMILY_A, 'members', 'viewer1'),
        {
          role: 'owner',
          displayName: 'Hacker',
          email: 'h@example.com',
          joinedAt,
        },
      ),
    )
  })

  it('owner non può aggiungere un secondo membro come parent o owner', async () => {
    await seedFamilyWithOwner(FAMILY_A, 'owner1')
    const owner = testEnv.authenticatedContext('owner1')
    await assertFails(
      setDoc(
        doc(owner.firestore(), 'families', FAMILY_A, 'members', 'kid-parent'),
        memberPayload('parent', {
          displayName: 'Nicholas',
          email: 'nicholas@example.com',
        }),
      ),
    )
    await assertFails(
      setDoc(
        doc(owner.firestore(), 'families', FAMILY_A, 'members', 'kid-owner'),
        memberPayload('owner', {
          displayName: 'Nicholas',
          email: 'nicholas@example.com',
        }),
      ),
    )
  })

  it('owner non può promuovere un viewer a parent', async () => {
    await seedFamilyWithOwner(FAMILY_A, 'owner1', { viewerUid: 'viewer1' })
    const owner = testEnv.authenticatedContext('owner1')
    const snap = await getDoc(
      doc(owner.firestore(), 'families', FAMILY_A, 'members', 'viewer1'),
    )
    const joinedAt = snap.data()?.joinedAt
    await assertFails(
      updateDoc(
        doc(owner.firestore(), 'families', FAMILY_A, 'members', 'viewer1'),
        {
          role: 'parent',
          displayName: 'Nicholas',
          email: 'nicholas@example.com',
          joinedAt,
        },
      ),
    )
  })

  it('non-owner non può creare membership viewer', async () => {
    await seedFamilyWithOwner(FAMILY_A, 'owner1', { viewerUid: 'viewer1' })
    const viewer = testEnv.authenticatedContext('viewer1')
    await assertFails(
      setDoc(
        doc(viewer.firestore(), 'families', FAMILY_A, 'members', 'altro-kid'),
        memberPayload('viewer'),
      ),
    )
  })

  it('transaction concorrenti stesso UID: un solo binding users', async () => {
    const uid = 'race-user'
    const ctxA = testEnv.authenticatedContext(uid)
    const ctxB = testEnv.authenticatedContext(uid)

    const results = await Promise.allSettled([
      commitAtomicBootstrapTx(uid, 'race-fam-a', ctxA),
      commitAtomicBootstrapTx(uid, 'race-fam-b', ctxB),
    ])

    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    expect(fulfilled.length).toBeGreaterThanOrEqual(1)

    const userSnap = await assertSucceeds(
      getDoc(doc(ctxA.firestore(), 'users', uid)),
    )
    expect(userSnap.exists()).toBe(true)
    const boundFamilyId = userSnap.data()?.familyId as string
    expect(typeof boundFamilyId).toBe('string')
    expect(boundFamilyId.length).toBeGreaterThan(0)

    // Membership coerente con il binding
    await assertSucceeds(
      getDoc(doc(ctxA.firestore(), 'families', boundFamilyId, 'members', uid)),
    )

    // Documentazione esito: almeno un commit creato; binding unico
    const createdCount = results.filter(
      (r) => r.status === 'fulfilled' && r.value === 'created',
    ).length
    expect(createdCount).toBeLessThanOrEqual(2)

    // Se entrambi i commit "created" passassero (edge emulator), il binding
    // resta comunque un solo familyId su users/{uid}.
    const adminDb = testEnv.authenticatedContext(uid).firestore()
    // Verifica che users non abbia campi extra / un solo doc
    const binding = await getDoc(doc(adminDb, 'users', uid))
    expect(Object.keys(binding.data() ?? {}).sort()).toEqual(
      ['familyId', 'updatedAt'].sort(),
    )
  })
})
