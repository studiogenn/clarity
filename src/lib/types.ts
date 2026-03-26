export interface CheckIn {
  id: string
  date: string
  overall_mood: number
  energy: number
  anxiety: number
  clarity: number
  freeform_note: string | null
  claude_response: string | null
  created_at: string
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  created_at: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

export interface DailyContent {
  date: string
  affirmation: string
  micro_challenge: string
}

export type JournalEntryType = 'checkin' | 'chat'

export interface JournalEntry {
  type: JournalEntryType
  id: string
  date: string
  title: string
  preview: string
  data: CheckIn | ChatSession
}
