'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Plus, MoreHorizontal, List, Calendar as CalendarIcon, Edit, Trash2 } from 'lucide-react'
import CreateSessionModal from '@/components/sessions/CreateSessionModal'
import EditSessionModal from '@/components/sessions/EditSessionModal'

interface Session {
  id: string
  name: string
  description: string
  start_date: string
  end_date: string
  parent_session_id?: string
  color: string
  cadence: string
  cadence_day: string
  status: 'open' | 'in_progress' | 'archived'
  organization_id: string
  created_at: string
  created_by: string
  children?: Session[]
}

interface TimelineProps {
  sessions: Session[]
  onEditSession: (session: Session) => void
  onDeleteSession: (id: string) => void
  onStatusUpdate: (id: string, status: 'open' | 'in_progress' | 'archived') => void
}

const SessionsTimeline = ({ sessions, onEditSession, onDeleteSession, onStatusUpdate }: TimelineProps) => {
  const [statusEditModal, setStatusEditModal] = useState<{ isOpen: boolean; session: Session | null }>({
    isOpen: false,
    session: null
  })

  // Group sessions by year and sort by start date
  const sessionsByYear = sessions
    .filter(session => !session.parent_session_id) // Only parent sessions
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()) // Future dates at bottom
    .reduce((acc, session) => {
      const year = new Date(session.start_date).getFullYear()
      if (!acc[year]) acc[year] = []
      acc[year].push(session)
      return acc
    }, {} as Record<number, Session[]>)

  // Get child sessions for each parent
  const getChildSessions = (parentId: string) => {
    return sessions
      .filter(session => session.parent_session_id === parentId)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
  }

  // Format date to prevent timezone offset display issues
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset())
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    // Fix timezone offset to display actual dates
    start.setMinutes(start.getMinutes() + start.getTimezoneOffset())
    end.setMinutes(end.getMinutes() + end.getTimezoneOffset())
    
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-gray-100 text-gray-800'
      case 'in_progress': return 'bg-green-100 text-green-800'  
      case 'archived': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusDisplayText = (status: string) => {
    switch (status) {
      case 'open': return 'Open'
      case 'in_progress': return 'In Progress'
      case 'archived': return 'Archived'
      default: return status
    }
  }

  // Calculate session position on timeline
  const getSessionPosition = (startDate: string, endDate: string, year: number) => {
    const yearStart = new Date(year, 0, 1).getTime()
    const yearEnd = new Date(year, 11, 31).getTime()
    const sessionStart = new Date(startDate).getTime()
    const sessionEnd = new Date(endDate).getTime()

    const left = ((sessionStart - yearStart) / (yearEnd - yearStart)) * 100
    const width = ((sessionEnd - sessionStart) / (yearEnd - yearStart)) * 100

    return { left: `${Math.max(0, left)}%`, width: `${Math.min(100, width)}%` }
  }

  // Get current date position for indicator line
  const getCurrentDatePosition = (year: number) => {
    const yearStart = new Date(year, 0, 1).getTime()
    const yearEnd = new Date(year, 11, 31).getTime()
    const now = new Date().getTime()
    
    if (now < yearStart || now > yearEnd) return null
    
    const position = ((now - yearStart) / (yearEnd - yearStart)) * 100
    return `${position}%`
  }

  const handleStatusChange = async (newStatus: 'open' | 'in_progress' | 'archived') => {
    if (!statusEditModal.session) return

    try {
      await onStatusUpdate(statusEditModal.session.id, newStatus)
      setStatusEditModal({ isOpen: false, session: null })
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mx-6">
      {Object.entries(sessionsByYear).map(([year, yearSessions]) => {
        const currentDatePos = getCurrentDatePosition(parseInt(year))
        
        return (
          <div key={year} className="mb-8 last:mb-0">
            {/* Year Header - Centered above Jan */}
            <div className="relative mb-4">
              <div className="text-center">
                <div className="text-lg font-medium text-gray-600">{year}</div>
              </div>
              
              {/* Month Labels */}
              <div className="grid grid-cols-12 gap-0 mt-2 text-xs text-gray-500 text-center">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => (
                  <div key={month} className="relative">
                    {month}
                    {index < 11 && <div className="absolute right-0 top-0 bottom-0 w-px bg-gray-200"></div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Container */}
            <div className="relative">
              {/* Current Date Indicator - Behind bars only */}
              {currentDatePos && (
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                  style={{ left: currentDatePos }}
                />
              )}
              
              {/* Parent Sessions */}
              {yearSessions.map((parentSession) => {
                const parentPos = getSessionPosition(parentSession.start_date, parentSession.end_date, parseInt(year))
                const childSessions = getChildSessions(parentSession.id)
                
                return (
                  <div key={parentSession.id} className="mb-6">
                    {/* Parent Session Row */}
                    <div className="flex items-center mb-2">
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: parentSession.color }}
                        />
                        <div className="font-medium text-gray-900 truncate">{parentSession.name}</div>
                        <div className="text-sm text-gray-500 flex-shrink-0">
                          {getStatusDisplayText(parentSession.status)}
                        </div>
                        <button
                          onClick={() => setStatusEditModal({ isOpen: true, session: parentSession })}
                          className={`px-2 py-1 text-xs rounded-full ${getStatusColor(parentSession.status)} hover:opacity-75 transition-opacity flex-shrink-0`}
                        >
                          {getStatusDisplayText(parentSession.status)}
                        </button>
                        <div className="relative flex-shrink-0">
                          <button className="text-gray-400 hover:text-gray-600 p-1">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Parent Session Timeline Bar */}
                    <div className="relative h-8 bg-gray-100 rounded mb-3">
                      <div 
                        className="absolute h-full rounded z-10"
                        style={{ 
                          left: parentPos.left, 
                          width: parentPos.width, 
                          backgroundColor: parentSession.color 
                        }}
                      >
                        <div className="flex items-center justify-center h-full text-white text-xs font-medium">
                          {formatDateRange(parentSession.start_date, parentSession.end_date)}
                        </div>
                      </div>
                    </div>

                    {/* Child Sessions */}
                    {childSessions.map((childSession) => {
                      const childPos = getSessionPosition(childSession.start_date, childSession.end_date, parseInt(year))
                      
                      return (
                        <div key={childSession.id} className="ml-6 mb-3">
                          {/* Child Session Row */}
                          <div className="flex items-center mb-2">
                            <div className="flex items-center space-x-2 min-w-0 flex-1">
                              <div 
                                className="w-2 h-2 rounded-full flex-shrink-0" 
                                style={{ backgroundColor: childSession.color }}
                              />
                              <div className="text-sm text-gray-700 truncate">{childSession.name}</div>
                              <div className="text-sm text-gray-500 flex-shrink-0">
                                {getStatusDisplayText(childSession.status)}
                              </div>
                              <button
                                onClick={() => setStatusEditModal({ isOpen: true, session: childSession })}
                                className={`px-2 py-1 text-xs rounded-full ${getStatusColor(childSession.status)} hover:opacity-75 transition-opacity flex-shrink-0`}
                              >
                                {getStatusDisplayText(childSession.status)}
                              </button>
                              <div className="relative flex-shrink-0">
                                <button className="text-gray-400 hover:text-gray-600 p-1">
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          {/* Child Session Timeline Bar */}
                          <div className="relative h-6 bg-gray-50 rounded">
                            <div 
                              className="absolute h-full rounded z-10"
                              style={{ 
                                left: childPos.left, 
                                width: childPos.width, 
                                backgroundColor: childSession.color 
                              }}
                            >
                              <div className="flex items-center justify-center h-full text-white text-xs">
                                {formatDateRange(childSession.start_date, childSession.end_date)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Status Update Modal */}
      {statusEditModal.isOpen && statusEditModal.session && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-80 mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Status</h3>
              <p className="text-sm text-gray-600 mb-4">
                Current status: <span className="font-medium text-gray-900">{getStatusDisplayText(statusEditModal.session.status)}</span>
              </p>
              
              <div className="space-y-2">
                {(['open', 'in_progress', 'archived'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      statusEditModal.session?.status === status
                        ? 'bg-blue-100 text-blue-900 border border-blue-300'
                        : 'bg-gray-50 text-gray-900 hover:bg-gray-100 border border-transparent'
                    }`}
                  >
                    {getStatusDisplayText(status)}
                    {statusEditModal.session?.status === status && (
                      <span className="ml-2 text-blue-600">• Current</span>
                    )}
                  </button>
                ))}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setStatusEditModal({ isOpen: false, session: null })}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const SessionsList = ({ sessions, onEditSession, onDeleteSession, onStatusUpdate }: TimelineProps) => {
  const [statusEditModal, setStatusEditModal] = useState<{ isOpen: boolean; session: Session | null }>({
    isOpen: false,
    session: null
  })

  // Format date to prevent timezone offset display issues
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset())
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-gray-100 text-gray-800'
      case 'in_progress': return 'bg-green-100 text-green-800'  
      case 'archived': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusDisplayText = (status: string) => {
    switch (status) {
      case 'open': return 'Open'
      case 'in_progress': return 'In Progress'
      case 'archived': return 'Archived'
      default: return status
    }
  }

  const handleStatusChange = async (newStatus: 'open' | 'in_progress' | 'archived') => {
    if (!statusEditModal.session) return

    try {
      await onStatusUpdate(statusEditModal.session.id, newStatus)
      setStatusEditModal({ isOpen: false, session: null })
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  // Group sessions by parent/child relationship and sort by start date
  const parentSessions = sessions
    .filter(session => !session.parent_session_id)
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()) // Future dates at bottom

  const getChildSessions = (parentId: string) => {
    return sessions
      .filter(session => session.parent_session_id === parentId)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 mx-6">
      <div className="p-6">
        <div className="space-y-4">
          {parentSessions.map((parentSession) => {
            const childSessions = getChildSessions(parentSession.id)
            
            return (
              <div key={parentSession.id} className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                {/* Parent Session */}
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: parentSession.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 truncate">{parentSession.name}</div>
                      <div className="text-sm text-gray-500">
                        {formatDate(parentSession.start_date)} - {formatDate(parentSession.end_date)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                    <button
                      onClick={() => setStatusEditModal({ isOpen: true, session: parentSession })}
                      className={`px-2 py-1 text-xs rounded-full ${getStatusColor(parentSession.status)} hover:opacity-75 transition-opacity`}
                    >
                      {getStatusDisplayText(parentSession.status)}
                    </button>
                    
                    <div className="relative">
                      <button className="text-gray-400 hover:text-gray-600 p-1">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Child Sessions */}
                {childSessions.map((childSession) => (
                  <div key={childSession.id} className="flex items-center justify-between py-2 ml-8">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: childSession.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-gray-700 truncate">{childSession.name}</div>
                        <div className="text-xs text-gray-500">
                          {formatDate(childSession.start_date)} - {formatDate(childSession.end_date)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                      <button
                        onClick={() => setStatusEditModal({ isOpen: true, session: childSession })}
                        className={`px-2 py-1 text-xs rounded-full ${getStatusColor(childSession.status)} hover:opacity-75 transition-opacity`}
                      >
                        {getStatusDisplayText(childSession.status)}
                      </button>
                      
                      <div className="relative">
                        <button className="text-gray-400 hover:text-gray-600 p-1">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* Status Update Modal */}
      {statusEditModal.isOpen && statusEditModal.session && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-80 mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Status</h3>
              <p className="text-sm text-gray-600 mb-4">
                Current status: <span className="font-medium text-gray-900">{getStatusDisplayText(statusEditModal.session.status)}</span>
              </p>
              
              <div className="space-y-2">
                {(['open', 'in_progress', 'archived'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      statusEditModal.session?.status === status
                        ? 'bg-blue-100 text-blue-900 border border-blue-300'
                        : 'bg-gray-50 text-gray-900 hover:bg-gray-100 border border-transparent'
                    }`}
                  >
                    {getStatusDisplayText(status)}
                    {statusEditModal.session?.status === status && (
                      <span className="ml-2 text-blue-600">• Current</span>
                    )}
                  </button>
                ))}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setStatusEditModal({ isOpen: false, session: null })}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SessionsTimelinePage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const getCurrentUserOrgId = async (): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      return profile?.organization_id || null
    } catch (error) {
      console.error('Error getting user org ID:', error)
      return null
    }
  }

  const fetchSessions = useCallback(async () => {
    try {
      const organizationId = await getCurrentUserOrgId()
      if (!organizationId) return

      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('start_date', { ascending: true })

      if (error) throw error
      setSessions(data || [])
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const handleStatusUpdate = async (sessionId: string, newStatus: 'open' | 'in_progress' | 'archived') => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status: newStatus })
        .eq('id', sessionId)

      if (error) {
        console.error('Session update error:', error)
        throw error
      }

      // Update local state
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, status: newStatus }
          : session
      ))
    } catch (error) {
      console.error('Error updating session status:', error)
      throw error
    }
  }

  const handleEditSession = (session: Session) => {
    setEditingSession(session)
    setEditModalOpen(true)
  }

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return

    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      setSessions(prev => prev.filter(session => session.id !== id))
    } catch (error) {
      console.error('Error deleting session:', error)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  if (loading) {
    return (
      <div className="px-6 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
          <p className="text-gray-600">Manage your OKR sessions and time periods</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CalendarIcon className="h-4 w-4 mr-1" />
              Timeline
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="h-4 w-4 mr-1" />
              List
            </button>
          </div>
          
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Session
          </button>
        </div>
      </div>

      {/* Render based on view mode */}
      {viewMode === 'timeline' ? (
        <SessionsTimeline
          sessions={sessions}
          onEditSession={handleEditSession}
          onDeleteSession={handleDeleteSession}
          onStatusUpdate={handleStatusUpdate}
        />
      ) : (
        <SessionsList
          sessions={sessions}
          onEditSession={handleEditSession}
          onDeleteSession={handleDeleteSession}
          onStatusUpdate={handleStatusUpdate}
        />
      )}

      {/* Create Session Modal */}
      <CreateSessionModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          setCreateModalOpen(false)
          fetchSessions()
        }}
        getCurrentUserOrgId={getCurrentUserOrgId}
      />

      {/* Edit Session Modal */}
      {editModalOpen && editingSession && (
        <EditSessionModal
          isOpen={editModalOpen}
          session={editingSession}
          onClose={() => {
            setEditModalOpen(false)
            setEditingSession(null)
          }}
          onSuccess={() => {
            setEditModalOpen(false)
            setEditingSession(null)
            fetchSessions()
          }}
        />
      )}
    </div>
  )
}