'use client'

import { useState, useEffect } from 'react'
import { supabase, USER_ID, Event } from '@/lib/supabase'

export default function LikedEventsPage() {
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLikedEvents()
  }, [])

  const fetchLikedEvents = async () => {
    setLoading(true)
    try {
      // Get event IDs that user liked
      const { data: reactions, error: reactionsError } = await supabase
        .from('user_event_reactions')
        .select('event_id')
        .eq('user_id', USER_ID)
        .eq('reaction', 'like')

      if (reactionsError) throw reactionsError

      if (!reactions || reactions.length === 0) {
        setUpcomingEvents([])
        setLoading(false)
        return
      }

      const likedEventIds = reactions.map((r) => r.event_id)

      // Fetch those events that are upcoming (start_time >= now)
      const now = new Date().toISOString()
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .in('id', likedEventIds)
        .gte('start_time', now)
        .order('start_time', { ascending: true })

      if (eventsError) throw eventsError

      setUpcomingEvents(eventsData || [])
    } catch (error) {
      console.error('Error fetching liked events:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  if (loading) {
    return (
      <div>
        <div className="header">
          <h1>Liked Events</h1>
          <p>Events you've liked</p>
        </div>
        <div className="loading">Loading events...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="header">
        <h1>Liked Events</h1>
        <p>Events you've liked</p>
      </div>

      <div className="mb-4">
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
          Upcoming Events ({upcomingEvents.length})
        </h2>

        {upcomingEvents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No upcoming liked events</div>
            <p>Like some events to see them here!</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date & Time</th>
                  <th>Location</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                {upcomingEvents.map((event) => (
                  <tr key={event.id}>
                    <td>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                        {event.title}
                      </div>
                      {event.description && (
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {event.description.length > 100
                            ? event.description.substring(0, 100) + '...'
                            : event.description}
                        </div>
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {formatDateTime(event.start_time)}
                    </td>
                    <td>
                      {event.venue_name && (
                        <div style={{ marginBottom: '2px' }}>{event.venue_name}</div>
                      )}
                      {event.neighborhood && (
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {event.neighborhood}
                        </div>
                      )}
                    </td>
                    <td>
                      {event.source_event_url ? (
                        <a
                          href={event.source_event_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="table-link"
                        >
                          View →
                        </a>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#999' }}>N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
