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
        <div className="event-info">
          <div className="event-title">{event.title}</div>
          {event.description && (
            <div className="event-summary">{event.description}</div>
          )}
          <div className="event-meta">
            {event.start_time && <span>🕐 {formatTime(event.start_time)}</span>}
            {event.neighborhood && <span>📍 {event.neighborhood}</span>}
            {event.venue_name && <span>{event.venue_name}</span>}
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
            👍
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
            👎
          </button>
        </div>
      </div>

      {expanded && (
        <div className="event-details">
          {event.description && (
            <div className="event-details-row">
              <div className="event-details-label">Description</div>
              <div>{event.description}</div>
            </div>
          )}

          {event.start_time && (
            <div className="event-details-row">
              <div className="event-details-label">Start Time</div>
              <div>
                {new Date(event.start_time).toLocaleString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </div>
            </div>
          )}

          {event.end_time && (
            <div className="event-details-row">
              <div className="event-details-label">End Time</div>
              <div>
                {new Date(event.end_time).toLocaleString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </div>
            </div>
          )}

          {event.venue_name && (
            <div className="event-details-row">
              <div className="event-details-label">Venue</div>
              <div>{event.venue_name}</div>
            </div>
          )}

          {event.neighborhood && (
            <div className="event-details-row">
              <div className="event-details-label">Neighborhood</div>
              <div>{event.neighborhood}</div>
            </div>
          )}

          {event.city && (
            <div className="event-details-row">
              <div className="event-details-label">City</div>
              <div>{event.city}</div>
            </div>
          )}

          {event.source_event_url && (
            <div className="event-details-row">
              <div className="event-details-label">Event Link</div>
              <div>
                <a
                  href={event.source_event_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="event-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  {event.source_event_url}
                </a>
              </div>
            </div>
          )}

          <div className="event-details-row">
            <div className="event-details-label">Source</div>
            <div>{event.created_via}</div>
          </div>
        </div>
      )}
    </div>
  )
}
