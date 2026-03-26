import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/chat', label: 'Chat', icon: ChatIcon },
  { to: '/journal', label: 'Journal', icon: JournalIcon },
  { to: '/life-audit', label: 'Life Audit', icon: LifeAuditIcon },
]

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-warm-white">
      {/* Desktop top nav */}
      <header className="hidden md:block sticky top-0 z-10 bg-pure-white/80 backdrop-blur-md border-b border-border-light">
        <div className="max-w-3xl mx-auto px-8 flex items-center justify-between h-16">
          <NavLink to="/" className="font-serif text-xl text-sage tracking-wide">
            Clarity
          </NavLink>

          <nav className="flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-sage-light text-sage font-medium'
                      : 'text-text-muted hover:text-text hover:bg-cream'
                  }`
                }
              >
                <Icon />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-24 md:pb-8">
        <div className="max-w-3xl mx-auto px-5 py-8 md:px-8 md:py-10">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-pure-white/90 backdrop-blur-md border-t border-border-light flex justify-around py-2 px-3 z-10">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl text-[10px] transition-all ${
                isActive ? 'text-sage' : 'text-text-muted'
              }`
            }
          >
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  )
}

function JournalIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  )
}

function LifeAuditIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}
