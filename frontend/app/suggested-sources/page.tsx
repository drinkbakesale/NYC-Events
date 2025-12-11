'use client'

import { useState, useEffect } from 'react'
import { supabase, Source } from '@/lib/supabase'

export default function SuggestedSourcesPage() {
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSources()
  }, [])

  const fetchSources = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('sources')
        .select('*')
        .eq('status', 'suggested')
        .order('times_seen_in_search', { ascending: false })

      if (error) throw error
      setSources(data || [])
    } catch (error) {
      console.error('Error fetching sources:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = async (sourceId: string) => {
    if (!confirm('Dismiss this suggested source?')) return

    try {
      const { error } = await supabase
        .from('sources')
        .update({ status: 'rejected' })
        .eq('id', sourceId)

      if (error) throw error

      // Remove from local state
      setSources((prev) => prev.filter((s) => s.id !== sourceId))
    } catch (error) {
      console.error('Error dismissing source:', error)
      alert('Failed to dismiss source. Please try again.')
    }
  }

  const handleMarkSubscribed = async (sourceId: string) => {
    if (!confirm('Mark this source as subscribed?')) return

    try {
      const { error } = await supabase
        .from('sources')
        .update({ status: 'subscribed' })
        .eq('id', sourceId)

      if (error) throw error

      // Remove from local state
      setSources((prev) => prev.filter((s) => s.id !== sourceId))
    } catch (error) {
      console.error('Error updating source:', error)
      alert('Failed to update source. Please try again.')
    }
  }

  if (loading) {
    return (
      <div>
        <div className="header">
          <h1>Suggested Sources</h1>
          <p>Newsletters you might want to subscribe to</p>
        </div>
        <div className="loading">Loading sources...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="header">
        <h1>Suggested Sources</h1>
        <p>Newsletters you might want to subscribe to</p>
      </div>

      {sources.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">No suggested sources</div>
          <p>Like events to discover new sources!</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Type</th>
                <th>Seen</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <tr key={source.id}>
                  <td>
                    <div style={{ marginBottom: '4px' }}>
                      <strong>{source.display_name || source.domain}</strong>
                    </div>
                    {source.newsletter_signup_url ? (
                      <a
                        href={source.newsletter_signup_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="table-link"
                      >
                        Subscribe →
                      </a>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#999' }}>
                        No signup URL
                      </span>
                    )}
                  </td>
                  <td>{source.candidate_type}</td>
                  <td>{source.times_seen_in_search}×</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        className="table-button"
                        onClick={() => handleMarkSubscribed(source.id)}
                        title="Mark as subscribed"
                      >
                        ✓ Subscribed
                      </button>
                      <button
                        className="table-button"
                        onClick={() => handleDismiss(source.id)}
                        title="Dismiss"
                      >
                        ✕ Dismiss
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
