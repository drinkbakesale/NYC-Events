'use client'

import { useState, useEffect } from 'react'
import { supabase, SourceToUnsubscribe } from '@/lib/supabase'

export default function UnsubscribePage() {
  const [sources, setSources] = useState<SourceToUnsubscribe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSourcesToUnsubscribe()
  }, [])

  const fetchSourcesToUnsubscribe = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('sources_to_unsubscribe')
        .select('*')
        .order('dislike_count', { ascending: false })

      if (error) throw error
      setSources(data || [])
    } catch (error) {
      console.error('Error fetching sources to unsubscribe:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = async (sourceId: string) => {
    if (!confirm('Keep this source? It will no longer appear in this list.')) return

    try {
      const { error } = await supabase
        .from('sources')
        .update({ status: 'keep_subscribed' })
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
        <div className="loading">Loading sources...</div>
      </div>
    )
  }

  return (
    <div>
      {sources.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">No sources to unsubscribe</div>
          <p>You haven't disliked enough events from any source yet.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Dislikes</th>
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
                        {source.newsletter_signup_url}
                      </a>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#999' }}>
                        {source.domain}
                      </div>
                    )}
                  </td>
                  <td>
                    <strong style={{ fontSize: '16px' }}>{source.dislike_count}</strong>
                    <span style={{ fontSize: '12px', color: '#666' }}> events</span>
                  </td>
                  <td>
                    <button
                      className="table-button"
                      onClick={() => handleDismiss(source.id)}
                      title="Keep subscribed"
                    >
                      ✕ Keep
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4" style={{ fontSize: '13px', color: '#666', padding: '12px' }}>
            <p>
              <strong>Note:</strong> This list shows sources where you've disliked 5 or more events.
              You'll need to manually unsubscribe from these newsletters. Click the link to visit
              their website and unsubscribe.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
