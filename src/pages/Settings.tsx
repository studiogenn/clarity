import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { updateProfile } from '../lib/store'

export default function Settings() {
  const { profile, refreshProfile } = useAuth()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile?.name) setName(profile.name)
  }, [profile])

  async function handleSave() {
    setSaving(true)
    try {
      await updateProfile({ name })
      await refreshProfile()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Error saving settings:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-cream mb-2">Settings</h1>
      </div>

      <div className="bg-deep border border-border rounded-2xl p-6 max-w-md">
        <label className="text-cream-muted text-sm block mb-2">Your Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-cream focus:border-amber/40 transition-colors mb-4"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-amber/20 text-amber border border-amber/30 rounded-xl px-6 py-2.5 text-sm font-medium hover:bg-amber/30 transition-all disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          {saved && <span className="text-sage text-sm animate-fade-in">Saved</span>}
        </div>
      </div>
    </div>
  )
}
