import { useState, useEffect } from 'react'
import { getAllCheckIns, getChatSessions } from '../lib/store'
import { format } from 'date-fns'
import type { JournalEntry, JournalEntryType, CheckIn, ChatSession } from '../lib/types'

const typeLabels: Record<JournalEntryType, string> = {
  checkin: 'Check-In',
  chat: 'Conversation',
}

const typeStyles: Record<JournalEntryType, string> = {
  checkin: 'text-sage bg-sage-light',
  chat: 'text-blush bg-blush-light',
}

export default function Journal() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [filter, setFilter] = useState<JournalEntryType | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    loadEntries()
  }, [])

  function loadEntries() {
    try {
      const checkins = getAllCheckIns()
      const chats = getChatSessions()

      const allEntries: JournalEntry[] = [
        ...checkins.map((c: CheckIn) => ({
          type: 'checkin' as const,
          id: c.id,
          date: c.created_at,
          title: `Check-In — Mood ${c.overall_mood}/10`,
          preview: c.freeform_note || `Energy ${c.energy}, Anxiety ${c.anxiety}, Clarity ${c.clarity}`,
          data: c,
        })),
        ...chats.map((c: ChatSession) => ({
          type: 'chat' as const,
          id: c.id,
          date: c.created_at,
          title: c.title || 'Conversation',
          preview: c.messages?.[0]?.content?.slice(0, 120) || '',
          data: c,
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
        <h1 className="font-serif text-3xl text-text mb-2">Journal</h1>
        <p className="text-text-muted text-sm">Everything you've shared, all in one place</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {(['all', 'checkin', 'chat'] as const).map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-5 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
              filter === type
                ? 'bg-sage text-pure-white shadow-sm'
                : 'text-text-muted hover:text-text bg-cream hover:bg-cream-dark'
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
            <div key={i} className="bg-pure-white border border-border-light rounded-2xl p-5 card-shadow animate-pulse-soft">
              <div className="h-4 bg-cream rounded-lg w-1/4 mb-3" />
              <div className="h-3 bg-cream rounded-lg w-3/4 mb-2" />
              <div className="h-3 bg-cream rounded-lg w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-14 h-14 rounded-full bg-cream flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
          </div>
          <p className="text-text-muted">No entries yet.</p>
          <p className="text-text-light text-sm mt-1">Start a check-in or conversation to see them here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(entry => (
            <button
              key={entry.id}
              onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
              className="w-full text-left bg-pure-white border border-border-light rounded-2xl p-5 card-shadow card-shadow-hover transition-all"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full font-medium ${typeStyles[entry.type]}`}>
                    {typeLabels[entry.type]}
                  </span>
                </div>
                <span className="text-text-light text-xs shrink-0">
                  {format(new Date(entry.date), 'MMM d, h:mm a')}
                </span>
              </div>

              <h3 className="text-text text-sm font-medium mb-1">{entry.title}</h3>
              <p className="text-text-muted text-sm line-clamp-2">{entry.preview}</p>

              {/* Expanded content */}
              {expanded === entry.id && (
                <div className="mt-4 pt-4 border-t border-border-light animate-fade-in">
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
          <div className="bg-sage-light rounded-xl p-2.5 text-center">
            <p className="text-sage font-medium">{c.overall_mood}</p>
            <p className="text-[10px] text-text-muted">Mood</p>
          </div>
          <div className="bg-blush-light rounded-xl p-2.5 text-center">
            <p className="text-blush font-medium">{c.energy}</p>
            <p className="text-[10px] text-text-muted">Energy</p>
          </div>
          <div className="bg-cream rounded-xl p-2.5 text-center">
            <p className="text-text font-medium">{c.anxiety}</p>
            <p className="text-[10px] text-text-muted">Anxiety</p>
          </div>
          <div className="bg-sage-light rounded-xl p-2.5 text-center">
            <p className="text-sage font-medium">{c.clarity}</p>
            <p className="text-[10px] text-text-muted">Clarity</p>
          </div>
        </div>
        {c.freeform_note && <p className="text-text-muted text-sm italic">"{c.freeform_note}"</p>}
        {c.claude_response && (
          <div className="bg-cream/50 rounded-xl p-4">
            <p className="text-sage text-[10px] uppercase tracking-widest mb-2 font-medium">Clarity's reflection</p>
            <p className="text-text-muted text-sm whitespace-pre-wrap">{c.claude_response}</p>
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
              msg.role === 'user' ? 'bg-sage/10 text-text' : 'bg-cream text-text-muted'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return null
}
