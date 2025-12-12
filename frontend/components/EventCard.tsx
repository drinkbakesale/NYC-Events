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

  const formatTime = (dateString: string | null) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

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
        <div className="event-title-row">
          <div className="event-info">
            <div className="event-title">{event.title}</div>
            <div className="event-meta">
              {event.start_time && <span>{formatTime(event.start_time)}</span>}
              {event.neighborhood && <span>{event.neighborhood}</span>}
            </div>
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

        {event.description && (
          <div className="event-summary">{event.description}</div>
        )}
      </div>

      {expanded && (
        <div className="event-details">
          {event.venue_name && (
            <div className="event-details-row">
              <div className="event-details-label">Venue</div>
              <div>{event.venue_name}</div>
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
