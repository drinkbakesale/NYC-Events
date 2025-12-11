'use client'

import { useState } from 'react'
import { Event } from '@/lib/supabase'

interface EventCardProps {
  event: Event
  reaction?: string
  onLike: () => void
  onDislike: () => void
}

export default function EventCard({ event, reaction, onLike, onDislike }: EventCardProps) {
  const [expanded, setExpanded] = useState(false)

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't toggle if clicking on action buttons
    if ((e.target as HTMLElement).closest('.event-actions')) {
      return
    }
    setExpanded(!expanded)
  }

  return (
    <div className="event-card" onClick={handleCardClick}>
      <div className="event-header">
        <div className="event-info">
          <div className="event-title">{event.title}</div>
        </div>

        <div className="event-actions">
          <button
            className={`icon-button ${reaction === 'like' ? 'liked' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              onLike()
            }}
            title="Like event"
          >
            ♥
          </button>
          <button
            className="icon-button"
            onClick={(e) => {
              e.stopPropagation()
              if (confirm('Are you sure you want to hide this event?')) {
                onDislike()
              }
            }}
            title="Dislike event (hide)"
          >
            ✕
          </button>
        </div>
      </div>

      {expanded && (
        <div className="event-details">
          {event.description && (
            <div className="event-details-row">
              <div>{event.description}</div>
            </div>
          )}

          {event.source_event_url && (
            <div className="event-details-row">
              <a
                href={event.source_event_url}
                target="_blank"
                rel="noopener noreferrer"
                className="event-link"
                onClick={(e) => e.stopPropagation()}
              >
                View Event Details →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
