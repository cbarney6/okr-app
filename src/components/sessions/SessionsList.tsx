'use client'

import { useState, useEffect } from 'react'
import { Session } from '@/lib/database.types'
import { CreateSessionModal } from '@/components/sessions/CreateSessionModal'
import { StatusBadge } from '@/components/sessions/StatusBadge'
import { Plus } from 'lucide-react'

interface SessionsListProps {
  onSessionSelect?: (session: Session) => void
}

export function SessionsList({ onSessionSelect }: SessionsListProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/sessions')
      const data = await response.json()
      if (data.sessions) {
        setSessions(data.sessions)
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const handleSessionCreated = () => {
    fetchSessions()
    setShowCreateModal(false)
  }

  if (loading) {
    return <div className="flex justify-center p-8">Loading sessions...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Sessions</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Session
        </button>
      </div>

      <div className="grid gap-4">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onSessionSelect?.(session)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: session.color }}
                />
                <h3 className="text-lg font-semibold text-gray-900">{session.name}</h3>
              </div>
              <StatusBadge status={session.status} />
            </div>
            
            <p className="text-gray-600 text-sm mb-2">{session.description}</p>
            
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>
                {new Date(session.start_date).toLocaleDateString()} - {' '}
                {new Date(session.end_date).toLocaleDateString()}
              </span>
              <span className="capitalize">{session.cadence.replace('_', ' ')}</span>
            </div>

            {session.parent_session && (
              <div className="mt-2 text-xs text-gray-400">
                Parent: {session.parent_session.name}
              </div>
            )}
          </div>
        ))}

        {sessions.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">No sessions yet</p>
            <p className="text-sm">Create your first session to get started with OKRs</p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateSessionModal
          onClose={() => setShowCreateModal(false)}
          onSessionCreated={handleSessionCreated}
          existingSessions={sessions}
        />
      )}
    </div>
  )
}