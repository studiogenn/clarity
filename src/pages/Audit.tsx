import { useState, useRef, useEffect } from 'react'
import { sendToClaudeStream, getSystemPrompt } from '../lib/claude'
import { saveEmotionAudit } from '../lib/store'
import type { ChatMessage } from '../lib/types'

const AUDIT_SYSTEM = `You are running an Emotion Audit for Danielle. This is a structured process to help her figure out what she's really feeling.

PROCESS:
Ask ONE question at a time. Wait for her answer before asking the next.

Question sequence:
1. "What's the first emotion word that comes to mind right now?"
2. "On a scale of 1–10, how intense is it?"
3. "When did it start — what was the trigger, or was there one?"
4. "Is this familiar? Have you felt this way before in similar situations?"
5. "What story are you telling yourself about this situation?"

After she answers all ~5 questions, synthesize everything:
- What the emotion actually seems to be (vs. what she named it)
- Where it might really be coming from
- Whether the story she's telling herself holds up under examination
- One concrete thing to do with this feeling

IMPORTANT: Start by asking the first question immediately. Keep each message short and warm. After the synthesis, end with "[AUDIT_COMPLETE]" on a new line so the system knows the audit is done.`

export default function Audit() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [started, setStarted] = useState(false)
  const [complete, setComplete] = useState(false)
  const [saved, setSaved] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function startAudit() {
    setStarted(true)
    setStreaming(true)

    const initMessages: ChatMessage[] = [
      { role: 'user', content: 'I want to do an emotion audit. Help me figure out what I\'m feeling.' }
    ]

    setMessages([
      ...initMessages,
      { role: 'assistant', content: '' }
    ])

    try {
      const response = await sendToClaudeStream(
        initMessages,
        getSystemPrompt(AUDIT_SYSTEM),
        (text) => {
          setMessages([
            ...initMessages,
            { role: 'assistant', content: text.replace('[AUDIT_COMPLETE]', '').trim() }
          ])
        },
        300
      )

      const cleanResponse = response.replace('[AUDIT_COMPLETE]', '').trim()
      setMessages([
        ...initMessages,
        { role: 'assistant', content: cleanResponse, timestamp: new Date().toISOString() }
      ])
    } catch (err) {
      console.error('Audit start error:', err)
    } finally {
      setStreaming(false)
    }
  }

  async function handleSend() {
    if (!input.trim() || streaming) return

    const userMsg: ChatMessage = { role: 'user', content: input.trim(), timestamp: new Date().toISOString() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setStreaming(true)

    setMessages([...newMessages, { role: 'assistant', content: '' }])

    try {
      const response = await sendToClaudeStream(
        newMessages,
        getSystemPrompt(AUDIT_SYSTEM),
        (text) => {
          setMessages([
            ...newMessages,
            { role: 'assistant', content: text.replace('[AUDIT_COMPLETE]', '').trim() }
          ])
        },
        800
      )

      const isComplete = response.includes('[AUDIT_COMPLETE]')
      const cleanResponse = response.replace('[AUDIT_COMPLETE]', '').trim()

      const finalMessages: ChatMessage[] = [
        ...newMessages,
        { role: 'assistant', content: cleanResponse, timestamp: new Date().toISOString() }
      ]
      setMessages(finalMessages)

      if (isComplete) {
        setComplete(true)
        // Save the audit
        await saveEmotionAudit({
          raw_conversation: finalMessages,
          synthesis: cleanResponse,
          emotion_identified: '',
          root_cause: '',
          action_step: '',
        })
        setSaved(true)
      }
    } catch (err) {
      console.error('Audit error:', err)
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

  function resetAudit() {
    setMessages([])
    setStarted(false)
    setComplete(false)
    setSaved(false)
    setInput('')
  }

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-rose-soft flex items-center justify-center mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-rose">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
        </div>
        <h1 className="font-serif text-3xl text-cream mb-3">Emotion Audit</h1>
        <p className="text-cream-muted mb-8 max-w-sm">
          Can't quite figure out what you're feeling? Let's untangle it together, one question at a time.
        </p>
        <button
          onClick={startAudit}
          className="bg-rose/20 text-rose border border-rose/30 rounded-xl px-8 py-3.5 font-medium hover:bg-rose/30 transition-all"
        >
          Help me figure out what I'm feeling
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-serif text-2xl text-cream">Emotion Audit</h1>
          <p className="text-cream-muted text-sm">
            {complete ? 'Audit complete' : 'Working through it together'}
          </p>
        </div>
        {complete && (
          <button
            onClick={resetAudit}
            className="text-cream-muted text-sm hover:text-cream transition-colors px-3 py-1.5 rounded-lg hover:bg-surface"
          >
            New audit
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.filter(m => m.role !== 'user' || m.content !== "I want to do an emotion audit. Help me figure out what I'm feeling.").map((msg, i) => (
          <div
            key={i}
            className={`animate-fade-in ${msg.role === 'user' ? 'flex justify-end' : ''}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-5 py-3.5 ${
                msg.role === 'user'
                  ? 'bg-rose/15 text-cream ml-8'
                  : 'bg-surface text-cream-muted mr-8'
              }`}
            >
              {msg.role === 'assistant' && (
                <p className="text-rose text-[10px] uppercase tracking-widest mb-1">Clarity</p>
              )}
              <div className="whitespace-pre-wrap leading-relaxed text-sm">
                {msg.content}
                {msg.role === 'assistant' && !msg.content && streaming && (
                  <span className="inline-block w-2 h-4 bg-rose/50 animate-pulse-soft ml-0.5" />
                )}
              </div>
            </div>
          </div>
        ))}

        {saved && (
          <div className="text-center py-4 animate-fade-in">
            <p className="text-sage text-sm">Saved to your journal</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {!complete && (
        <div className="bg-deep border border-border rounded-2xl p-3 flex items-end gap-3">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Your answer..."
            rows={1}
            className="flex-1 bg-transparent text-cream placeholder:text-cream-muted/40 resize-none text-sm py-1.5"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || streaming}
            className="p-2 rounded-xl bg-rose/20 text-rose hover:bg-rose/30 transition-all disabled:opacity-30 shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
