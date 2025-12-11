'use client'

import { useState, useEffect } from 'react'
import { supabase, USER_ID, Event, UserEventReaction } from '@/lib/supabase'
import EventCard from '@/components/EventCard'
import DateRangeSelector from '@/components/DateRangeSelector'

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([])
  const [reactions, setReactions] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>(() => {
    // Default: next 7 days
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setDate(end.getDate() + 7)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  })

  useEffect(() => {
    fetchEvents()
  }, [dateRange])

  const fetchEvents = async () => {
    setLoading(true)
    try {
      // Fetch events in date range, not hidden
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('hidden', false)
        .gte('start_time', dateRange.start.toISOString())
        .lte('start_time', dateRange.end.toISOString())
        .order('start_time', { ascending: true })

      if (eventsError) throw eventsError

      // Fetch user reactions
      const { data: reactionsData, error: reactionsError } = await supabase
        .from('user_event_reactions')
        .select('event_id, reaction')
        .eq('user_id', USER_ID)

      if (reactionsError) throw reactionsError

      // Build reactions map
      const reactionsMap = new Map<string, string>()
      reactionsData?.forEach((r) => {
        reactionsMap.set(r.event_id, r.reaction)
      })

      setEvents(eventsData || [])
      setReactions(reactionsMap)
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async (eventId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/like-event`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            user_id: USER_ID,
            event_id: eventId,
          }),
        }
      )

      if (!response.ok) throw new Error('Failed to like event')

      // Update local state
      setReactions((prev) => new Map(prev).set(eventId, 'like'))
    } catch (error) {
      console.error('Error liking event:', error)
      alert('Failed to like event. Please try again.')
    }
  }

  const handleDislike = async (eventId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/dislike-event`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            user_id: USER_ID,
            event_id: eventId,
          }),
        }
      )

      if (!response.ok) throw new Error('Failed to dislike event')

      // Remove event from view (it's now hidden)
      setEvents((prev) => prev.filter((e) => e.id !== eventId))
    } catch (error) {
      console.error('Error disliking event:', error)
      alert('Failed to dislike event. Please try again.')
    }
  }

  // Group events by date
  const eventsByDate = events.reduce((acc, event) => {
    if (!event.start_time) return acc
    const date = new Date(event.start_time).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    if (!acc[date]) acc[date] = []
    acc[date].push(event)
    return acc
  }, {} as Record<string, Event[]>)

  if (loading) {
    return (
      <div>
        <div className="header">
          <h1>NYC Events</h1>
          <p>Find events from your favorite newsletters</p>
        </div>
        <div className="loading">Loading events...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="header">
        <h1>NYC Events</h1>
        <p>Find events from your favorite newsletters</p>
      </div>

      <DateRangeSelector
        dateRange={dateRange}
        onChange={setDateRange}
      />

      {Object.keys(eventsByDate).length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">No events found</div>
          <p>Try adjusting your date range or check back later.</p>
        </div>
      ) : (
        <div className="calendar">
          {Object.entries(eventsByDate).map(([date, dateEvents]) => (
            <div key={date} className="date-section">
              <h2 className="date-header">{date}</h2>
              <div className="events-list">
                {dateEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    reaction={reactions.get(event.id)}
                    onLike={() => handleLike(event.id)}
                    onDislike={() => handleDislike(event.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
