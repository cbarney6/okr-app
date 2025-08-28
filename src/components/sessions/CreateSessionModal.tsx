'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { X } from 'lucide-react'

interface Session {
  id: string
  name: string
  start_date: string
  end_date: string
  status: string
}

interface CreateSessionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  getCurrentUserOrgId: () => Promise<string | null>
}

export default function CreateSessionModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  getCurrentUserOrgId 
}: CreateSessionModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    parent_session_id: '',
    color: '#3B82F6',
    cadence: 'weekly',
    cadence_day: 'monday',
    status: 'open'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [availableSessions, setAvailableSessions] = useState<Session[]>([])

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const colorOptions = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
    '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
  ]

  // Format date to prevent timezone offset display issues
  const formatDateForOption = (dateString: string) => {
    const date = new Date(dateString)
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset())
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  // Fetch available parent sessions when modal opens
  const fetchAvailableSessions = useCallback(async () => {
    try {
      const organizationId = await getCurrentUserOrgId()
      if (!organizationId) return

      const { data, error } = await supabase
        .from('sessions')
        .select('id, name, start_date, end_date, status')
        .eq('organization_id', organizationId)
        .in('status', ['open', 'in_progress']) // Only show active sessions
        .order('start_date', { ascending: false })

      if (error) {
        console.error('Error fetching sessions:', error)
        return
      }
      
      setAvailableSessions(data || [])
    } catch (error) {
      console.error('Error fetching available sessions:', error)
    }
  }, [supabase, getCurrentUserOrgId])

  useEffect(() => {
    if (isOpen) {
      fetchAvailableSessions()
    }
  }, [isOpen, fetchAvailableSessions])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const organizationId = await getCurrentUserOrgId()
      if (!organizationId) {
        setError('Unable to get organization information')
        return
      }

      const sessionData = {
        ...formData,
        organization_id: organizationId,
        parent_session_id: formData.parent_session_id || null,
        status: formData.status as 'open' | 'in_progress' | 'archived'
      }

      const { error: createError } = await supabase
        .from('sessions')
        .insert([sessionData])

      if (createError) {
        console.error('Session creation error:', createError)
        setError('Failed to create session')
        return
      }

      // Reset form and close modal
      setFormData({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        parent_session_id: '',
        color: '#3B82F6',
        cadence: 'weekly',
        cadence_day: 'monday',
        status: 'open'
      })
      setAvailableSessions([])
      
      onSuccess()
    } catch (error) {
      console.error('Error creating session:', error)
      setError('Failed to create session')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create New Session</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="Session name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="Optional description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parent Session
              </label>
              <select
                value={formData.parent_session_id}
                onChange={(e) => setFormData({ ...formData, parent_session_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="">No parent (top-level session)</option>
                {availableSessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.name} ({formatDateForOption(session.start_date)} - {formatDateForOption(session.end_date)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <div className="flex space-x-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === color ? 'border-gray-400 scale-110' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cadence
              </label>
              <select
                value={formData.cadence}
                onChange={(e) => setFormData({ ...formData, cadence: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="weekly">Weekly</option>
                <option value="every_two_weeks">Every Two Weeks</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Day of Week
              </label>
              <select
                value={formData.cadence_day}
                onChange={(e) => setFormData({ ...formData, cadence_day: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
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
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}