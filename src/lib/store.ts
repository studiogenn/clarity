import { supabase } from './supabase'
import type { CheckIn, ChatSession, EmotionAudit, WeeklyReport, DailyContent, Profile } from './types'
import { format, subDays } from 'date-fns'

// Profile
export async function getProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return data
}

export async function updateProfile(updates: Partial<Profile>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
}

// Check-ins
export async function saveCheckIn(checkin: Omit<CheckIn, 'id' | 'user_id' | 'created_at'>): Promise<CheckIn | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('checkins')
    .insert({ ...checkin, user_id: user.id })
    .select()
    .single()

  if (error) console.error('Save checkin error:', error)
  return data
}

export async function getTodayCheckIn(): Promise<CheckIn | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = format(new Date(), 'yyyy-MM-dd')
  const { data } = await supabase
    .from('checkins')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return data
}

export async function getRecentCheckIns(days: number = 7): Promise<CheckIn[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const since = format(subDays(new Date(), days), 'yyyy-MM-dd')
  const { data } = await supabase
    .from('checkins')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', since)
    .order('created_at', { ascending: false })

  return data || []
}

export async function getAllCheckIns(): Promise<CheckIn[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('checkins')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return data || []
}

// Chat sessions
export async function saveChatSession(session: Omit<ChatSession, 'id' | 'user_id' | 'created_at'>): Promise<ChatSession | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({ ...session, user_id: user.id })
    .select()
    .single()

  if (error) console.error('Save chat error:', error)
  return data
}

export async function updateChatSession(id: string, updates: Partial<ChatSession>): Promise<void> {
  await supabase
    .from('chat_sessions')
    .update(updates)
    .eq('id', id)
}

export async function getChatSessions(): Promise<ChatSession[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return data || []
}

// Emotion audits
export async function saveEmotionAudit(audit: Omit<EmotionAudit, 'id' | 'user_id' | 'created_at'>): Promise<EmotionAudit | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('emotion_audits')
    .insert({ ...audit, user_id: user.id })
    .select()
    .single()

  if (error) console.error('Save audit error:', error)
  return data
}

export async function getEmotionAudits(): Promise<EmotionAudit[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('emotion_audits')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return data || []
}

// Weekly reports
export async function saveWeeklyReport(report: Omit<WeeklyReport, 'id' | 'user_id' | 'created_at'>): Promise<WeeklyReport | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('weekly_reports')
    .insert({ ...report, user_id: user.id })
    .select()
    .single()

  if (error) console.error('Save report error:', error)
  return data
}

export async function getWeeklyReports(): Promise<WeeklyReport[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('weekly_reports')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return data || []
}

// Daily content
export async function getDailyContent(): Promise<DailyContent | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = format(new Date(), 'yyyy-MM-dd')
  const { data } = await supabase
    .from('daily_content')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .single()

  return data
}

export async function saveDailyContent(content: Omit<DailyContent, 'id' | 'user_id' | 'created_at'>): Promise<DailyContent | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('daily_content')
    .insert({ ...content, user_id: user.id })
    .select()
    .single()

  if (error) console.error('Save daily content error:', error)
  return data
}
