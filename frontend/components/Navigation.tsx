'use client'

import { usePathname, useRouter } from 'next/navigation'

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    { path: '/', label: 'Upcoming Events' },
    { path: '/liked-events', label: 'Liked Events' },
    { path: '/suggested-sources', label: 'New Sources to Subscribe' },
    { path: '/unsubscribe', label: 'Sources to Unsub' },
  ]

  return (
    <nav className="nav">
      {navItems.map((item, index) => (
        <>
          <button
            key={item.path}
            className={`nav-item ${pathname === item.path ? 'active' : ''}`}
            onClick={() => router.push(item.path)}
          >
            <span>{item.label}</span>
          </button>
          {index < navItems.length - 1 && <div key={`divider-${index}`} className="nav-divider" />}
        </>
      ))}
    </nav>
  )
}
