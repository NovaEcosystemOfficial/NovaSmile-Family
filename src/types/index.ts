export type SectionId =
  | 'dashboard'
  | 'messages'
  | 'voice'
  | 'schedule'
  | 'routines'
  | 'profile'

export type RoutinePeriod = 'mattina' | 'pomeriggio' | 'sera'

export type MessageStatus = 'bozza' | 'programmato' | 'demo'

export interface DemoMessage {
  id: string
  text: string
  createdAt: string
  status: MessageStatus
  scheduledFor?: string
  isDemo: true
}

export interface DemoActivity {
  id: string
  title: string
  detail: string
  timeLabel: string
  tone: 'success' | 'info' | 'warning'
  isDemo: true
}

export interface RoutineMission {
  id: string
  title: string
  description: string
  period: RoutinePeriod
  points: number
  completed: boolean
  isDemo: true
}

export interface FamilyPreferences {
  parentName: string
  childName: string
  greetingStyle: 'caldo' | 'energico' | 'tranquillo'
  showPoints: boolean
  reminderSound: boolean
}

export interface MessageDraft {
  text: string
  updatedAt: string
}

export interface ScheduleDraft {
  text: string
  date: string
  time: string
  updatedAt: string
}

export interface VoiceDraftMeta {
  hasRecording: boolean
  durationSec: number
  updatedAt: string
}
