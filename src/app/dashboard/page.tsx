'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Target, Calendar, TrendingUp } from 'lucide-react'
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
  const [currentSession, setCurrentSession] = useState<string>('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchMetrics = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!profile?.organization_id) return

      // Get current active session
      const { data: sessions } = await supabase
        .from('sessions')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('status', 'in-progress')
        .order('start_date', { ascending: false })
        .limit(1)

      if (sessions && sessions.length > 0) {
        const session = sessions[0]
        setCurrentSession(`${session.name}`)
        
        // Calculate days to deadline
        const endDate = new Date(session.end_date)
        const now = new Date()
        const diffTime = endDate.getTime() - now.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        // Mock metrics data - in real app, fetch from OKR tables
        setMetrics({
          progress: 7,
          daysToDeadline: Math.max(0, diffDays),
          objectives: 4,
          objectivesHit: 0,
          keyResults: 2,
          keyResultsHit: 0,
          keyResultsGoingWell: 0,
          keyResultsInDanger: 2,
          dynamicKeyResults: 0,
          manualKeyResults: 2
        })
      } else {
        // No active session
        setCurrentSession('')
        setMetrics({
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
      }
    } catch (error) {
      console.error('Error fetching metrics:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

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
        {currentSession && (
          <div className="mb-6">
            <div className="text-sm text-gray-600">Current session: {currentSession}</div>
          </div>
        )}

        {currentSession ? (
          <div className="space-y-8">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
                subtitle={`This session's deadline is December 31, 2025.`}
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
          <div className="bg-white rounded-lg p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="h-8 w-8 text-gray-400" />
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
    </AuthenticatedLayout>
  )
}