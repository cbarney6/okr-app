'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Plus, Edit, Trash2, Calendar, Clock } from 'lucide-react'
import CreateSessionModal from './CreateSessionModal'
import EditSessionModal from './EditSessionModal'

interface Session {
  id: string
  name: string
  description?: string
  start_date: string
  end_date: string
  parent_session_id?: string
  color: string
  cadence: string
  cadence_day?: string
  status: string
  created_at: string
  updated_at: string
}

interface SessionsListProps {
  organizationId?: string
}

export default function SessionsList({ organizationId }: SessionsListProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [showDropdown, setShowDropdown] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSessions(data || [])
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditSession = (session: Session) => {
    setEditingSession(session)
    setShowEditModal(true)
  }

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)

      if (error) throw error
      
      setSessions(sessions.filter(session => session.id !== sessionId))
      setShowDeleteConfirm(null)
    } catch (error) {
      console.error('Error deleting session:', error)
    }
  }

  const handleSessionCreated = () => {
    fetchSessions()
  }

  const handleSessionUpdated = () => {
    fetchSessions()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800'
      case 'closed': return 'bg-red-100 text-red-800'
      case 'on-hold': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    // Fix timezone offset to display the actual date without conversion
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset())
  
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Sessions</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage your OKR sessions and time periods
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Session
          </button>
        </div>

        <div className="p-6">
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions yet</h3>
              <p className="text-gray-500 mb-4">Create your first session to start organizing your OKRs.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Session
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {/* Color indicator */}
                      <div
                        className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
                        style={{ backgroundColor: session.color === 'blue' ? '#3B82F6' : 
                                               session.color === 'green' ? '#10B981' : 
                                               session.color === 'orange' ? '#F97316' : 
                                               session.color === 'red' ? '#EF4444' : 
                                               session.color === 'purple' ? '#8B5CF6' : 
                                               session.color === 'cyan' ? '#06B6D4' : 
                                               session.color === 'lime' ? '#84CC16' : 
                                               session.color === 'amber' ? '#F59E0B' : '#3B82F6' }}
                      />
                      
                      <div className="flex-1">
                        <button
                          onClick={() => window.location.href = `/okrs?session=${session.id}`}
                          className="text-left hover:text-blue-600 transition-colors"
                        >
                          <h3 className="text-lg font-medium text-gray-900 hover:text-blue-600">{session.name}</h3>
                        </button>
                        {session.description && (
                          <p className="text-sm text-gray-600 mt-1">{session.description}</p>
                        )}
                        
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(session.start_date)} - {formatDate(session.end_date)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span className="capitalize">{session.cadence}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                        {session.status === 'open' ? 'OPEN' : 
                         session.status === 'in-progress' ? 'IN PROGRESS' :
                         session.status === 'closed' ? 'CLOSED' : 
                         session.status === 'archived' ? 'ARCHIVED' : 
                         session.status === 'on-hold' ? 'ON HOLD' : session.status.toUpperCase()}
                      </span>
                      
                      <div className="relative">
                        <button
                          onClick={() => setShowDropdown(showDropdown === session.id ? null : session.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded"
                          title="More options"
                        >
                          <span className="text-lg font-bold">⋯</span>
                        </button>
                        
                        {showDropdown === session.id && (
                          <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-32">
                            <button
                              onClick={() => {
                                handleEditSession(session)
                                setShowDropdown(null)
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                            >
                              <Edit className="h-4 w-4" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => {
                                setShowDropdown(null)
                                setShowDeleteConfirm(session.id)
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center space-x-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Session Modal */}
      <CreateSessionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleSessionCreated}
      />

      {/* Edit Session Modal */}
      {editingSession && (
        <EditSessionModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingSession(null)
          }}
          onSuccess={handleSessionUpdated}
          session={editingSession}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Session</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete this session? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteSession(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}