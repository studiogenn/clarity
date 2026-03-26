import { useState, useEffect } from 'react'
import { sendToClaude, getSystemPrompt } from '../lib/claude'
import { saveCheckIn, getTodayCheckIn, getRecentCheckIns, getDailyContent, saveDailyContent, getLifeAudit } from '../lib/store'
import { format } from 'date-fns'
import type { CheckIn, DailyContent } from '../lib/types'

export default function Home() {
  const [mood, setMood] = useState(5)
  const [energy, setEnergy] = useState(5)
  const [anxiety, setAnxiety] = useState(5)
  const [clarity, setClarity] = useState(5)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [todayCheckin, setTodayCheckin] = useState<CheckIn | null>(null)
  const [dailyContent, setDailyContent] = useState<DailyContent | null>(null)
  const [claudeResponse, setClaudeResponse] = useState('')
  const [loadingContent, setLoadingContent] = useState(true)

  useEffect(() => {
    loadTodayData()
  }, [])

  async function loadTodayData() {
    try {
      const checkin = getTodayCheckIn()
      const content = getDailyContent()

      setTodayCheckin(checkin)
      if (checkin?.claude_response) {
        setClaudeResponse(checkin.claude_response)
      }
      if (content) {
        setDailyContent(content)
      } else {
        await generateDailyContent()
      }
    } catch (err) {
      console.error('Error loading today data:', err)
    } finally {
      setLoadingContent(false)
    }
  }

  async function generateDailyContent() {
    try {
      const recentCheckins = getRecentCheckIns(3)
      const lifeAudit = getLifeAudit()
      const context = recentCheckins.length > 0
        ? `Recent check-ins for context:\n${recentCheckins.map(c =>
            `- ${c.date}: Mood ${c.overall_mood}/10, Energy ${c.energy}/10, Anxiety ${c.anxiety}/10${c.freeform_note ? `, Note: "${c.freeform_note}"` : ''}`
          ).join('\n')}`
        : 'This is her first time using Clarity.'

      const systemPrompt = getSystemPrompt(lifeAudit || undefined, context)

      const [affirmation, challenge] = await Promise.all([
        sendToClaude(
          [{ role: 'user', content: 'Generate a single-line daily affirmation for Danielle. Not generic — make it specific to where she seems to be emotionally right now. One sentence only. No quotes.' }],
          systemPrompt,
          150
        ),
        sendToClaude(
          [{ role: 'user', content: 'Generate one tiny micro-challenge for Danielle today. Something she can do in under 5 minutes that will shift her state. Be specific. One or two sentences max.' }],
          systemPrompt,
          150
        ),
      ])

      const today = format(new Date(), 'yyyy-MM-dd')
      const saved = saveDailyContent({
        date: today,
        affirmation,
        micro_challenge: challenge,
      })
      setDailyContent(saved)
    } catch (err) {
      console.error('Error generating daily content:', err)
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const lifeAudit = getLifeAudit()

      const recentCheckins = getRecentCheckIns(7)
      const checkinContext = recentCheckins.length > 0
        ? `Her recent check-ins:\n${recentCheckins.slice(0, 5).map(c =>
            `- ${c.date}: Mood ${c.overall_mood}/10, Energy ${c.energy}/10, Anxiety ${c.anxiety}/10, Clarity ${c.clarity}/10${c.freeform_note ? ` — "${c.freeform_note}"` : ''}`
          ).join('\n')}`
        : ''

      const userMessage = `Today's check-in:
- Overall feeling: ${mood}/10
- Energy: ${energy}/10
- Anxiety: ${anxiety}/10
- Clarity of mind: ${clarity}/10
${note ? `- What's on her mind: "${note}"` : '- No additional note today.'}

${checkinContext}

Respond with:
1. A warm acknowledgment of what she shared (2-3 sentences)
2. A brief insight or gentle reframe if relevant (1-2 sentences)
3. One small, actionable step for today (1 sentence)

Keep it natural and conversational. Not clinical.`

      const response = await sendToClaude(
        [{ role: 'user', content: userMessage }],
        getSystemPrompt(lifeAudit || undefined),
        500
      )

      setClaudeResponse(response)

      const saved = saveCheckIn({
        date: today,
        overall_mood: mood,
        energy,
        anxiety,
        clarity,
        freeform_note: note || null,
        claude_response: response,
      })

      setTodayCheckin(saved)
    } catch (err) {
      console.error('Error submitting check-in:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const greeting = getGreeting()

  return (
    <div className="stagger-children">
      {/* Greeting */}
      <div className="mb-10">
        <p className="text-text-muted text-sm mb-1.5">{format(new Date(), 'EEEE, MMMM d')}</p>
        <h1 className="font-serif text-3xl md:text-4xl text-text">
          {greeting}, Danielle
        </h1>
      </div>

      {/* Daily Affirmation & Challenge */}
      {(dailyContent || loadingContent) && (
        <div className="mb-10 space-y-4">
          <div className="bg-pure-white border border-border-light rounded-2xl p-6 card-shadow">
            <p className="text-sage text-xs uppercase tracking-widest mb-2.5 font-medium">Today's Affirmation</p>
            {loadingContent ? (
              <div className="h-5 bg-cream rounded-lg animate-pulse-soft w-3/4" />
            ) : (
              <p className="text-text font-serif text-lg italic leading-relaxed">{dailyContent?.affirmation}</p>
            )}
          </div>
          <div className="bg-pure-white border border-border-light rounded-2xl p-6 card-shadow">
            <p className="text-blush text-xs uppercase tracking-widest mb-2.5 font-medium">Micro-Challenge</p>
            {loadingContent ? (
              <div className="h-5 bg-cream rounded-lg animate-pulse-soft w-2/3" />
            ) : (
              <p className="text-text-muted leading-relaxed">{dailyContent?.micro_challenge}</p>
            )}
          </div>
        </div>
      )}

      {/* Check-in form or response */}
      {todayCheckin && claudeResponse ? (
        <div className="animate-fade-in space-y-4">
          <div className="bg-pure-white border border-border-light rounded-2xl p-6 card-shadow">
            <p className="text-sage text-xs uppercase tracking-widest mb-4 font-medium">Today's Check-In</p>
            <div className="grid grid-cols-4 gap-3 mb-4">
              <MoodBadge label="Mood" value={todayCheckin.overall_mood} variant="sage" />
              <MoodBadge label="Energy" value={todayCheckin.energy} variant="blush" />
              <MoodBadge label="Anxiety" value={todayCheckin.anxiety} variant="warm" />
              <MoodBadge label="Clarity" value={todayCheckin.clarity} variant="sage" />
            </div>
            {todayCheckin.freeform_note && (
              <p className="text-text-muted text-sm italic">"{todayCheckin.freeform_note}"</p>
            )}
          </div>
          <div className="bg-cream/50 border border-sage-light rounded-2xl p-6 card-shadow">
            <p className="text-sage text-xs uppercase tracking-widest mb-3 font-medium">Clarity's Reflection</p>
            <div className="text-text leading-relaxed whitespace-pre-wrap">{claudeResponse}</div>
          </div>
        </div>
      ) : (
        <div className="bg-pure-white border border-border-light rounded-2xl p-6 md:p-8 card-shadow">
          <h2 className="font-serif text-xl text-text mb-8">How are you feeling?</h2>

          <div className="space-y-7 mb-8">
            <SliderField label="Overall feeling" value={mood} onChange={setMood} color="sage" />
            <SliderField label="Energy level" value={energy} onChange={setEnergy} color="blush" />
            <SliderField label="Anxiety level" value={anxiety} onChange={setAnxiety} color="warm" />
            <SliderField label="Clarity of mind" value={clarity} onChange={setClarity} color="sage" />
          </div>

          <div className="mb-8">
            <label className="text-text-muted text-sm block mb-2">What's on your mind right now?</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Optional — whatever you want to share..."
              rows={3}
              className="w-full bg-cream/50 border border-border rounded-xl px-4 py-3.5 text-text placeholder:text-text-light focus:border-sage/50 focus:bg-pure-white transition-all"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-sage text-pure-white rounded-2xl py-4 font-medium hover:bg-sage/90 transition-all disabled:opacity-50 shadow-sm"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-pure-white/30 border-t-pure-white rounded-full animate-spin" />
                Reflecting...
              </span>
            ) : (
              'Check In'
            )}
          </button>
        </div>
      )}
    </div>
  )
}

function SliderField({ label, value, onChange, color }: { label: string; value: number; onChange: (v: number) => void; color: string }) {
  const colorMap: Record<string, string> = {
    sage: 'text-sage',
    blush: 'text-blush',
    warm: 'text-text',
  }
  return (
    <div>
      <div className="flex justify-between items-center mb-2.5">
        <span className="text-text-muted text-sm">{label}</span>
        <span className={`text-sm font-medium ${colorMap[color] || 'text-text'}`}>{value}/10</span>
      </div>
      <input
        type="range"
        min="1"
        max="10"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  )
}

function MoodBadge({ label, value, variant }: { label: string; value: number; variant: string }) {
  const styles: Record<string, string> = {
    sage: 'bg-sage-light text-sage',
    blush: 'bg-blush-light text-blush',
    warm: 'bg-cream text-text',
  }
  return (
    <div className={`${styles[variant] || styles.sage} rounded-2xl p-3 text-center`}>
      <p className="text-lg font-medium">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
    </div>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
