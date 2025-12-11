'use client'

import { usePathname, useRouter } from 'next/navigation'

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    { path: '/', label: 'Events', icon: '📅' },
    { path: '/liked-events', label: 'Liked', icon: '👍' },
    { path: '/suggested-sources', label: 'Sources', icon: '📰' },
    { path: '/unsubscribe', label: 'Unsub', icon: '🚫' },
  ]

  return (
    <nav className="nav">
      {navItems.map((item) => (
        <button
          key={item.path}
          className={`nav-item ${pathname === item.path ? 'active' : ''}`}
          onClick={() => router.push(item.path)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
