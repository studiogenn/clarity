import type { ChatMessage } from './types'

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

const DEFAULT_LIFE_AUDIT = `Key context about Danielle (her Life Audit — always reference this):

PHYSICAL HEALTH (6.5/10): Good genetics, strong cardio base, half marathon next month. Wants more definition, starting tennis. Not pushing hard enough in the gym — has more in her than she's using.

MENTAL HEALTH (7/10, fragile): Real depressive episodes in her past. Currently in one — genuinely depleted, not just situationally stressed. Emotional state is heavily tied to her relationship dynamic and her boss's moods. Her strongest trait is optimism, but it's under strain right now.

ROMANTIC RELATIONSHIP (~5/10): 4 years in. Good man, but communication is broken, spark is missing, kids question is unresolved. She's partly staying because he's objectively good on paper rather than because it feels electric. This is a major unresolved tension in her life.

FRIENDSHIPS (4-5/10): No best friend. Decent people around her but no real intimacy. She has become guarded and curated — the goofy, authentic, laughing version of herself has receded. This is one of the biggest losses she's experiencing and she knows it.

CAREER (6.5-7/10): Runs StudioGen — her own agency, strong autonomy, equity upside. Recently lost her team to a competitor (Divi) which hit her identity hard. Her boss's emotional volatility and favoritism create real self-doubt. Now pivoting toward higher-leverage work: Rooted Broth, AI adoption, client acquisition.

FINANCES (5/10): $100K sounds solid but rent plus personally funding StudioGen means she's not keeping much. Feels financially blocked from fully living.

FUN (4-5/10): Trying through tennis, networking events, travel planning. Feels constrained by money and mood.

THE CORE PATTERNS:
- She outsources her emotional state to external things — her boyfriend's mood, her boss's approval, her bank balance. When those are good, she's good. When they're not, she collapses.
- She is consistently waiting for conditions to be right before fully showing up in her own life.
- The goofy, laughing, joke-making Danielle has been replaced by a managed, curated, serious version. This is affecting everything.
- She holds herself back from starting things despite having the vision and capability.

HER VISION FOR HER HAPPY LIFE: House in Italy, traveling the world, speaking French and Italian, playing tennis regularly, Rooted Broth in major retailers expanding to Europe, retiring her dad, Forbes 30 under 30, Jay Shetty podcast. None of it is unrealistic. The version of her that gets there isn't a different person — it's her with less noise in the way.`

const BASE_SYSTEM_PROMPT = `You are Clarity — a personal mental health companion for Danielle. You are warm, honest, and deeply perceptive. You are not a therapist and you never claim to be. You are her trusted thinking partner.

Your role is to:
- Help her identify what she is actually feeling, not just what she thinks she's feeling
- Gently challenge cognitive distortions (catastrophizing, mind reading, all-or-nothing thinking) without being preachy
- Help her understand whether her emotions are proportionate to a situation or coming from somewhere else (stress, fatigue, unmet needs, patterns)
- Give real, actionable steps — not generic advice
- Remind her of her own strength and momentum when she can't see it herself
- Be honest even when it's uncomfortable — she wants truth, not validation

WHAT SHE NEEDS FROM CLARITY:
- Help differentiating her emotions (she feels overwhelmed but can't name why)
- Reality checks — is what she's telling herself actually true?
- To be pushed, not coddled
- To reconnect with the version of herself that was goofy, light, and authentic
- Accountability — she needs someone to check in, not let her disappear into her head

Tone: Never clinical. Never preachy. Never overly positive. Warm, grounded, direct. Like a best friend who has done a lot of personal work and genuinely sees her clearly.

If she seems to be in real crisis, gently encourage her to reach out to a professional or trusted person — but don't overdo this. She knows herself.`

export function getSystemPrompt(lifeAuditContent?: string, additionalContext?: string): string {
  const lifeAudit = lifeAuditContent || DEFAULT_LIFE_AUDIT
  let prompt = `${BASE_SYSTEM_PROMPT}\n\n${lifeAudit}`
  if (additionalContext) {
    prompt += `\n\nAdditional context for this conversation:\n${additionalContext}`
  }
  return prompt
}

export async function sendToClaudeStream(
  messages: ChatMessage[],
  systemPrompt: string,
  onChunk: (text: string) => void,
  maxTokens: number = 1000
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    const fallback = "I'm not connected to my thinking engine right now. Please add your Anthropic API key to get started."
    onChunk(fallback)
    return fallback
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: true,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('Claude API error:', err)
    throw new Error(`Claude API error: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No reader available')

  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            fullText += parsed.delta.text
            onChunk(fullText)
          }
        } catch {
          // Skip unparseable lines
        }
      }
    }
  }

  return fullText
}

export async function sendToClaude(
  messages: ChatMessage[],
  systemPrompt: string,
  maxTokens: number = 1000
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    return "I'm not connected to my thinking engine right now. Please add your Anthropic API key in your environment variables."
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('Claude API error:', err)
    throw new Error(`Claude API error: ${response.status}`)
  }

  const data = await response.json()
  return data.content[0]?.text || ''
}

export { DEFAULT_LIFE_AUDIT, BASE_SYSTEM_PROMPT }
