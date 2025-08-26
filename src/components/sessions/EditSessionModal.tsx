'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { X } from 'lucide-react'

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
}

interface EditSessionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  session: Session
}

export default function EditSessionModal({ isOpen, onClose, onSuccess, session }: EditSessionModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [parentSession, setParentSession] = useState('')
  const [color, setColor] = useState('blue')
  const [cadence, setCadence] = useState('weekly')
  const [cadenceDay, setCadenceDay] = useState('monday')
  const [status, setStatus] = useState('open')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

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

  const statuses = [
    { value: 'open', label: 'Open' },
    { value: 'closed', label: 'Closed' },
    { value: 'on-hold', label: 'On Hold' }
  ]

  // Populate form with session data when modal opens
  useEffect(() => {
    if (isOpen && session) {
      setName(session.name)
      setDescription(session.description || '')
      setStartDate(session.start_date)
      setEndDate(session.end_date)
      setParentSession(session.parent_session_id || '')
      setColor(session.color)
      setCadence(session.cadence)
      setCadenceDay(session.cadence_day || 'monday')
      setStatus(session.status)
    }
  }, [isOpen, session])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const sessionData = {
        name,
        description: description || null,
        start_date: startDate,
        end_date: endDate,
        parent_session_id: parentSession || null,
        color,
        cadence,
        cadence_day: cadence === 'weekly' || cadence === 'bi-weekly' ? cadenceDay : null,
        status,
      }

      const { error: updateError } = await supabase
        .from('sessions')
        .update(sessionData)
        .eq('id', session.id)

      if (updateError) throw updateError

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Session update error:', err)
      setError(err instanceof Error ? err.message : 'Failed to update session')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900" style={{ color: '#111827', fontWeight: '700' }}>Edit Session</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label htmlFor="edit-session-name" className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              id="edit-session-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Q1 2025"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500 text-gray-900"
              required
            />
          </div>

          <div>
            <label htmlFor="edit-session-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="edit-session-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500 text-gray-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-start-date" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                id="edit-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                required
              />
            </div>
            <div>
              <label htmlFor="edit-end-date" className="block text-sm font-medium text-gray-700 mb-1">
                End Date *
              </label>
              <input
                id="edit-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="edit-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              {statuses.map((statusOption) => (
                <option key={statusOption.value} value={statusOption.value}>
                  {statusOption.label}
                </option>
              ))}
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
            <label htmlFor="edit-cadence" className="block text-sm font-medium text-gray-700 mb-1">
              Cadence
            </label>
            <select
              id="edit-cadence"
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
              <label htmlFor="edit-day-of-week" className="block text-sm font-medium text-gray-700 mb-1">
                Day of Week
              </label>
              <select
                id="edit-day-of-week"
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
              {loading ? 'Updating...' : 'Update Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}