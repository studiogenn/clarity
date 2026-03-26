import { format, subDays } from 'date-fns'
import type { CheckIn, ChatSession, DailyContent } from './types'

// --- localStorage helpers ---

function getItem<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : fallback
  } catch {
    return fallback
  }
}

function setItem(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

function generateId(): string {
  return crypto.randomUUID()
}

// --- Check-ins ---

export function saveCheckIn(
  checkin: Omit<CheckIn, 'id' | 'created_at'>
): CheckIn {
  const checkins = getItem<CheckIn[]>('clarity_checkins', [])
  const newCheckin: CheckIn = {
    ...checkin,
    id: generateId(),
    created_at: new Date().toISOString(),
  }
  checkins.unshift(newCheckin)
  setItem('clarity_checkins', checkins)
  return newCheckin
}

export function getTodayCheckIn(): CheckIn | null {
  const checkins = getItem<CheckIn[]>('clarity_checkins', [])
  const today = format(new Date(), 'yyyy-MM-dd')
  return checkins.find(c => c.date === today) || null
}

export function getRecentCheckIns(days: number = 7): CheckIn[] {
  const checkins = getItem<CheckIn[]>('clarity_checkins', [])
  const since = format(subDays(new Date(), days), 'yyyy-MM-dd')
  return checkins.filter(c => c.date >= since)
}

export function getAllCheckIns(): CheckIn[] {
  return getItem<CheckIn[]>('clarity_checkins', [])
}

// --- Chat sessions ---

export function saveChatSession(
  session: Omit<ChatSession, 'id' | 'created_at'>
): ChatSession {
  const sessions = getItem<ChatSession[]>('clarity_chats', [])
  const newSession: ChatSession = {
    ...session,
    id: generateId(),
    created_at: new Date().toISOString(),
  }
  sessions.unshift(newSession)
  setItem('clarity_chats', sessions)
  return newSession
}

export function updateChatSession(
  id: string,
  updates: Partial<ChatSession>
): void {
  const sessions = getItem<ChatSession[]>('clarity_chats', [])
  const index = sessions.findIndex(s => s.id === id)
  if (index !== -1) {
    sessions[index] = { ...sessions[index], ...updates }
    setItem('clarity_chats', sessions)
  }
}

export function getChatSessions(): ChatSession[] {
  return getItem<ChatSession[]>('clarity_chats', [])
}

// --- Daily content ---

export function getDailyContent(): DailyContent | null {
  const today = format(new Date(), 'yyyy-MM-dd')
  const key = `clarity_daily_${today}`
  return getItem<DailyContent | null>(key, null)
}

export function saveDailyContent(content: DailyContent): DailyContent {
  const key = `clarity_daily_${content.date}`
  setItem(key, content)
  return content
}

// --- Life audit ---

export function getLifeAudit(): string {
  return getItem<string>('clarity_life_audit', '')
}

export function saveLifeAudit(content: string): void {
  setItem('clarity_life_audit', content)
}
