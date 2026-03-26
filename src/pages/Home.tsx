import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { sendToClaude, getSystemPrompt } from '../lib/claude'
import { saveCheckIn, getTodayCheckIn, getRecentCheckIns, getDailyContent, saveDailyContent } from '../lib/store'
import { format } from 'date-fns'
import type { CheckIn, DailyContent } from '../lib/types'

export default function Home() {
  const { profile } = useAuth()
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
      const [checkin, content] = await Promise.all([
        getTodayCheckIn(),
        getDailyContent(),
      ])
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
      const recentCheckins = await getRecentCheckIns(3)
      const context = recentCheckins.length > 0
        ? `Recent check-ins for context:\n${recentCheckins.map(c =>
            `- ${c.date}: Mood ${c.overall_mood}/10, Energy ${c.energy}/10, Anxiety ${c.anxiety}/10${c.freeform_note ? `, Note: "${c.freeform_note}"` : ''}`
          ).join('\n')}`
        : 'This is her first time using Clarity.'

      const [affirmation, challenge] = await Promise.all([
        sendToClaude(
          [{ role: 'user', content: 'Generate a single-line daily affirmation for Danielle. Not generic — make it specific to where she seems to be emotionally right now. One sentence only. No quotes.' }],
          getSystemPrompt(context),
          150
        ),
        sendToClaude(
          [{ role: 'user', content: 'Generate one tiny micro-challenge for Danielle today. Something she can do in under 5 minutes that will shift her state. Be specific. One or two sentences max.' }],
          getSystemPrompt(context),
          150
        ),
      ])

      const today = format(new Date(), 'yyyy-MM-dd')
      const saved = await saveDailyContent({
        date: today,
        affirmation,
        micro_challenge: challenge,
      })
      if (saved) setDailyContent(saved)
    } catch (err) {
      console.error('Error generating daily content:', err)
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')

      // Get Claude's response
      const recentCheckins = await getRecentCheckIns(7)
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
        getSystemPrompt(),
        500
      )

      setClaudeResponse(response)

      const saved = await saveCheckIn({
        date: today,
        overall_mood: mood,
        energy,
        anxiety,
        clarity,
        freeform_note: note || null,
        claude_response: response,
        emotion_tags: null,
      })

      if (saved) setTodayCheckin(saved)
    } catch (err) {
      console.error('Error submitting check-in:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const greeting = getGreeting()
  const name = profile?.name || 'Danielle'

  return (
    <div className="stagger-children">
      {/* Greeting */}
      <div className="mb-8">
        <p className="text-cream-muted text-sm mb-1">{format(new Date(), 'EEEE, MMMM d')}</p>
        <h1 className="font-serif text-3xl md:text-4xl text-cream">
          {greeting}, {name}
        </h1>
      </div>

      {/* Daily Affirmation & Challenge */}
      {(dailyContent || loadingContent) && (
        <div className="mb-8 space-y-4">
          <div className="bg-deep border border-border rounded-2xl p-6">
            <p className="text-amber text-xs uppercase tracking-widest mb-2">Today's Affirmation</p>
            {loadingContent ? (
              <div className="h-5 bg-surface rounded animate-pulse-soft w-3/4" />
            ) : (
              <p className="text-cream font-serif text-lg italic">{dailyContent?.affirmation}</p>
            )}
          </div>
          <div className="bg-deep border border-border rounded-2xl p-6">
            <p className="text-sage text-xs uppercase tracking-widest mb-2">Micro-Challenge</p>
            {loadingContent ? (
              <div className="h-5 bg-surface rounded animate-pulse-soft w-2/3" />
            ) : (
              <p className="text-cream-muted">{dailyContent?.micro_challenge}</p>
            )}
          </div>
        </div>
      )}

      {/* Check-in form or response */}
      {todayCheckin && claudeResponse ? (
        <div className="animate-fade-in">
          <div className="bg-deep border border-border rounded-2xl p-6 mb-4">
            <p className="text-amber text-xs uppercase tracking-widest mb-3">Today's Check-In</p>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <MoodBadge label="Mood" value={todayCheckin.overall_mood} color="amber" />
              <MoodBadge label="Energy" value={todayCheckin.energy} color="sage" />
              <MoodBadge label="Anxiety" value={todayCheckin.anxiety} color="rose" />
              <MoodBadge label="Clarity" value={todayCheckin.clarity} color="sky" />
            </div>
            {todayCheckin.freeform_note && (
              <p className="text-cream-muted text-sm italic mb-4">"{todayCheckin.freeform_note}"</p>
            )}
          </div>
          <div className="bg-deep border border-amber/20 rounded-2xl p-6">
            <p className="text-amber text-xs uppercase tracking-widest mb-3">Clarity's Reflection</p>
            <div className="text-cream-muted leading-relaxed whitespace-pre-wrap">{claudeResponse}</div>
          </div>
        </div>
      ) : (
        <div className="bg-deep border border-border rounded-2xl p-6 md:p-8">
          <h2 className="font-serif text-xl text-cream mb-6">How are you feeling?</h2>

          <div className="space-y-6 mb-6">
            <SliderField label="Overall feeling" value={mood} onChange={setMood} color="amber" />
            <SliderField label="Energy level" value={energy} onChange={setEnergy} color="sage" />
            <SliderField label="Anxiety level" value={anxiety} onChange={setAnxiety} color="rose" />
            <SliderField label="Clarity of mind" value={clarity} onChange={setClarity} color="sky" />
          </div>

          <div className="mb-6">
            <label className="text-cream-muted text-sm block mb-2">What's on your mind right now?</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Optional — whatever you want to share..."
              rows={3}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-cream placeholder:text-cream-muted/40 focus:border-amber/40 transition-colors"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-amber/20 text-amber border border-amber/30 rounded-xl py-3.5 font-medium hover:bg-amber/30 transition-all disabled:opacity-50"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
                Reflecting...
              </span>
            ) : (
              'Submit Check-In'
            )}
          </button>
        </div>
      )}
    </div>
  )
}

function SliderField({ label, value, onChange, color }: { label: string; value: number; onChange: (v: number) => void; color: string }) {
  const colorMap: Record<string, string> = {
    amber: 'text-amber',
    sage: 'text-sage',
    rose: 'text-rose',
    sky: 'text-sky',
  }
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-cream-muted text-sm">{label}</span>
        <span className={`text-sm font-medium ${colorMap[color]}`}>{value}/10</span>
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

function MoodBadge({ label, value, color }: { label: string; value: number; color: string }) {
  const bgMap: Record<string, string> = {
    amber: 'bg-amber-glow',
    sage: 'bg-sage-soft',
    rose: 'bg-rose-soft',
    sky: 'bg-sky-soft',
  }
  const textMap: Record<string, string> = {
    amber: 'text-amber',
    sage: 'text-sage',
    rose: 'text-rose',
    sky: 'text-sky',
  }
  return (
    <div className={`${bgMap[color]} rounded-xl p-3 text-center`}>
      <p className={`text-lg font-medium ${textMap[color]}`}>{value}</p>
      <p className="text-cream-muted text-[10px] uppercase tracking-wider">{label}</p>
    </div>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
