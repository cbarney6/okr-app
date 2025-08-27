'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Plus, MoreHorizontal, List, Calendar as CalendarIcon, Edit, Trash2 } from 'lucide-react'
import CreateSessionModal from '@/components/sessions/CreateSessionModal'
import EditSessionModal from '@/components/sessions/EditSessionModal'
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout'

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
  status: 'open' | 'in_progress' | 'archived'
  organization_id: string
  created_at: string
  updated_at: string
}

interface SessionGroup {
  parentSession: Session
  childSessions: Session[]
}

export default function SessionsTimelinePage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserRoles, setCurrentUserRoles] = useState<string[]>([])
  const [isMobile, setIsMobile] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline')
  const [statusEditModal, setStatusEditModal] = useState<{session: Session, isOpen: boolean}>({ 
    session: {} as Session, 
    isOpen: false 
  })
  const [showDropdown, setShowDropdown] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchSessions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, roles')
        .eq('id', user.id)
        .single()

      if (!profile?.organization_id) return

      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('start_date', { ascending: false })

      if (error) {
        console.error('Error fetching sessions:', error)
        return
      }

      setSessions(data || [])
      setCurrentUserRoles(profile.roles || [])
    } catch (error) {
      console.error('Error in fetchSessions:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const getCurrentUserOrgId = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    return profile?.organization_id || null
  }, [supabase])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    const handleResize = () => setIsMobile(window.innerWidth < 768)

    checkMobile()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Fix timezone offset for date display - this was your previous successful fix
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset())
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const organizeSessionsIntoGroups = (sessions: Session[]) => {
    const parentSessions = sessions.filter(s => !s.parent_session_id)
    const childSessions = sessions.filter(s => s.parent_session_id)

    // Sort parent sessions by start_date (future dates at bottom)
    parentSessions.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

    const groups: SessionGroup[] = parentSessions.map(parent => {
      const children = childSessions
        .filter(child => child.parent_session_id === parent.id)
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

      return {
        parentSession: parent,
        childSessions: children
      }
    })

    return groups
  }

  const sessionGroups = organizeSessionsIntoGroups(sessions)

  const generateMonthHeaders = (sessionStart: Date, sessionEnd: Date) => {
    const headers = []
    const current = new Date(sessionStart)
    current.setDate(1)
    
    while (current <= sessionEnd) {
      headers.push({
        month: current.toLocaleDateString('en-US', { month: 'short' }),
        year: current.getFullYear(),
        isYearStart: current.getMonth() === 0
      })
      current.setMonth(current.getMonth() + 1)
    }

    return headers
  }

  const calculateSessionPosition = (startDate: string, endDate: string, sessionStart: Date, sessionEnd: Date) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    const totalDays = (sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60 * 60 * 24)
    const startOffset = Math.max(0, (start.getTime() - sessionStart.getTime()) / (1000 * 60 * 60 * 24))
    const sessionDuration = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)

    const leftPercent = (startOffset / totalDays) * 100
    const widthPercent = (sessionDuration / totalDays) * 100

    return { leftPercent, widthPercent }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-gray-100 text-gray-800'
      case 'in_progress': return 'bg-green-100 text-green-800'  
      case 'archived': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-gray-50'
      case 'in_progress': return 'bg-green-50'
      case 'archived': return 'bg-red-50'
      default: return 'bg-gray-50'
    }
  }

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'open': return 'OPEN'
      case 'in_progress': return 'IN PROGRESS'
      case 'archived': return 'ARCHIVED'
      default: return status.toUpperCase()
    }
  }

  const handleStatusClick = (session: Session) => {
    if (currentUserRoles.includes('admin')) {
      setStatusEditModal({ session, isOpen: true })
      setShowDropdown(null)
    }
  }

  const handleStatusUpdate = async (newStatus: 'open' | 'in_progress' | 'archived') => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status: newStatus })
        .eq('id', statusEditModal.session.id)

      if (error) {
        console.error('Error updating session status:', error)
        return
      }

      await fetchSessions()
      setStatusEditModal({ session: {} as Session, isOpen: false })
    } catch (error) {
      console.error('Session update error:', error)
    }
  }

  const handleEditSession = (session: Session) => {
    setEditingSession(session)
    setShowDropdown(null)
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return

    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)

      if (error) {
        console.error('Error deleting session:', error)
        return
      }

      await fetchSessions()
      setShowDropdown(null)
    } catch (error) {
      console.error('Error deleting session:', error)
    }
  }

  const renderCurrentDateIndicator = (sessionStart: Date, sessionEnd: Date) => {
    const now = new Date()
    if (now < sessionStart || now > sessionEnd) return null

    const totalDays = (sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60 * 60 * 24)
    const currentOffset = (now.getTime() - sessionStart.getTime()) / (1000 * 60 * 60 * 24)
    const position = (currentOffset / totalDays) * 100

    return (
      <div 
        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 flex items-start justify-center"
        style={{ left: `${position}%` }}
      >
        <div className="w-3 h-3 bg-red-500 rounded-full -mt-1.5"></div>
      </div>
    )
  }

  const renderTimelineView = () => {
    return (
      <div className="px-6">
        <div className="space-y-8">
          {sessionGroups.map((group, groupIndex) => {
            const parentSession = group.parentSession
            const sessionStart = new Date(parentSession.start_date)
            const sessionEnd = new Date(parentSession.end_date)
            const headers = generateMonthHeaders(sessionStart, sessionEnd)

            // Fix year display - use session start year only
            const displayYear = sessionStart.getFullYear()

            return (
              <div key={groupIndex} className={`border rounded-lg ${getStatusBgColor(parentSession.status)}`}>
                <div className="relative">
                  <div className="text-center py-3 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900">
                      {displayYear}
                    </h3>
                  </div>

                  <div className="flex border-b border-gray-200 bg-gray-50">
                    {headers.map((header, index) => (
                      <div 
                        key={index} 
                        className="flex-1 px-2 py-2 text-xs text-center text-gray-600 border-r border-gray-200 last:border-r-0"
                      >
                        {header.month}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 relative">
                  {/* Current Date Indicator - behind bars only */}
                  {renderCurrentDateIndicator(sessionStart, sessionEnd)}

                  <div className="flex items-center mb-4">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: parentSession.color }}></div>
                    <span className="ml-3 font-medium text-gray-900">{parentSession.name}</span>
                    <span 
                      className={`ml-2 px-2 py-1 text-xs font-medium rounded-full cursor-pointer ${getStatusColor(parentSession.status)}`}
                      onClick={() => handleStatusClick(parentSession)}
                    >
                      {getStatusDisplay(parentSession.status)}
                    </span>
                    
                    <div className="relative ml-2">
                      <button 
                        className="p-1 rounded-md hover:bg-gray-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowDropdown(showDropdown === parentSession.id ? null : parentSession.id)
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4 text-gray-400" />
                      </button>

                      {showDropdown === parentSession.id && (
                        <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-40 min-w-32">
                          <button
                            onClick={() => handleEditSession(parentSession)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                          >
                            <Edit className="h-4 w-4" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteSession(parentSession.id)}
                            className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center space-x-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="relative h-8 bg-white border rounded mb-4 z-20">
                    <div
                      className="absolute top-0 bottom-0 rounded flex items-center justify-center text-white text-sm font-medium"
                      style={{ 
                        left: '0%', 
                        width: '100%',
                        backgroundColor: parentSession.color 
                      }}
                    >
                      {`${formatDate(parentSession.start_date)} - ${formatDate(parentSession.end_date)}`}
                    </div>
                  </div>

                  {group.childSessions.map((childSession) => {
                    const position = calculateSessionPosition(
                      childSession.start_date,
                      childSession.end_date,
                      sessionStart,
                      sessionEnd
                    )

                    return (
                      <div key={childSession.id} className="ml-6 mb-3">
                        <div className="flex items-center mb-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: childSession.color }}></div>
                          <span className="ml-3 text-sm text-gray-700">{childSession.name}</span>
                          <span 
                            className={`ml-2 px-2 py-1 text-xs font-medium rounded-full cursor-pointer ${getStatusColor(childSession.status)}`}
                            onClick={() => handleStatusClick(childSession)}
                          >
                            {getStatusDisplay(childSession.status)}
                          </span>
                          
                          <div className="relative ml-2">
                            <button 
                              className="p-1 rounded-md hover:bg-gray-100"
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowDropdown(showDropdown === childSession.id ? null : childSession.id)
                              }}
                            >
                              <MoreHorizontal className="h-4 w-4 text-gray-400" />
                            </button>

                            {showDropdown === childSession.id && (
                              <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-40 min-w-32">
                                <button
                                  onClick={() => handleEditSession(childSession)}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                                >
                                  <Edit className="h-4 w-4" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteSession(childSession.id)}
                                  className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center space-x-2"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="relative h-6 bg-white border rounded z-20">
                          <div
                            className="absolute top-0 bottom-0 rounded flex items-center justify-center text-white text-xs font-medium"
                            style={{ 
                              left: `${position.leftPercent}%`, 
                              width: `${position.widthPercent}%`,
                              backgroundColor: childSession.color 
                            }}
                          >
                            {`${formatDate(childSession.start_date)} - ${formatDate(childSession.end_date)}`}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderListView = () => {
    return (
      <div className="px-6">
        <div className="space-y-4">
          {sessionGroups.map((group) => (
            <div key={group.parentSession.id}>
              <div className={`border rounded-lg p-4 ${getStatusBgColor(group.parentSession.status)}`}>
                <div className="flex items-center">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div 
                      className="w-4 h-4 rounded flex-shrink-0" 
                      style={{ backgroundColor: group.parentSession.color }}
                    ></div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-gray-900 truncate">{group.parentSession.name}</h3>
                      <p className="text-sm text-gray-500 truncate">
                        {formatDate(group.parentSession.start_date)} - {formatDate(group.parentSession.end_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                    <span 
                      className={`px-2 py-1 text-xs font-medium rounded-full cursor-pointer ${getStatusColor(group.parentSession.status)}`}
                      onClick={() => handleStatusClick(group.parentSession)}
                    >
                      {getStatusDisplay(group.parentSession.status)}
                    </span>
                    <div className="relative">
                      <button 
                        className="p-1 rounded-md hover:bg-gray-100"
                        onClick={() => setShowDropdown(showDropdown === group.parentSession.id ? null : group.parentSession.id)}
                      >
                        <MoreHorizontal className="h-4 w-4 text-gray-400" />
                      </button>
                      
                      {showDropdown === group.parentSession.id && (
                        <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-40 min-w-32">
                          <button
                            onClick={() => handleEditSession(group.parentSession)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                          >
                            <Edit className="h-4 w-4" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteSession(group.parentSession.id)}
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
              
              {group.childSessions.map((child) => (
                <div key={child.id} className={`ml-8 mt-2 border rounded-lg p-3 ${getStatusBgColor(child.status)}`}>
                  <div className="flex items-center">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div 
                        className="w-3 h-3 rounded flex-shrink-0" 
                        style={{ backgroundColor: child.color }}
                      ></div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">{child.name}</h4>
                        <p className="text-xs text-gray-500 truncate">
                          {formatDate(child.start_date)} - {formatDate(child.end_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                      <span 
                        className={`px-2 py-1 text-xs font-medium rounded-full cursor-pointer ${getStatusColor(child.status)}`}
                        onClick={() => handleStatusClick(child)}
                      >
                        {getStatusDisplay(child.status)}
                      </span>
                      <div className="relative">
                        <button 
                          className="p-1 rounded-md hover:bg-gray-100"
                          onClick={() => setShowDropdown(showDropdown === child.id ? null : child.id)}
                        >
                          <MoreHorizontal className="h-4 w-4 text-gray-400" />
                        </button>
                        
                        {showDropdown === child.id && (
                          <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-40 min-w-32">
                            <button
                              onClick={() => handleEditSession(child)}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                            >
                              <Edit className="h-4 w-4" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteSession(child.id)}
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
          ))}
        </div>
      </div>
    )
  }

  const renderMobileView = () => {
    return (
      <div className="px-4">
        <div className="space-y-4">
          {sessions.map((session) => (
            <div key={session.id} className={`p-4 border rounded-lg ${getStatusBgColor(session.status)}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: session.color }}></div>
                  <span className="font-medium text-gray-900">{session.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span 
                    className={`px-2 py-1 text-xs font-medium rounded-full cursor-pointer ${getStatusColor(session.status)}`}
                    onClick={() => handleStatusClick(session)}
                  >
                    {getStatusDisplay(session.status)}
                  </span>
                  <button 
                    className="p-1 rounded-md hover:bg-gray-100"
                    onClick={() => setShowDropdown(showDropdown === session.id ? null : session.id)}
                  >
                    <MoreHorizontal className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {formatDate(session.start_date)} - {formatDate(session.end_date)}
              </div>
              
              {showDropdown === session.id && (
                <div className="mt-2 bg-white border border-gray-200 rounded-md shadow-lg">
                  <button
                    onClick={() => handleEditSession(session)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteSession(session.id)}
                    className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center space-x-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <AuthenticatedLayout pageTitle="Sessions">
      <div className="min-h-screen">
        <div className="py-6">
          <div className="mb-6 px-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
              <p className="text-gray-600">Manage your OKR sessions and time periods</p>
            </div>
            <div className="flex items-center space-x-4">
              {!isMobile && (
                <div className="flex items-center bg-gray-100 rounded-md p-1">
                  <button
                    onClick={() => setViewMode('timeline')}
                    className={`px-3 py-1 text-sm rounded ${viewMode === 'timeline' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'}`}
                  >
                    <CalendarIcon className="h-4 w-4 inline mr-1" />
                    Timeline
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1 text-sm rounded ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'}`}
                  >
                    <List className="h-4 w-4 inline mr-1" />
                    List
                  </button>
                </div>
              )}
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Session
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-gray-500">Loading sessions...</div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="text-gray-500 mb-4">No sessions found</div>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Session
              </button>
            </div>
          ) : isMobile ? (
            renderMobileView()
          ) : viewMode === 'timeline' ? (
            renderTimelineView()
          ) : (
            renderListView()
          )}

          {statusEditModal.isOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Status</h3>
                <div className="space-y-3">
                  {(['open', 'in_progress', 'archived'] as const).map((status) => (
                    <button
                      key={status}
                      className={`w-full text-left p-3 rounded-md border transition-colors ${
                        statusEditModal.session.status === status 
                          ? 'border-blue-500 bg-blue-50 text-blue-900 font-medium' 
                          : 'border-gray-200 hover:bg-gray-50 text-gray-900'
                      }`}
                      onClick={() => handleStatusUpdate(status)}
                    >
                      {getStatusDisplay(status)}
                    </button>
                  ))}
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setStatusEditModal({ session: {} as Session, isOpen: false })}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {isCreateModalOpen && (
            <CreateSessionModal
              isOpen={isCreateModalOpen}
              onClose={() => setIsCreateModalOpen(false)}
              onSuccess={() => {
                fetchSessions()
                setIsCreateModalOpen(false)
              }}
              getCurrentUserOrgId={getCurrentUserOrgId}
            />
          )}

          {editingSession && (
            <EditSessionModal
              isOpen={!!editingSession}
              onClose={() => setEditingSession(null)}
              onSuccess={() => {
                fetchSessions()
                setEditingSession(null)
              }}
              session={editingSession}
            />
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  )
}