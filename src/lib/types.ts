export interface Profile {
  id: string
  name: string
  life_audit: string
  created_at: string
}

export interface CheckIn {
  id: string
  user_id: string
  date: string
  overall_mood: number
  energy: number
  anxiety: number
  clarity: number
  freeform_note: string | null
  claude_response: string | null
  emotion_tags: string[] | null
  created_at: string
}

export interface ChatSession {
  id: string
  user_id: string
  title: string
  messages: ChatMessage[]
  summary: string | null
  created_at: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

export interface EmotionAudit {
  id: string
  user_id: string
  raw_conversation: ChatMessage[]
  synthesis: string
  emotion_identified: string
  root_cause: string
  action_step: string
  created_at: string
}

export interface WeeklyReport {
  id: string
  user_id: string
  week_starting: string
  report_content: string
  created_at: string
}

export interface DailyContent {
  id: string
  user_id: string
  date: string
  affirmation: string
  micro_challenge: string
  created_at: string
}

export type JournalEntryType = 'checkin' | 'chat' | 'audit' | 'report'

export interface JournalEntry {
  type: JournalEntryType
  id: string
  date: string
  title: string
  preview: string
  emotion_tags?: string[]
  data: CheckIn | ChatSession | EmotionAudit | WeeklyReport
}
