import { useState, useRef, useEffect } from 'react'
import { sendToClaudeStream, getSystemPrompt } from '../lib/claude'
import { saveChatSession, updateChatSession } from '../lib/store'
import type { ChatMessage } from '../lib/types'

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px'
    }
  }, [input])

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

    // Save or create session
    if (!sessionId) {
      const session = await saveChatSession({
        title: userMessage.content.slice(0, 80),
        messages: newMessages,
        summary: null,
      })
      if (session) setSessionId(session.id)
    }

    // Add placeholder for assistant
    const placeholderMessages = [...newMessages, { role: 'assistant' as const, content: '' }]
    setMessages(placeholderMessages)

    try {
      const fullResponse = await sendToClaudeStream(
        newMessages,
        getSystemPrompt(),
        (streamedText) => {
          setMessages(prev => {
            const updated = [...prev]
            updated[updated.length - 1] = { role: 'assistant', content: streamedText }
            return updated
          })
        },
        1500
      )

      const finalMessages: ChatMessage[] = [...newMessages, {
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date().toISOString(),
      }]
      setMessages(finalMessages)

      // Save to session
      if (sessionId) {
        await updateChatSession(sessionId, { messages: finalMessages })
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

  function startNew() {
    setMessages([])
    setSessionId(null)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-serif text-2xl text-cream">Talk to Clarity</h1>
          <p className="text-cream-muted text-sm">Say whatever's on your mind</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={startNew}
            className="text-cream-muted text-sm hover:text-cream transition-colors px-3 py-1.5 rounded-lg hover:bg-surface"
          >
            New conversation
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in-slow">
            <div className="w-12 h-12 rounded-full bg-amber/10 flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <p className="text-cream-muted mb-2">What's on your mind?</p>
            <p className="text-cream-muted/50 text-sm max-w-xs">
              Talk about how you're feeling, what happened today, or anything you need to work through.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`animate-fade-in ${msg.role === 'user' ? 'flex justify-end' : ''}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-5 py-3.5 ${
                msg.role === 'user'
                  ? 'bg-amber/15 text-cream ml-8'
                  : 'bg-surface text-cream-muted mr-8'
              }`}
            >
              {msg.role === 'assistant' && (
                <p className="text-amber text-[10px] uppercase tracking-widest mb-1">Clarity</p>
              )}
              <div className="whitespace-pre-wrap leading-relaxed text-sm">
                {msg.content}
                {msg.role === 'assistant' && !msg.content && streaming && (
                  <span className="inline-block w-2 h-4 bg-amber/50 animate-pulse-soft ml-0.5" />
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-deep border border-border rounded-2xl p-3 flex items-end gap-3">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type here..."
          rows={1}
          className="flex-1 bg-transparent text-cream placeholder:text-cream-muted/40 resize-none text-sm py-1.5"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || streaming}
          className="p-2 rounded-xl bg-amber/20 text-amber hover:bg-amber/30 transition-all disabled:opacity-30 disabled:hover:bg-amber/20 shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  )
}
