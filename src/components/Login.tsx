import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signIn(email, password)
    if (error) setError(error)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-midnight">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-12">
          <h1 className="font-serif text-4xl text-amber mb-3 tracking-wide">Clarity</h1>
          <p className="text-cream-muted text-sm">Your personal mental health companion</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full bg-deep border border-border rounded-xl px-4 py-3.5 text-cream placeholder:text-cream-muted/50 focus:border-amber/50 transition-colors"
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full bg-deep border border-border rounded-xl px-4 py-3.5 text-cream placeholder:text-cream-muted/50 focus:border-amber/50 transition-colors"
            />
          </div>

          {error && (
            <p className="text-rose text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber/20 text-amber border border-amber/30 rounded-xl py-3.5 font-medium hover:bg-amber/30 transition-all disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  )
}
