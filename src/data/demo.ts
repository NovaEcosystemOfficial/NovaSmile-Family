import type {
  DemoActivity,
  DemoMessage,
  FamilyPreferences,
  RoutineMission,
} from '../types'

export const DEMO_BANNER =
  'Modalità demo — messaggio non inviato. La sincronizzazione con l’app Android arriverà in una fase successiva.'

export const DEFAULT_PREFERENCES: FamilyPreferences = {
  parentName: 'Fabio',
  childName: 'Nicholas',
  greetingStyle: 'caldo',
  showPoints: true,
  reminderSound: true,
}

export const demoMessages: DemoMessage[] = [
  {
    id: 'msg-1',
    text: 'Bravo Nicholas! Ricorda di mettere l’apparecchio dopo merenda 🦷',
    createdAt: '2026-10-21T08:15:00',
    status: 'demo',
    isDemo: true,
  },
  {
    id: 'msg-2',
    text: 'Sorrino è fiero di te: missione sera completata ieri!',
    createdAt: '2026-10-20T19:40:00',
    status: 'demo',
    isDemo: true,
  },
  {
    id: 'msg-3',
    text: 'Domani mattina: elastici + spazzolino, poi 5 stelle bonus!',
    createdAt: '2026-10-20T21:05:00',
    status: 'programmato',
    scheduledFor: '2026-10-22T07:30:00',
    isDemo: true,
  },
]

export const demoActivities: DemoActivity[] = [
  {
    id: 'act-1',
    title: 'Missione mattina completata',
    detail: 'Nicholas ha guadagnato 30 punti (dati dimostrativi).',
    timeLabel: 'Oggi · 07:42',
    tone: 'success',
    isDemo: true,
  },
  {
    id: 'act-2',
    title: 'Messaggio demo visualizzato',
    detail: 'Anteprima locale — nessun invio reale all’app.',
    timeLabel: 'Ieri · 19:40',
    tone: 'info',
    isDemo: true,
  },
  {
    id: 'act-3',
    title: 'Routine sera in attesa',
    detail: 'Elastici e igiene serale ancora da confermare.',
    timeLabel: 'Oggi · sera',
    tone: 'warning',
    isDemo: true,
  },
]

export const demoRoutines: RoutineMission[] = [
  {
    id: 'r-m1',
    title: 'Metti l’apparecchio',
    description: 'Controlla che sia ben posizionato prima di uscire.',
    period: 'mattina',
    points: 15,
    completed: true,
    isDemo: true,
  },
  {
    id: 'r-m2',
    title: 'Spazzolino + filo',
    description: 'Due minuti di spazzolino e un passaggio di filo.',
    period: 'mattina',
    points: 15,
    completed: true,
    isDemo: true,
  },
  {
    id: 'r-p1',
    title: 'Elastici dopo merenda',
    description: 'Rimetti gli elastici dopo lo snack del pomeriggio.',
    period: 'pomeriggio',
    points: 20,
    completed: false,
    isDemo: true,
  },
  {
    id: 'r-p2',
    title: 'Acqua e sorriso',
    description: 'Bevi un bicchiere d’acqua e fai un selfie a Sorrino.',
    period: 'pomeriggio',
    points: 10,
    completed: false,
    isDemo: true,
  },
  {
    id: 'r-s1',
    title: 'Igiene serale completa',
    description: 'Spazzolino, filo e apparecchio pulito.',
    period: 'sera',
    points: 25,
    completed: false,
    isDemo: true,
  },
  {
    id: 'r-s2',
    title: 'Elastici notturni',
    description: 'Metti gli elastici prima di dormire.',
    period: 'sera',
    points: 20,
    completed: false,
    isDemo: true,
  },
]

export function formatItalianDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('it-IT', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function greetingFor(
  style: FamilyPreferences['greetingStyle'],
  parentName: string,
  childName: string,
): string {
  switch (style) {
    case 'energico':
      return `Ciao ${parentName}! Pronto a far brillare il sorriso di ${childName}?`
    case 'tranquillo':
      return `Buongiorno ${parentName}. Ecco il riepilogo soft per ${childName}.`
    default:
      return `Ciao ${parentName}, benvenuto nel pannello famiglia di ${childName}.`
  }
}
