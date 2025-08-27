'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Target, Calendar, TrendingUp, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface DashboardMetrics {
  totalObjectives: number
  activeKeyResults: number
  completionRate: number
  onTrack: number
  atRisk: number
  overdue: number
  keyResultsHit: number
  keyResultsGoingWell: number
  keyResultsInDanger: number
  dynamicKeyResults: number
  manualKeyResults: number
  progress: number
  daysToDeadline: number
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalObjectives: 0,
    activeKeyResults: 0,
    completionRate: 0,
    onTrack: 0,
    atRisk: 0,
    overdue: 0,
    keyResultsHit: 0,
    keyResultsGoingWell: 0,
    keyResultsInDanger: 0,
    dynamicKeyResults: 0,
    manualKeyResults: 0,
    progress: 0,
    daysToDeadline: 0
  })
  const [loading, setLoading] = useState(true)
  const [currentSession, setCurrentSession] = useState<string>('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchDashboardMetrics = useCallback(async () => {
    try {
      setLoading(true)
      
      // Get current active session (most recent open session)
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('status', 'open')
        .order('start_date', { ascending: false })
        .limit(1)

      if (sessionsError) throw sessionsError

      const activeSession = sessions?.[0]
      if (activeSession) {
        setCurrentSession(activeSession.name)
        
        // Calculate days to deadline
        const endDate = new Date(activeSession.end_date)
        const today = new Date()
        const timeDiff = endDate.getTime() - today.getTime()
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24))
        
        // For now, set mock data based on your image
        // In a real implementation, these would be calculated from objectives and key_results tables
        setMetrics({
          totalObjectives: 4,
          activeKeyResults: 2,
          completionRate: 0, // 0%
          onTrack: 0,
          atRisk: 2,
          overdue: 0,
          keyResultsHit: 0,
          keyResultsGoingWell: 0,
          keyResultsInDanger: 2,
          dynamicKeyResults: 0,
          manualKeyResults: 2,
          progress: 7, // 7% with 65.11% of time passed
          daysToDeadline: Math.max(0, daysDiff)
        })
      } else {
        // No active session
        setMetrics({
          totalObjectives: 0,
          activeKeyResults: 0,
          completionRate: 0,
          onTrack: 0,
          atRisk: 0,
          overdue: 0,
          keyResultsHit: 0,
          keyResultsGoingWell: 0,
          keyResultsInDanger: 0,
          dynamicKeyResults: 0,
          manualKeyResults: 0,
          progress: 0,
          daysToDeadline: 0
        })
      }
      
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchDashboardMetrics()
  }, [fetchDashboardMetrics])

  const MetricCard = ({ 
    title, 
    value, 
    subtitle, 
    color = 'blue',
    href
  }: { 
    title: string
    value: string | number
    subtitle: string
    color?: 'blue' | 'green' | 'orange' | 'red' | 'purple'
    href?: string
  }) => {
    const getColorClasses = () => {
      switch (color) {
        case 'green': return 'text-green-600'
        case 'orange': return 'text-orange-600'
        case 'red': return 'text-red-600'
        case 'purple': return 'text-purple-600'
        case 'blue': return 'text-blue-600'
        default: return 'text-gray-600'
      }
    }

    const card = (
      <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
        <div className={`text-3xl font-bold mb-2 ${getColorClasses()}`}>
          {typeof value === 'number' && title.includes('%') ? `${value}%` : value}
        </div>
        <div className="text-sm font-medium text-gray-900 mb-1">{title}</div>
        <div className="text-xs text-gray-500">{subtitle}</div>
      </div>
    )

    return href ? <Link href={href}>{card}</Link> : card
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg border">
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          {currentSession && (
            <p className="text-gray-600 mt-1">Current session: {currentSession}</p>
          )}
        </div>

        {currentSession ? (
          <div className="space-y-6">
            {/* Top Row - Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <MetricCard
                title="Progress"
                value={metrics.progress}
                subtitle="The mean progress of Objectives within the session (with 65.11% of time passed)."
                color="blue"
              />
              
              <MetricCard
                title="Days to deadline"
                value={metrics.daysToDeadline}
                subtitle={`This session's deadline is ${new Date(Date.now() + metrics.daysToDeadline * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}.`}
                color="orange"
              />
              
              <MetricCard
                title="Objectives"
                value={metrics.totalObjectives}
                subtitle="Total number of Objectives within the session."
                color="blue"
                href="/okrs"
              />
              
              <MetricCard
                title="Objectives hit"
                value={metrics.onTrack}
                subtitle="Total number of Objectives achieved so far."
                color="green"
                href="/okrs"
              />
              
              <MetricCard
                title="Key Results"
                value={metrics.activeKeyResults}
                subtitle="Total number of Key Results within the session."
                color="blue"
                href="/okrs"
              />
            </div>

            {/* Bottom Row - Key Results Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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

            {/* Quick Actions */}
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
        ) : (
          // No active session state
          <div className="bg-white rounded-lg p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Session</h3>
            <p className="text-gray-500 mb-6">Create or activate a session to start tracking your OKRs.</p>
            <Link 
              href="/sessions"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Manage Sessions
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}