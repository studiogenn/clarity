import { useState, useEffect } from 'react'
import { getAllCheckIns, getChatSessions, getEmotionAudits, getWeeklyReports } from '../lib/store'
import { format } from 'date-fns'
import type { JournalEntry, JournalEntryType, CheckIn, ChatSession, EmotionAudit, WeeklyReport } from '../lib/types'

const typeLabels: Record<JournalEntryType, string> = {
  checkin: 'Check-In',
  chat: 'Conversation',
  audit: 'Emotion Audit',
  report: 'Weekly Report',
}

const typeColors: Record<JournalEntryType, string> = {
  checkin: 'text-amber bg-amber-glow',
  chat: 'text-sky bg-sky-soft',
  audit: 'text-rose bg-rose-soft',
  report: 'text-sage bg-sage-soft',
}

export default function Journal() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [filter, setFilter] = useState<JournalEntryType | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    loadEntries()
  }, [])

  async function loadEntries() {
    try {
      const [checkins, chats, audits, reports] = await Promise.all([
        getAllCheckIns(),
        getChatSessions(),
        getEmotionAudits(),
        getWeeklyReports(),
      ])

      const allEntries: JournalEntry[] = [
        ...checkins.map((c: CheckIn) => ({
          type: 'checkin' as const,
          id: c.id,
          date: c.created_at,
          title: `Check-In — Mood ${c.overall_mood}/10`,
          preview: c.freeform_note || `Energy ${c.energy}, Anxiety ${c.anxiety}, Clarity ${c.clarity}`,
          emotion_tags: c.emotion_tags || undefined,
          data: c,
        })),
        ...chats.map((c: ChatSession) => ({
          type: 'chat' as const,
          id: c.id,
          date: c.created_at,
          title: c.title || 'Conversation',
          preview: c.summary || (c.messages?.[0]?.content?.slice(0, 120) || ''),
          data: c,
        })),
        ...audits.map((a: EmotionAudit) => ({
          type: 'audit' as const,
          id: a.id,
          date: a.created_at,
          title: a.emotion_identified ? `Audit: ${a.emotion_identified}` : 'Emotion Audit',
          preview: a.synthesis?.slice(0, 150) || '',
          data: a,
        })),
        ...reports.map((r: WeeklyReport) => ({
          type: 'report' as const,
          id: r.id,
          date: r.created_at,
          title: `Week of ${format(new Date(r.week_starting), 'MMM d')}`,
          preview: r.report_content?.slice(0, 150) || '',
          data: r,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      setEntries(allEntries)
    } catch (err) {
      console.error('Error loading journal:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === 'all' ? entries : entries.filter(e => e.type === filter)

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-cream mb-2">Journal</h1>
        <p className="text-cream-muted text-sm">Everything you've shared, all in one place</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {(['all', 'checkin', 'chat', 'audit', 'report'] as const).map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
              filter === type
                ? 'bg-surface text-cream border border-border'
                : 'text-cream-muted hover:text-cream hover:bg-surface/50'
            }`}
          >
            {type === 'all' ? 'All' : typeLabels[type]}
          </button>
        ))}
      </div>

      {/* Entries */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-deep border border-border rounded-2xl p-5 animate-pulse-soft">
              <div className="h-4 bg-surface rounded w-1/4 mb-3" />
              <div className="h-3 bg-surface rounded w-3/4 mb-2" />
              <div className="h-3 bg-surface rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-cream-muted">No entries yet. Start a check-in or conversation to see them here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(entry => (
            <button
              key={entry.id}
              onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
              className="w-full text-left bg-deep border border-border rounded-2xl p-5 hover:border-border/80 transition-all"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full ${typeColors[entry.type]}`}>
                    {typeLabels[entry.type]}
                  </span>
                  {entry.emotion_tags?.map(tag => (
                    <span key={tag} className="text-[10px] text-cream-muted bg-surface px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="text-cream-muted text-xs shrink-0">
                  {format(new Date(entry.date), 'MMM d, h:mm a')}
                </span>
              </div>

              <h3 className="text-cream text-sm font-medium mb-1">{entry.title}</h3>
              <p className="text-cream-muted text-sm line-clamp-2">{entry.preview}</p>

              {/* Expanded content */}
              {expanded === entry.id && (
                <div className="mt-4 pt-4 border-t border-border animate-fade-in">
                  <ExpandedEntry entry={entry} />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ExpandedEntry({ entry }: { entry: JournalEntry }) {
  if (entry.type === 'checkin') {
    const c = entry.data as CheckIn
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-amber-glow rounded-lg p-2 text-center">
            <p className="text-amber font-medium">{c.overall_mood}</p>
            <p className="text-[10px] text-cream-muted">Mood</p>
          </div>
          <div className="bg-sage-soft rounded-lg p-2 text-center">
            <p className="text-sage font-medium">{c.energy}</p>
            <p className="text-[10px] text-cream-muted">Energy</p>
          </div>
          <div className="bg-rose-soft rounded-lg p-2 text-center">
            <p className="text-rose font-medium">{c.anxiety}</p>
            <p className="text-[10px] text-cream-muted">Anxiety</p>
          </div>
          <div className="bg-sky-soft rounded-lg p-2 text-center">
            <p className="text-sky font-medium">{c.clarity}</p>
            <p className="text-[10px] text-cream-muted">Clarity</p>
          </div>
        </div>
        {c.freeform_note && <p className="text-cream-muted text-sm italic">"{c.freeform_note}"</p>}
        {c.claude_response && (
          <div className="bg-surface rounded-xl p-4">
            <p className="text-amber text-[10px] uppercase tracking-widest mb-2">Clarity's reflection</p>
            <p className="text-cream-muted text-sm whitespace-pre-wrap">{c.claude_response}</p>
          </div>
        )}
      </div>
    )
  }

  if (entry.type === 'chat') {
    const c = entry.data as ChatSession
    return (
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {c.messages?.map((msg, i) => (
          <div key={i} className={`${msg.role === 'user' ? 'text-right' : ''}`}>
            <div className={`inline-block max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${
              msg.role === 'user' ? 'bg-amber/10 text-cream' : 'bg-surface text-cream-muted'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (entry.type === 'audit') {
    const a = entry.data as EmotionAudit
    return (
      <div className="text-cream-muted text-sm whitespace-pre-wrap">
        {a.synthesis}
      </div>
    )
  }

  if (entry.type === 'report') {
    const r = entry.data as WeeklyReport
    return (
      <div className="text-cream-muted text-sm whitespace-pre-wrap">
        {r.report_content}
      </div>
    )
  }

  return null
}
