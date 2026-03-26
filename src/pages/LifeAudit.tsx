import { useState, useEffect } from 'react'
import { getLifeAudit, saveLifeAudit } from '../lib/store'
import { DEFAULT_LIFE_AUDIT } from '../lib/claude'

export default function LifeAudit() {
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = getLifeAudit()
    setContent(stored || DEFAULT_LIFE_AUDIT)
  }, [])

  function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      saveLifeAudit(content)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Error saving life audit:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-text mb-2">Life Audit</h1>
        <p className="text-text-muted text-sm max-w-lg leading-relaxed">
          This is your living document — the context that Clarity uses to understand you.
          Update it as things change. The more accurate it is, the better Clarity can help.
        </p>
      </div>

      <div className="bg-pure-white border border-border-light rounded-2xl p-6 md:p-8 card-shadow">
        <textarea
          value={content}
          onChange={e => {
            setContent(e.target.value)
            setSaved(false)
          }}
          rows={30}
          className="w-full bg-transparent text-text leading-relaxed text-sm font-mono resize-y min-h-[400px] placeholder:text-text-light focus:text-text transition-colors"
          placeholder="Write about your current life circumstances, goals, stressors, patterns..."
        />

        <div className="flex items-center justify-between mt-6 pt-5 border-t border-border-light">
          <p className="text-text-light text-xs">
            This context is injected into every conversation with Clarity
          </p>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-sage text-sm animate-fade-in font-medium">Saved</span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-sage text-pure-white rounded-xl px-6 py-2.5 text-sm font-medium hover:bg-sage/90 transition-all disabled:opacity-50 shadow-sm"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
