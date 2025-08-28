'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Target, Calendar, TrendingUp, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout'

interface DashboardMetrics {
  progress: number
  daysToDeadline: number
  objectives: number
  objectivesHit: number
  keyResults: number
  keyResultsHit: number
  keyResultsGoingWell: number
  keyResultsInDanger: number
  dynamicKeyResults: number
  manualKeyResults: number
}

interface Session {
  id: string
  name: string
  start_date: string
  end_date: string
  status: string
  parent_session_id?: string
}

interface MetricCardProps {
  title: string
  value: number | string
  subtitle: string
  color: 'blue' | 'orange' | 'green' | 'red'
  href?: string
}

const MetricCard = ({ title, value, subtitle, color, href }: MetricCardProps) => {
  const colorClasses = {
    blue: 'text-blue-600',
    orange: 'text-orange-600', 
    green: 'text-green-600',
    red: 'text-red-600'
  }

  const content = (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow group h-32">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className={`text-3xl font-bold mb-1 ${colorClasses[color]}`}>
            {value}
          </div>
          <div className="text-sm font-medium text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
            {title}
          </div>
        </div>
      </div>
      <div 
        className="text-xs text-gray-500 leading-tight"
        title={subtitle}
      >
        {subtitle.length > 80 ? `${subtitle.substring(0, 80)}...` : subtitle}
      </div>
    </div>
  )

  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : content
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    progress: 0,
    daysToDeadline: 0,
    objectives: 0,
    objectivesHit: 0,
    keyResults: 0,
    keyResultsHit: 0,
    keyResultsGoingWell: 0,
    keyResultsInDanger: 0,
    dynamicKeyResults: 0,
    manualKeyResults: 0
  })
  const [loading, setLoading] = useState(true)
  const [availableSessions, setAvailableSessions] = useState<Session[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Format date to prevent timezone offset display issues
  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    // Fix timezone offset to display actual dates
    start.setMinutes(start.getMinutes() + start.getTimezoneOffset())
    end.setMinutes(end.getMinutes() + end.getTimezoneOffset())
    
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  const fetchSessions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!profile?.organization_id) return

      // Fetch all sessions that are not archived
      const { data: sessions } = await supabase
        .from('sessions')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .in('status', ['open', 'in_progress'])
        .order('start_date', { ascending: true })

      if (sessions && sessions.length > 0) {
        setAvailableSessions(sessions)
        
        // Default to first in_progress session, or leave empty if none
        const defaultSession = sessions.find(s => s.status === 'in_progress')
        if (defaultSession) {
          setSelectedSessionId(defaultSession.id)
          setSelectedSession(defaultSession)
        } else {
          // No in_progress session, show empty state
          setSelectedSessionId('')
          setSelectedSession(null)
        }
      } else {
        // No sessions at all
        setAvailableSessions([])
        setSelectedSessionId('')
        setSelectedSession(null)
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
    }
  }, [supabase])

  const fetchMetrics = useCallback(async () => {
    try {
      // Always show metrics, even if no session or session is not in_progress
      let metricsData: DashboardMetrics = {
        progress: 0,
        daysToDeadline: 0,
        objectives: 0,
        objectivesHit: 0,
        keyResults: 0,
        keyResultsHit: 0,
        keyResultsGoingWell: 0,
        keyResultsInDanger: 0,
        dynamicKeyResults: 0,
        manualKeyResults: 0
      }

      // Only populate metrics if session is in_progress
      if (selectedSession && selectedSession.status === 'in_progress') {
        const endDate = new Date(selectedSession.end_date)
        const now = new Date()
        const diffTime = endDate.getTime() - now.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        const isParentSession = !selectedSession.parent_session_id
        
        metricsData = {
          progress: isParentSession ? 67 : 45,
          daysToDeadline: Math.max(0, diffDays),
          objectives: isParentSession ? 12 : 4,
          objectivesHit: isParentSession ? 3 : 1,
          keyResults: isParentSession ? 36 : 12,
          keyResultsHit: isParentSession ? 8 : 2,
          keyResultsGoingWell: isParentSession ? 20 : 7,
          keyResultsInDanger: isParentSession ? 8 : 3,
          dynamicKeyResults: isParentSession ? 18 : 6,
          manualKeyResults: isParentSession ? 18 : 6
        }
      }
      
      setMetrics(metricsData)
    } catch (error) {
      console.error('Error calculating metrics:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedSession])

  const handleSessionChange = (sessionId: string) => {
    setSelectedSessionId(sessionId)
    const session = availableSessions.find(s => s.id === sessionId)
    setSelectedSession(session || null)
  }

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  if (loading) {
    return (
      <AuthenticatedLayout pageTitle="Dashboard">
        <div className="px-6 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout pageTitle="Dashboard">
      <div className="px-6 py-8">
        {/* Session Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Session Filter
          </label>
          <div className="relative w-80">
            <select
              value={selectedSessionId}
              onChange={(e) => handleSessionChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 appearance-none"
            >
              <option value="">Select a session...</option>
              {availableSessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.name} ({formatDateRange(session.start_date, session.end_date)}) - {session.status === 'in_progress' ? 'In Progress' : 'Open'}
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
          </div>
        </div>

        {/* Current Session Info */}
        <div className="mb-8">
          {!selectedSession ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Current Session</h3>
                  <p className="text-gray-600">No active (In Progress) session has been selected</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-400">0%</div>
                  <div className="text-xs text-gray-500">Progress</div>
                </div>
              </div>
            </div>
          ) : (
            <div className={`border rounded-lg p-4 ${
              selectedSession.status === 'in_progress' 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-sm font-medium ${
                    selectedSession.status === 'in_progress' 
                      ? 'text-blue-900' 
                      : 'text-yellow-900'
                  }`}>Current Session</h3>
                  <p className={`${
                    selectedSession.status === 'in_progress' 
                      ? 'text-blue-800' 
                      : 'text-yellow-800'
                  }`}>{selectedSession.name} {selectedSession.status === 'open' ? '- Not Active' : ''}</p>
                  <p className={`text-xs ${
                    selectedSession.status === 'in_progress' 
                      ? 'text-blue-600' 
                      : 'text-yellow-600'
                  }`}>
                    {formatDateRange(selectedSession.start_date, selectedSession.end_date)}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${
                    selectedSession.status === 'in_progress' 
                      ? 'text-blue-900' 
                      : 'text-yellow-600'
                  }`}>{metrics.progress}%</div>
                  <div className={`text-xs ${
                    selectedSession.status === 'in_progress' 
                      ? 'text-blue-600' 
                      : 'text-yellow-600'
                  }`}>Progress</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Metrics Grid - Always Show */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <MetricCard
            title="Progress"
            value={metrics.progress}
            subtitle={`The mean progress of Objectives within the session (with 65.11% of time passed).`}
            color="blue"
            href="/okrs"
          />
          
          <MetricCard
            title="Days to deadline"
            value={metrics.daysToDeadline}
            subtitle={selectedSession ? `This session's deadline is ${formatDateRange(selectedSession.end_date, selectedSession.end_date).split(' - ')[1]}.` : "No session selected"}
            color="orange"
            href="/sessions"
          />
          
          <MetricCard
            title="Objectives"
            value={metrics.objectives}
            subtitle="Total number of Objectives within the session."
            color="blue"
            href="/okrs"
          />
          
          <MetricCard
            title="Objectives hit"
            value={metrics.objectivesHit}
            subtitle="Total number of Objectives achieved so far."
            color="green"
            href="/okrs"
          />
          
          <MetricCard
            title="Key Results"
            value={metrics.keyResults}
            subtitle="Total number of Key Results within the session."
            color="blue"
            href="/okrs"
          />
          
          <MetricCard
            title="Key Results hit"
            value={metrics.keyResultsHit}
            subtitle="Total number of Key Results achieved so far."
            color="green"
            href="/okrs"
          />
          
          <MetricCard
            title="Key Results going well"
            value={metrics.keyResultsGoingWell}
            subtitle="Total number of Key Results that are likely to be achieved."
            color="green"
            href="/okrs"
          />
          
          <MetricCard
            title="Key Results in danger"
            value={metrics.keyResultsInDanger}
            subtitle="Total number of Key Results that are not on track to be achieved."
            color="red"
            href="/okrs"
          />
          
          <MetricCard
            title="Dynamic Key Results"
            value={metrics.dynamicKeyResults}
            subtitle="Total number of Key Results that are automatically updated."
            color="blue"
            href="/okrs"
          />
          
          <MetricCard
            title="Manual Key Results"
            value={metrics.manualKeyResults}
            subtitle="Total number of Key Results that are manually updated."
            color="blue"
            href="/okrs"
          />
        </div>

        {/* Quick Actions - Always Show */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/okrs" className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Target className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <div className="font-medium text-gray-900">View OKRs</div>
                <div className="text-sm text-gray-500">Manage objectives and key results</div>
              </div>
            </Link>
            
            <Link href="/sessions" className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Calendar className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <div className="font-medium text-gray-900">Manage Sessions</div>
                <div className="text-sm text-gray-500">Create and organize time periods</div>
              </div>
            </Link>
            
            <Link href="/reports" className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <TrendingUp className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <div className="font-medium text-gray-900">View Reports</div>
                <div className="text-sm text-gray-500">Analyze performance and progress</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}