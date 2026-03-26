import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { updateProfile } from '../lib/store'
import { LIFE_AUDIT_CONTEXT } from '../lib/claude'

export default function LifeAudit() {
  const { profile, refreshProfile } = useAuth()
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setContent(profile?.life_audit || LIFE_AUDIT_CONTEXT)
  }, [profile])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      await updateProfile({ life_audit: content })
      await refreshProfile()
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
        <h1 className="font-serif text-3xl text-cream mb-2">Life Audit</h1>
        <p className="text-cream-muted text-sm max-w-lg">
          This is your living document — the context that Clarity uses to understand you.
          Update it as things change. The more accurate it is, the better Clarity can help.
        </p>
      </div>

      <div className="bg-deep border border-border rounded-2xl p-6 md:p-8">
        <textarea
          value={content}
          onChange={e => {
            setContent(e.target.value)
            setSaved(false)
          }}
          rows={30}
          className="w-full bg-transparent text-cream-muted leading-relaxed text-sm font-mono resize-y min-h-[400px] focus:text-cream transition-colors"
          placeholder="Write about your current life circumstances, goals, stressors, patterns..."
        />

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <p className="text-cream-muted/50 text-xs">
            This context is injected into every conversation with Clarity
          </p>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-sage text-sm animate-fade-in">Saved</span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-amber/20 text-amber border border-amber/30 rounded-xl px-6 py-2.5 text-sm font-medium hover:bg-amber/30 transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
