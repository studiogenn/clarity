import { useState, useEffect } from 'react'
import { sendToClaude, getSystemPrompt } from '../lib/claude'
import { getRecentCheckIns, getChatSessions, getEmotionAudits, saveWeeklyReport, getWeeklyReports } from '../lib/store'
import { format, startOfWeek } from 'date-fns'
import type { WeeklyReport } from '../lib/types'

export default function Report() {
  const [reports, setReports] = useState<WeeklyReport[]>([])
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null)

  useEffect(() => {
    loadReports()
  }, [])

  async function loadReports() {
    try {
      const data = await getWeeklyReports()
      setReports(data)
      if (data.length > 0) setSelectedReport(data[0])
    } catch (err) {
      console.error('Error loading reports:', err)
    } finally {
      setLoading(false)
    }
  }

  async function generateReport() {
    setGenerating(true)
    try {
      const [checkins, chats, audits] = await Promise.all([
        getRecentCheckIns(7),
        getChatSessions(),
        getEmotionAudits(),
      ])

      const recentChats = chats.filter(c => {
        const d = new Date(c.created_at)
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return d >= weekAgo
      })

      const recentAudits = audits.filter(a => {
        const d = new Date(a.created_at)
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return d >= weekAgo
      })

      const context = `
Here is Danielle's data from the past 7 days:

CHECK-INS (${checkins.length}):
${checkins.map(c => `- ${c.date}: Mood ${c.overall_mood}/10, Energy ${c.energy}/10, Anxiety ${c.anxiety}/10, Clarity ${c.clarity}/10${c.freeform_note ? ` | Note: "${c.freeform_note}"` : ''}`).join('\n') || 'None this week.'}

CONVERSATIONS (${recentChats.length}):
${recentChats.map(c => `- "${c.title}" | ${c.summary || 'No summary'}`).join('\n') || 'None this week.'}

EMOTION AUDITS (${recentAudits.length}):
${recentAudits.map(a => `- Identified: ${a.emotion_identified || 'various'} | ${a.synthesis?.slice(0, 100) || ''}`).join('\n') || 'None this week.'}
`.trim()

      const report = await sendToClaude(
        [{ role: 'user', content: `Generate Danielle's Weekly Emotional Snapshot. Based on the data, provide:

1. **Patterns noticed** — when was she most/least anxious, most/least energized? What correlations emerged?
2. **Recurring emotional themes** — what kept coming up?
3. **Growth moments** — where did she show strength or progress?
4. **One reflective question** for the week ahead
5. **2-3 specific, personalized recommendations** based on this week's data

Be warm and direct. Reference specific data points. This should feel like a thoughtful letter from someone who genuinely cares.

${context}` }],
        getSystemPrompt(),
        2000
      )

      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      const saved = await saveWeeklyReport({
        week_starting: weekStart,
        report_content: report,
      })

      if (saved) {
        setReports(prev => [saved, ...prev])
        setSelectedReport(saved)
      }
    } catch (err) {
      console.error('Error generating report:', err)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-cream mb-2">Weekly Reports</h1>
          <p className="text-cream-muted text-sm">Your emotional patterns, tracked over time</p>
        </div>
        <button
          onClick={generateReport}
          disabled={generating}
          className="bg-sage/20 text-sage border border-sage/30 rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-sage/30 transition-all disabled:opacity-50 shrink-0"
        >
          {generating ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-sage/30 border-t-sage rounded-full animate-spin" />
              Generating...
            </span>
          ) : (
            'Generate Report'
          )}
        </button>
      </div>

      {loading ? (
        <div className="bg-deep border border-border rounded-2xl p-6 animate-pulse-soft">
          <div className="h-4 bg-surface rounded w-1/3 mb-4" />
          <div className="h-3 bg-surface rounded w-full mb-2" />
          <div className="h-3 bg-surface rounded w-5/6 mb-2" />
          <div className="h-3 bg-surface rounded w-4/6" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-sage-soft flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-sage">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <p className="text-cream-muted mb-2">No reports yet</p>
          <p className="text-cream-muted/60 text-sm max-w-sm mx-auto mb-6">
            Log a few check-ins and conversations throughout the week, then generate your first report.
          </p>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-6">
          {/* Report list */}
          {reports.length > 1 && (
            <div className="md:w-48 flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
              {reports.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedReport(r)}
                  className={`text-left px-4 py-2.5 rounded-xl text-sm whitespace-nowrap transition-all ${
                    selectedReport?.id === r.id
                      ? 'bg-surface text-cream'
                      : 'text-cream-muted hover:text-cream hover:bg-surface/50'
                  }`}
                >
                  Week of {format(new Date(r.week_starting), 'MMM d')}
                </button>
              ))}
            </div>
          )}

          {/* Selected report */}
          {selectedReport && (
            <div className="flex-1 bg-deep border border-border rounded-2xl p-6 md:p-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sage text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-sage-soft">
                  Weekly Snapshot
                </span>
                <span className="text-cream-muted text-xs">
                  {format(new Date(selectedReport.week_starting), 'MMM d, yyyy')}
                </span>
              </div>
              <div className="text-cream-muted leading-relaxed whitespace-pre-wrap">
                {selectedReport.report_content}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
