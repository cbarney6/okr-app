'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Plus, MoreHorizontal, Edit, Trash2 } from 'lucide-react'
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
  status: string
  created_at: string
  updated_at: string
}

interface SessionGroup {
  year: number
  parentSessions: SessionWithChildren[]
}

interface SessionWithChildren extends Session {
  children: Session[]
}

export default function SessionsTimelinePage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionGroups, setSessionGroups] = useState<SessionGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [showDropdown, setShowDropdown] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showStatusModal, setShowStatusModal] = useState<string | null>(null)
  const [currentUserRoles, setCurrentUserRoles] = useState<string[]>([])
  const [isMobile, setIsMobile] = useState(false)
  const [leftPanelWidth, setLeftPanelWidth] = useState(300) // For resizable panel

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const isAdmin = currentUserRoles.includes('admin')

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('start_date', { ascending: true })

      if (error) throw error
      setSessions(data || [])
      organizeSessionsIntoGroups(data || [])
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const getCurrentUserRoles = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('roles')
          .eq('id', user.id)
          .single()

        if (error) throw error
        setCurrentUserRoles(data?.roles || [])
      }
    } catch (error) {
      console.error('Error fetching current user roles:', error)
    }
  }, [supabase])

  const organizeSessionsIntoGroups = (sessions: Session[]) => {
    const parentSessions = sessions.filter(s => !s.parent_session_id)
    const childSessions = sessions.filter(s => s.parent_session_id)

    const sessionsWithChildren: SessionWithChildren[] = parentSessions.map(parent => ({
      ...parent,
      children: childSessions
        .filter(child => child.parent_session_id === parent.id)
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
    }))

    const groups: SessionGroup[] = sessionsWithChildren.map(session => ({
      year: new Date(session.start_date).getFullYear(),
      parentSessions: [session]
    }))

    groups.sort((a, b) => {
      const dateA = new Date(a.parentSessions[0].start_date)
      const dateB = new Date(b.parentSessions[0].start_date)
      return dateB.getTime() - dateA.getTime()
    })

    setSessionGroups(groups)
  }

  const handleEditSession = (session: Session) => {
    setEditingSession(session)
    setShowEditModal(true)
    setShowDropdown(null)
  }

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)

      if (error) throw error
      
      fetchSessions()
      setShowDeleteConfirm(null)
    } catch (error) {
      console.error('Error deleting session:', error)
    }
  }

  const handleStatusChange = async (sessionId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status: newStatus })
        .eq('id', sessionId)

      if (error) throw error
      
      fetchSessions()
      setShowStatusModal(null)
    } catch (error) {
      console.error('Error updating session status:', error)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': return 'bg-gray-100 text-gray-800'
      case 'in progress': case 'in-progress': return 'bg-green-100 text-green-800'
      case 'archived': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSessionColor = (colorName: string) => {
    const colors: Record<string, string> = {
      blue: '#3B82F6',
      green: '#10B981',
      orange: '#F97316',
      red: '#EF4444',
      purple: '#8B5CF6',
      cyan: '#06B6D4',
      lime: '#84CC16',
      amber: '#F59E0B'
    }
    return colors[colorName] || '#3B82F6'
  }

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    start.setMinutes(start.getMinutes() + start.getTimezoneOffset())
    end.setMinutes(end.getMinutes() + end.getTimezoneOffset())
    
    const startMonth = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const endMonth = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    
    return `${startMonth} - ${endMonth}`
  }

  const calculateSessionPosition = (startDate: string, endDate: string, sessionStart: Date, sessionEnd: Date) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    start.setMinutes(start.getMinutes() + start.getTimezoneOffset())
    end.setMinutes(end.getMinutes() + end.getTimezoneOffset())
    
    const totalDays = (sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60 * 60 * 24)
    const startDays = (start.getTime() - sessionStart.getTime()) / (1000 * 60 * 60 * 24)
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    
    const leftPercent = Math.max(0, (startDays / totalDays) * 100)
    const widthPercent = Math.min(100 - leftPercent, (duration / totalDays) * 100)
    
    return { left: `${leftPercent}%`, width: `${widthPercent}%` }
  }

  const generateMonthHeaders = (sessionStart: Date, sessionEnd: Date) => {
    const headers = []
    const current = new Date(sessionStart)
    current.setDate(1)
    
    let currentYear = current.getFullYear()
    const yearChangeIndices = []
    
    while (current <= sessionEnd) {
      const monthName = current.toLocaleDateString('en-US', { month: 'short' })
      const year = current.getFullYear()
      
      if (year !== currentYear || headers.length === 0) {
        yearChangeIndices.push({ index: headers.length, year: year })
        currentYear = year
      }
      
      headers.push({
        month: monthName,
        year: year,
        showYear: year !== currentYear || monthName === 'Jan'
      })
      
      current.setMonth(current.getMonth() + 1)
    }
    
    return { headers, yearChangeIndices }
  }

  const getCurrentDatePosition = (sessionStart: Date, sessionEnd: Date) => {
    const now = new Date()
    const totalDays = (sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60 * 60 * 24)
    const currentDays = (now.getTime() - sessionStart.getTime()) / (1000 * 60 * 60 * 24)
    
    if (currentDays < 0 || currentDays > totalDays) return null
    
    return (currentDays / totalDays) * 100
  }

  const renderTimelineView = () => {
    return (
      <div className="flex h-full">
        {/* Left Resizable Panel */}
        <div 
          className="bg-white border-r border-gray-200 flex-shrink-0" 
          style={{ width: leftPanelWidth }}
        >
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Sessions</h3>
          </div>
          
          <div className="overflow-y-auto">
            {sessionGroups.map((group, groupIndex) => {
              const parentSession = group.parentSessions[0]
              return (
                <div key={`${parentSession.id}-${groupIndex}`} className="border-b border-gray-100">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getSessionColor(parentSession.color) }}
                        />
                        <span className="font-medium text-gray-900 truncate">
                          {parentSession.name}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setShowStatusModal(showStatusModal === parentSession.id ? null : parentSession.id)}
                          className={`px-2 py-1 text-xs font-medium rounded-full cursor-pointer hover:opacity-80 ${getStatusBadgeColor(parentSession.status)}`}
                        >
                          {parentSession.status.toUpperCase()}
                        </button>
                        
                        <div className="relative">
                          <button
                            onClick={() => setShowDropdown(showDropdown === parentSession.id ? null : parentSession.id)}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          
                          {showDropdown === parentSession.id && (
                            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-32">
                              <button
                                onClick={() => handleEditSession(parentSession)}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                              >
                                <Edit className="h-4 w-4" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => {
                                  setShowDropdown(null)
                                  setShowDeleteConfirm(parentSession.id)
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
                    
                    <p className="text-xs text-gray-500 mb-2">
                      {formatDateRange(parentSession.start_date, parentSession.end_date)}
                    </p>
                    
                    {parentSession.children.map(child => (
                      <div key={child.id} className="ml-4 mb-2 text-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: getSessionColor(child.color) }}
                            />
                            <span className="text-gray-700 truncate">{child.name}</span>
                          </div>
                          
                          <button
                            onClick={() => setShowStatusModal(showStatusModal === child.id ? null : child.id)}
                            className={`px-1 py-0.5 text-xs rounded-full cursor-pointer hover:opacity-80 ${getStatusBadgeColor(child.status)}`}
                          >
                            {child.status.toUpperCase()}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Resize Handle */}
        <div
          className="w-1 bg-gray-200 cursor-col-resize hover:bg-gray-400 transition-colors"
          onMouseDown={(e) => {
            const startX = e.clientX
            const startWidth = leftPanelWidth
            
            const handleMouseMove = (e: MouseEvent) => {
              const newWidth = startWidth + (e.clientX - startX)
              setLeftPanelWidth(Math.max(250, Math.min(600, newWidth)))
            }
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove)
              document.removeEventListener('mouseup', handleMouseUp)
            }
            
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
          }}
        />

        {/* Right Timeline Area */}
        <div className="flex-1 bg-white overflow-x-auto">
          <div className="p-6">
            {sessionGroups.map((group, groupIndex) => {
              const parentSession = group.parentSessions[0]
              const sessionStart = new Date(parentSession.start_date)
              const sessionEnd = new Date(parentSession.end_date)
              
              sessionStart.setMinutes(sessionStart.getMinutes() + sessionStart.getTimezoneOffset())
              sessionEnd.setMinutes(sessionEnd.getMinutes() + sessionEnd.getTimezoneOffset())
              
              const { headers, yearChangeIndices } = generateMonthHeaders(sessionStart, sessionEnd)
              const currentDatePos = getCurrentDatePosition(sessionStart, sessionEnd)
              
              return (
                <div key={`${parentSession.id}-${groupIndex}`} className="mb-8 border border-gray-200 rounded-lg p-4">
                  {/* Year labels positioned above timeline */}
                  <div className="relative mb-2 h-6">
                    {yearChangeIndices.map(({ index, year }) => (
                      <div
                        key={`${year}-${index}`}
                        className="absolute text-sm font-semibold text-gray-600"
                        style={{
                          left: `${(index / Math.max(headers.length - 1, 1)) * 100}%`,
                          transform: 'translateX(-50%)'
                        }}
                      >
                        {year}
                      </div>
                    ))}
                  </div>
                  
                  {/* Month headers */}
                  <div className="grid gap-2 mb-4 text-xs text-gray-500" style={{
                    gridTemplateColumns: `repeat(${headers.length}, 1fr)`
                  }}>
                    {headers.map((header, index) => (
                      <div key={`${header.month}-${header.year}-${index}`} className="text-center font-medium">
                        {header.month}
                      </div>
                    ))}
                  </div>
                  
                  {/* Timeline */}
                  <div className="relative">
                    {/* Current Date Indicator */}
                    {currentDatePos !== null && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                        style={{ left: `${currentDatePos}%` }}
                      >
                        <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-full"></div>
                      </div>
                    )}
                    
                    {/* Parent Session Bar */}
                    <div className="relative h-8 bg-gray-100 rounded mb-4">
                      <div
                        className="absolute h-full rounded shadow-sm flex items-center justify-center text-white text-xs font-medium"
                        style={{
                          backgroundColor: getSessionColor(parentSession.color),
                          left: '0%',
                          width: '100%'
                        }}
                      >
                        <span className="truncate px-2">
                          {formatDateRange(parentSession.start_date, parentSession.end_date)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Child Sessions */}
                    <div className="space-y-2">
                      {parentSession.children.map(child => (
                        <div key={child.id} className="relative h-6 bg-gray-50 rounded">
                          <div
                            className="absolute h-full rounded shadow-sm flex items-center justify-center text-white text-xs font-medium"
                            style={{
                              backgroundColor: getSessionColor(child.color),
                              ...calculateSessionPosition(child.start_date, child.end_date, sessionStart, sessionEnd)
                            }}
                          >
                            <span className="truncate px-2">
                              {formatDateRange(child.start_date, child.end_date)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const renderMobileView = () => {
    const allSessions = sessions.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
    
    return (
      <div className="space-y-4">
        {allSessions.map(session => (
          <div key={session.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getSessionColor(session.color) }}
                  />
                  <h3 className="font-medium text-gray-900">{session.name}</h3>
                  <button
                    onClick={() => setShowStatusModal(showStatusModal === session.id ? null : session.id)}
                    className={`px-2 py-1 text-xs font-medium rounded-full cursor-pointer hover:opacity-80 ${getStatusBadgeColor(session.status)}`}
                  >
                    {session.status.toUpperCase()}
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  {formatDateRange(session.start_date, session.end_date)}
                </p>
              </div>
              
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(showDropdown === session.id ? null : session.id)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                
                {showDropdown === session.id && (
                  <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-32">
                    <button
                      onClick={() => handleEditSession(session)}
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
        ))}
      </div>
    )
  }

  useEffect(() => {
    fetchSessions()
    getCurrentUserRoles()
  }, [fetchSessions, getCurrentUserRoles])

  if (loading) {
    return (
      <AuthenticatedLayout pageTitle="Sessions">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="bg-white rounded-lg p-6 space-y-4">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout pageTitle="Sessions">
      <div className="h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">Manage your OKR sessions and time periods</p>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Session
          </button>
        </div>

        {/* Content */}
        {sessions.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions yet</h3>
            <p className="text-gray-500 mb-6">Create your first session to start organizing your OKRs.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Session
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 h-full">
            {isMobile ? renderMobileView() : renderTimelineView()}
          </div>
        )}

        {/* Status Change Modal */}
        {showStatusModal && isAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 max-w-sm w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Change Status</h3>
              <div className="space-y-2">
                {['open', 'in progress', 'archived'].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(showStatusModal, status)}
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100"
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowStatusModal(null)}
                className="mt-4 w-full px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Modals */}
        <CreateSessionModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            fetchSessions()
            setShowCreateModal(false)
          }}
        />

        {editingSession && (
          <EditSessionModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false)
              setEditingSession(null)
            }}
            onSuccess={() => {
              fetchSessions()
              setShowEditModal(false)
              setEditingSession(null)
            }}
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
      </div>
    </AuthenticatedLayout>
  )
}