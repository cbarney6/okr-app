'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface CreateSessionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateSessionModal({ isOpen, onClose, onSuccess }: CreateSessionModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [parentSession, setParentSession] = useState('')
  const [color, setColor] = useState('blue')
  const [cadence, setCadence] = useState('weekly')
  const [cadenceDay, setCadenceDay] = useState('monday')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Fix timezone offset issue with HTML date inputs
  const adjustDateForTimezone = (dateString: string) => {
    if (!dateString) return dateString
    const date = new Date(dateString + 'T00:00:00')
    return date.toISOString().split('T')[0]
  }

  const colors = [
    { name: 'blue', hex: '#3B82F6' },
    { name: 'green', hex: '#10B981' },
    { name: 'orange', hex: '#F97316' },
    { name: 'red', hex: '#EF4444' },
    { name: 'purple', hex: '#8B5CF6' },
    { name: 'cyan', hex: '#06B6D4' },
    { name: 'lime', hex: '#84CC16' },
    { name: 'amber', hex: '#F59E0B' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('Authentication required')
      }

      // Get or create organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      let organizationId = profile?.organization_id

      if (!organizationId) {
        // Create organization for new user
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: `${user.email?.split('@')[0]}'s Organization`,
            slug: user.email?.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'org',
            created_by: user.id
          })
          .select()
          .single()

        if (orgError) throw orgError
        organizationId = orgData.id

        // Update profile with organization
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ organization_id: organizationId })
          .eq('id', user.id)

        if (profileError) throw profileError
      }

      // Create session with timezone-adjusted dates
      const sessionData = {
        name,
        description: description || null,
        start_date: adjustDateForTimezone(startDate),
        end_date: adjustDateForTimezone(endDate),
        parent_session_id: parentSession || null,
        color,
        cadence,
        cadence_day: cadence === 'weekly' || cadence === 'bi-weekly' ? cadenceDay : null,
        status: 'open',
        organization_id: organizationId,
        created_by: user.id
      }

      const { error: sessionError } = await supabase
        .from('sessions')
        .insert(sessionData)

      if (sessionError) throw sessionError

      // Reset form
      setName('')
      setDescription('')
      setStartDate('')
      setEndDate('')
      setParentSession('')
      setColor('blue')
      setCadence('weekly')
      setCadenceDay('monday')

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Session creation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create session')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900" style={{ color: '#111827', fontWeight: '700' }}>Create New Session</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="session-name" className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              id="session-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Q1 2025"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500 text-gray-900"
              required
            />
          </div>

          <div>
            <label htmlFor="session-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="session-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500 text-gray-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                required
              />
            </div>
            <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
                End Date *
              </label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="parent-session" className="block text-sm font-medium text-gray-700 mb-1">
              Parent Session
            </label>
            <select
              id="parent-session"
              value={parentSession}
              onChange={(e) => setParentSession(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="" className="text-gray-500">No parent (top-level session)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="flex space-x-2">
              {colors.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(c.name)}
                  className={`w-8 h-8 rounded-full ${
                    color === c.name ? 'ring-2 ring-gray-400' : ''
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="cadence-select" className="block text-sm font-medium text-gray-700 mb-1">
              Cadence
            </label>
            <select
              id="cadence-select"
              value={cadence}
              onChange={(e) => setCadence(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="weekly">Weekly</option>
              <option value="bi-weekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {(cadence === 'weekly' || cadence === 'bi-weekly') && (
            <div>
              <label htmlFor="day-of-week" className="block text-sm font-medium text-gray-700 mb-1">
                Day of Week
              </label>
              <select
                id="day-of-week"
                value={cadenceDay}
                onChange={(e) => setCadenceDay(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="monday">Monday</option>
                <option value="tuesday">Tuesday</option>
                <option value="wednesday">Wednesday</option>
                <option value="thursday">Thursday</option>
                <option value="friday">Friday</option>
                <option value="saturday">Saturday</option>
                <option value="sunday">Sunday</option>
              </select>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}