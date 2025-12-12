'use client'

import { usePathname } from 'next/navigation'

export default function Header() {
  const pathname = usePathname()

  const getPageTitle = () => {
    switch (pathname) {
      case '/':
        return 'Upcoming Events'
      case '/liked-events':
        return 'Liked Events'
      case '/suggested-sources':
        return 'New Sources to Subscribe'
      case '/unsubscribe':
        return 'Sources to Unsub'
      default:
        return 'NYC Events'
    }
  }

  return (
    <header className="app-header">
      <h1>{getPageTitle()}</h1>
    </header>
  )
}
