import { useState, useRef, useEffect } from 'react'
import { sendToClaudeStream, sendToClaude, getSystemPrompt, DEFAULT_LIFE_AUDIT } from './lib/claude'
import { saveChatSession, updateChatSession, saveCheckIn, getLifeAudit, saveLifeAudit, getDailyContent, saveDailyContent, getRecentCheckIns } from './lib/store'
import { format } from 'date-fns'
import type { ChatMessage, DailyContent } from './lib/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Check-in drawer
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [mood, setMood] = useState(5)
  const [energy, setEnergy] = useState(5)
  const [anxiety, setAnxiety] = useState(5)
  const [clarity, setClarity] = useState(5)
  const [checkInNote, setCheckInNote] = useState('')
  const [checkInSubmitting, setCheckInSubmitting] = useState(false)

  // Life Audit modal
  const [auditOpen, setAuditOpen] = useState(false)
  const [auditContent, setAuditContent] = useState('')
  const [auditSaving, setAuditSaving] = useState(false)
  const [auditSaved, setAuditSaved] = useState(false)

  // Affirmation
  const [affirmation, setAffirmation] = useState<string | null>(null)

  // ---- Effects ----

  // Scroll chat on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px'
    }
  }, [input])

  // Load affirmation + life audit on mount
  useEffect(() => {
    loadAffirmation()
    const stored = getLifeAudit()
    setAuditContent(stored || DEFAULT_LIFE_AUDIT)
  }, [])

  async function loadAffirmation() {
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const cached = getDailyContent()
      if (cached && cached.date === today) {
        setAffirmation(cached.affirmation)
        return
      }
      const recentCheckins = getRecentCheckIns(3)
      const lifeAudit = getLifeAudit()
      const context = recentCheckins.length > 0
        ? `Recent check-ins:\n${recentCheckins.map(c =>
            `- ${c.date}: Mood ${c.overall_mood}/10, Energy ${c.energy}/10, Anxiety ${c.anxiety}/10`
          ).join('\n')}`
        : 'First time using Clarity.'

      const systemPrompt = getSystemPrompt(lifeAudit || undefined, context)
      const result = await sendToClaude(
        [{ role: 'user', content: 'Generate a single-line daily affirmation for Danielle. Not generic -- make it specific to where she seems to be emotionally right now. One sentence only. No quotes.' }],
        systemPrompt,
        150,
      )
      setAffirmation(result)
      saveDailyContent({ date: today, affirmation: result, micro_challenge: '' } as DailyContent)
    } catch (err) {
      console.error('Error loading affirmation:', err)
    }
  }

  // ---- Chat handlers ----

  async function handleSend() {
    if (!input.trim() || streaming) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setStreaming(true)

    let currentSessionId = sessionId
    if (!currentSessionId) {
      const session = saveChatSession({
        title: userMessage.content.slice(0, 80),
        messages: newMessages,
      })
      currentSessionId = session.id
      setSessionId(session.id)
    }

    const placeholderMessages: ChatMessage[] = [...newMessages, { role: 'assistant', content: '' }]
    setMessages(placeholderMessages)

    try {
      const lifeAudit = getLifeAudit()
      const fullResponse = await sendToClaudeStream(
        newMessages,
        getSystemPrompt(lifeAudit || undefined),
        (streamedText) => {
          setMessages(prev => {
            const updated = [...prev]
            updated[updated.length - 1] = { role: 'assistant', content: streamedText }
            return updated
          })
        },
        1500,
      )

      const finalMessages: ChatMessage[] = [
        ...newMessages,
        { role: 'assistant', content: fullResponse, timestamp: new Date().toISOString() },
      ]
      setMessages(finalMessages)

      if (currentSessionId) {
        updateChatSession(currentSessionId, { messages: finalMessages })
      }
    } catch (err) {
      console.error('Chat error:', err)
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: "I'm having trouble connecting right now. Give me a moment and try again.",
        }
        return updated
      })
    } finally {
      setStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function startNewConversation() {
    setMessages([])
    setSessionId(null)
  }

  // ---- Check-in handler ----

  async function handleCheckIn() {
    setCheckInSubmitting(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const lifeAudit = getLifeAudit()

      const userContent = `Quick check-in from Danielle:
- Mood: ${mood}/10
- Energy: ${energy}/10
- Anxiety: ${anxiety}/10
- Clarity: ${clarity}/10
${checkInNote ? `- Note: "${checkInNote}"` : ''}

Respond with a brief, warm reflection (3-4 sentences). Acknowledge what she shared, offer a gentle insight, and suggest one tiny action.`

      // Create the check-in message in the chat
      const userMsg: ChatMessage = {
        role: 'user',
        content: `[Check-in] Mood ${mood}/10, Energy ${energy}/10, Anxiety ${anxiety}/10, Clarity ${clarity}/10${checkInNote ? ` -- "${checkInNote}"` : ''}`,
        timestamp: new Date().toISOString(),
      }
      const newMessages = [...messages, userMsg]
      setMessages([...newMessages, { role: 'assistant', content: '' }])

      let currentSessionId = sessionId
      if (!currentSessionId) {
        const session = saveChatSession({
          title: 'Check-in',
          messages: newMessages,
        })
        currentSessionId = session.id
        setSessionId(session.id)
      }

      setStreaming(true)
      const fullResponse = await sendToClaudeStream(
        [{ role: 'user', content: userContent }],
        getSystemPrompt(lifeAudit || undefined),
        (streamedText) => {
          setMessages(prev => {
            const updated = [...prev]
            updated[updated.length - 1] = { role: 'assistant', content: streamedText }
            return updated
          })
        },
        500,
      )

      const finalMessages: ChatMessage[] = [
        ...newMessages,
        { role: 'assistant', content: fullResponse, timestamp: new Date().toISOString() },
      ]
      setMessages(finalMessages)

      if (currentSessionId) {
        updateChatSession(currentSessionId, { messages: finalMessages })
      }

      saveCheckIn({
        date: today,
        overall_mood: mood,
        energy,
        anxiety,
        clarity,
        freeform_note: checkInNote || null,
        claude_response: fullResponse,
      })

      // Reset and close drawer
      setCheckInOpen(false)
      setMood(5)
      setEnergy(5)
      setAnxiety(5)
      setClarity(5)
      setCheckInNote('')
    } catch (err) {
      console.error('Check-in error:', err)
    } finally {
      setCheckInSubmitting(false)
      setStreaming(false)
    }
  }

  // ---- Life Audit handlers ----

  function handleAuditSave() {
    setAuditSaving(true)
    setAuditSaved(false)
    try {
      saveLifeAudit(auditContent)
      setAuditSaved(true)
      setTimeout(() => setAuditSaved(false), 3000)
    } catch (err) {
      console.error('Error saving life audit:', err)
    } finally {
      setAuditSaving(false)
    }
  }

  // ---- Render ----

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* ---- HEADER ---- */}
      <header className="shrink-0 px-6 py-3 flex items-center justify-between bg-white/60 backdrop-blur-xl border-b border-border-light">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-xl font-semibold text-lavender tracking-wide">Clarity</h1>
          {messages.length > 0 && (
            <button
              onClick={startNewConversation}
              className="text-text-muted text-xs hover:text-lavender transition-colors ml-2"
            >
              New conversation
            </button>
          )}
        </div>
        <button
          onClick={() => { setAuditOpen(true); setAuditSaved(false) }}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-lavender-soft transition-colors text-text-secondary"
          aria-label="Settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
      </header>

      {/* ---- GREETING + AFFIRMATION ---- */}
      <div className="shrink-0 px-6 pt-4 pb-3">
        <div className="max-w-2xl mx-auto flex items-start justify-between">
          <div>
            <p className="text-text-muted text-xs mb-0.5">{format(new Date(), 'EEEE, MMMM d')}</p>
            <h2 className="font-heading text-lg text-text font-medium">{getGreeting()}, Danielle</h2>
          </div>
          {affirmation && (
            <div className="max-w-xs bg-white/70 backdrop-blur-sm border border-lavender-soft rounded-xl px-4 py-2.5 ml-4 shrink-0">
              <p className="text-lavender text-[10px] uppercase tracking-widest mb-1 font-semibold">Affirmation</p>
              <p className="text-text text-xs leading-relaxed font-heading italic">{affirmation}</p>
            </div>
          )}
        </div>
      </div>

      {/* ---- MAIN CHAT AREA ---- */}
      <div className="flex-1 overflow-hidden flex flex-col max-w-2xl mx-auto w-full px-4">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-lavender-soft flex items-center justify-center mb-5">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-lavender">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>
              <p className="font-heading text-lg text-text mb-1.5">Hi Danielle. What's on your mind?</p>
              <p className="text-text-muted text-sm max-w-xs leading-relaxed">
                Talk about how you're feeling, what happened today, or anything you need to work through.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`animate-fade-up ${msg.role === 'user' ? 'flex justify-end' : ''}`}
              style={{ animationDelay: `${Math.min(i * 0.05, 0.3)}s` }}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-5 py-3.5 ${
                  msg.role === 'user'
                    ? 'bg-lavender text-white ml-8 shadow-sm'
                    : 'bg-white/80 backdrop-blur-sm border border-border-light text-text mr-8 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)]'
                }`}
              >
                {msg.role === 'assistant' && (
                  <p className="text-lavender text-[10px] uppercase tracking-widest mb-1.5 font-semibold">Clarity</p>
                )}
                <div className="whitespace-pre-wrap leading-relaxed text-sm">
                  {msg.content}
                  {msg.role === 'assistant' && !msg.content && streaming && (
                    <span className="inline-flex gap-1.5 ml-1 items-center">
                      <span className="w-1.5 h-1.5 bg-lavender/50 rounded-full dot-bounce-1" />
                      <span className="w-1.5 h-1.5 bg-lavender/50 rounded-full dot-bounce-2" />
                      <span className="w-1.5 h-1.5 bg-lavender/50 rounded-full dot-bounce-3" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="shrink-0 pb-4 pt-2">
          <div className="bg-white/80 backdrop-blur-sm border border-border rounded-2xl p-3 flex items-end gap-3 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)]">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type here..."
              rows={1}
              className="flex-1 bg-transparent text-text placeholder:text-text-muted text-sm py-1.5 leading-relaxed"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || streaming}
              className="w-9 h-9 rounded-full bg-lavender text-white flex items-center justify-center hover:bg-lavender/90 transition-all disabled:opacity-30 shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ---- CHECK-IN FLOATING BUTTON ---- */}
      {!checkInOpen && (
        <button
          onClick={() => setCheckInOpen(true)}
          className="fixed bottom-6 left-6 bg-white/80 backdrop-blur-sm border border-lavender-light text-lavender px-5 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all text-sm font-medium hover:bg-lavender hover:text-white z-20 animate-fade-up"
        >
          How are you feeling?
        </button>
      )}

      {/* ---- CHECK-IN DRAWER ---- */}
      {checkInOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-30 animate-fade-up">
          <div className="max-w-lg mx-auto mb-4 mx-4 sm:mx-auto bg-white/90 backdrop-blur-xl border border-border-light rounded-2xl shadow-2xl p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-base font-medium text-text">Quick Check-In</h3>
              <button
                onClick={() => setCheckInOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-border-light transition-colors text-text-muted"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Sliders */}
            <div className="space-y-4 mb-5">
              <SliderField label="Mood" value={mood} onChange={setMood} />
              <SliderField label="Energy" value={energy} onChange={setEnergy} />
              <SliderField label="Anxiety" value={anxiety} onChange={setAnxiety} />
              <SliderField label="Clarity" value={clarity} onChange={setClarity} />
            </div>

            {/* Note */}
            <textarea
              value={checkInNote}
              onChange={e => setCheckInNote(e.target.value)}
              placeholder="Anything on your mind? (optional)"
              rows={2}
              className="w-full bg-lavender-bg/50 border border-border-light rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-muted focus:border-lavender-light transition-colors mb-4"
            />

            {/* Submit */}
            <button
              onClick={handleCheckIn}
              disabled={checkInSubmitting}
              className="w-full bg-lavender text-white rounded-xl py-3 text-sm font-medium hover:bg-lavender/90 transition-all disabled:opacity-50"
            >
              {checkInSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Reflecting...
                </span>
              ) : (
                'Check In'
              )}
            </button>
          </div>
        </div>
      )}

      {/* ---- LIFE AUDIT MODAL ---- */}
      {auditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-text/20 backdrop-blur-sm"
            onClick={() => setAuditOpen(false)}
          />

          {/* Modal */}
          <div className="relative bg-white/95 backdrop-blur-xl border border-border-light rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-fade-up">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border-light shrink-0">
              <div>
                <h2 className="font-heading text-lg font-semibold text-text">Life Audit</h2>
                <p className="text-text-muted text-xs mt-0.5">The context Clarity uses to understand you</p>
              </div>
              <button
                onClick={() => setAuditOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-border-light transition-colors text-text-muted"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <textarea
                value={auditContent}
                onChange={e => { setAuditContent(e.target.value); setAuditSaved(false) }}
                rows={20}
                className="w-full bg-transparent text-text leading-relaxed text-sm font-mono min-h-[300px]"
                placeholder="Write about your current life circumstances, goals, stressors, patterns..."
              />
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border-light shrink-0">
              <p className="text-text-muted text-xs">Injected into every conversation</p>
              <div className="flex items-center gap-3">
                {auditSaved && (
                  <span className="text-green text-sm font-medium animate-fade-in">Saved</span>
                )}
                <button
                  onClick={handleAuditSave}
                  disabled={auditSaving}
                  className="bg-lavender text-white rounded-xl px-6 py-2.5 text-sm font-medium hover:bg-lavender/90 transition-all disabled:opacity-50"
                >
                  {auditSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SliderField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-text-secondary text-xs">{label}</span>
        <span className="text-lavender text-xs font-semibold">{value}/10</span>
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
