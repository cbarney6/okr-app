'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Plus, MoreHorizontal } from 'lucide-react'
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
  status: 'Open' | 'In Progress' | 'Archived'
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
  const [leftPanelWidth, setLeftPanelWidth] = useState(300) // Draggable width
  const [isResizing, setIsResizing] = useState(false)
  const [statusEditModal, setStatusEditModal] = useState<{session: Session, isOpen: boolean}>({ 
    session: {} as Session, 
    isOpen: false 
  })

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

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const newWidth = e.clientX
      if (newWidth >= 200 && newWidth <= 500) {
        setLeftPanelWidth(newWidth)
      }
    }

    const handleMouseUp = () => setIsResizing(false)

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  const organizeSessionsIntoGroups = (sessions: Session[]) => {
    const parentSessions = sessions.filter(s => !s.parent_session_id)
    const childSessions = sessions.filter(s => s.parent_session_id)

    // Sort parent sessions by start_date (newest first)
    parentSessions.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())

    const groups: SessionGroup[] = parentSessions.map(parent => {
      // Get child sessions for this parent and sort by start_date (ascending)
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
    current.setDate(1) // Start from first day of start month
    
    const yearChangeIndices = []
    let currentYear = current.getFullYear()
    let monthIndex = 0

    while (current <= sessionEnd) {
      // Check if year changed
      if (current.getFullYear() !== currentYear) {
        yearChangeIndices.push(monthIndex)
        currentYear = current.getFullYear()
      }

      headers.push({
        month: current.toLocaleDateString('en-US', { month: 'short' }),
        year: current.getFullYear(),
        isYearStart: current.getMonth() === 0 || monthIndex === 0
      })

      current.setMonth(current.getMonth() + 1)
      monthIndex++
    }

    return { headers, yearChangeIndices }
  }

  const calculateSessionPosition = (startDate: string, endDate: string, sessionStart: Date, sessionEnd: Date) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    start.setMinutes(start.getMinutes() + start.getTimezoneOffset())
    end.setMinutes(end.getMinutes() + end.getTimezoneOffset())
    sessionStart.setMinutes(sessionStart.getMinutes() + sessionStart.getTimezoneOffset())
    sessionEnd.setMinutes(sessionEnd.getMinutes() + sessionEnd.getTimezoneOffset())

    const totalDays = (sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60 * 60 * 24)
    const startOffset = Math.max(0, (start.getTime() - sessionStart.getTime()) / (1000 * 60 * 60 * 24))
    const sessionDuration = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)

    const leftPercent = (startOffset / totalDays) * 100
    const widthPercent = (sessionDuration / totalDays) * 100

    return { leftPercent, widthPercent }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-gray-100 text-gray-800'
      case 'In Progress': return 'bg-green-100 text-green-800'
      case 'Archived': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-gray-50'
      case 'In Progress': return 'bg-green-50'
      case 'Archived': return 'bg-red-50'
      default: return 'bg-gray-50'
    }
  }

  const handleStatusClick = (session: Session) => {
    if (currentUserRoles.includes('admin')) {
      setStatusEditModal({ session, isOpen: true })
    }
  }

  const handleStatusUpdate = async (newStatus: 'Open' | 'In Progress' | 'Archived') => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status: newStatus })
        .eq('id', statusEditModal.session.id)

      if (error) {
        console.error('Error updating session status:', error)
        return
      }

      // Refresh sessions
      await fetchSessions()
      setStatusEditModal({ session: {} as Session, isOpen: false })
    } catch (error) {
      console.error('Session update error:', error)
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
        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 flex items-start justify-center"
        style={{ left: `${position}%` }}
      >
        <div className="w-3 h-3 bg-red-500 rounded-full -mt-1.5"></div>
      </div>
    )
  }

  const renderTimelineView = () => {
    return (
      <div className="space-y-8">
        {sessionGroups.map((group, groupIndex) => {
          const parentSession = group.parentSession
          const sessionStart = new Date(parentSession.start_date)
          const sessionEnd = new Date(parentSession.end_date)
          const { headers } = generateMonthHeaders(sessionStart, sessionEnd)

          return (
            <div key={groupIndex} className={`border rounded-lg ${getStatusBgColor(parentSession.status)}`}>
              {/* Timeline Header */}
              <div className="relative">
                {/* Year Label - Centered above timeline */}
                <div className="text-center py-2 border-b border-gray-200">
                  <h3 className="text-base font-medium text-gray-900">
                    {sessionStart.getFullYear()}
                    {sessionStart.getFullYear() !== sessionEnd.getFullYear() && 
                      ` - ${sessionEnd.getFullYear()}`
                    }
                  </h3>
                </div>

                {/* Month Headers */}
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

                {/* Current Date Indicator */}
                {renderCurrentDateIndicator(sessionStart, sessionEnd)}
              </div>

              {/* Timeline Content */}
              <div className="p-4">
                {/* Parent Session */}
                <div className="flex items-center mb-4">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: parentSession.color }}></div>
                  <span className="ml-3 font-medium text-gray-900">{parentSession.name}</span>
                  <span 
                    className={`ml-2 px-2 py-1 text-xs font-medium rounded-full cursor-pointer ${getStatusColor(parentSession.status)}`}
                    onClick={() => handleStatusClick(parentSession)}
                  >
                    {parentSession.status}
                  </span>
                  
                  {/* Dropdown Menu */}
                  <div className="relative ml-auto">
                    <button 
                      className="p-1 rounded-md hover:bg-gray-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        // Toggle dropdown logic here
                      }}
                    >
                      <MoreHorizontal className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Parent Timeline Bar */}
                <div className="relative h-8 bg-white border rounded mb-4">
                  <div
                    className="absolute top-0 bottom-0 rounded flex items-center justify-center text-white text-sm font-medium"
                    style={{ 
                      left: '0%', 
                      width: '100%',
                      backgroundColor: parentSession.color 
                    }}
                  >
                    {`${new Date(parentSession.start_date).toLocaleDateString()} - ${new Date(parentSession.end_date).toLocaleDateString()}`}
                  </div>
                </div>

                {/* Child Sessions */}
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
                          {childSession.status}
                        </span>
                        
                        {/* Child Session Dropdown */}
                        <div className="relative ml-auto">
                          <button 
                            className="p-1 rounded-md hover:bg-gray-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              // Toggle dropdown logic here
                            }}
                          >
                            <MoreHorizontal className="h-4 w-4 text-gray-400" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="relative h-6 bg-white border rounded">
                        <div
                          className="absolute top-0 bottom-0 rounded flex items-center justify-center text-white text-xs font-medium"
                          style={{ 
                            left: `${position.leftPercent}%`, 
                            width: `${position.widthPercent}%`,
                            backgroundColor: childSession.color 
                          }}
                        >
                          {`${new Date(childSession.start_date).toLocaleDateString()} - ${new Date(childSession.end_date).toLocaleDateString()}`}
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
    )
  }

  const renderMobileView = () => {
    return (
      <div className="space-y-4">
        {sessions.map((session) => (
          <div key={session.id} className={`p-4 border rounded-lg ${getStatusBgColor(session.status)}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: session.color }}></div>
                <span className="font-medium text-gray-900">{session.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(session.status)}`}>
                  {session.status}
                </span>
                <button className="p-1 rounded-md hover:bg-gray-100">
                  <MoreHorizontal className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {new Date(session.start_date).toLocaleDateString()} - {new Date(session.end_date).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <AuthenticatedLayout pageTitle="Sessions">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
            <p className="text-gray-600">Manage your OKR sessions and time periods</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Session
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">Loading sessions...</div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12">
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
        ) : (
          <div className="flex">
            {/* Left Panel with Sessions List */}
            <div 
              className="border-r border-gray-200 bg-white"
              style={{ width: `${leftPanelWidth}px` }}
            >
              <div className="p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Sessions</h2>
                <div className="space-y-2">
                  {sessionGroups.map((group) => (
                    <div key={group.parentSession.id}>
                      {/* Parent Session */}
                      <div className="flex items-center p-2 rounded-md hover:bg-gray-50">
                        <div 
                          className="w-3 h-3 rounded mr-3" 
                          style={{ backgroundColor: group.parentSession.color }}
                        ></div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{group.parentSession.name}</div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(group.parentSession.status)}`}>
                          {group.parentSession.status}
                        </span>
                      </div>
                      
                      {/* Child Sessions */}
                      {group.childSessions.map((child) => (
                        <div key={child.id} className="flex items-center p-2 ml-6 rounded-md hover:bg-gray-50">
                          <div 
                            className="w-2 h-2 rounded mr-3" 
                            style={{ backgroundColor: child.color }}
                          ></div>
                          <div className="flex-1">
                            <div className="text-sm text-gray-700">{child.name}</div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(child.status)}`}>
                            {child.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Resize Handle */}
            <div 
              className="w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize"
              onMouseDown={handleMouseDown}
            ></div>

            {/* Right Panel with Timeline */}
            <div className="flex-1 p-4">
              {renderTimelineView()}
            </div>
          </div>
        )}

        {/* Status Edit Modal */}
        {statusEditModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Status</h3>
              <div className="space-y-3">
                {(['Open', 'In Progress', 'Archived'] as const).map((status) => (
                  <button
                    key={status}
                    className="w-full text-left p-3 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-900"
                    onClick={() => handleStatusUpdate(status)}
                  >
                    {status}
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

        {/* Modals */}
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
    </AuthenticatedLayout>
  )
}