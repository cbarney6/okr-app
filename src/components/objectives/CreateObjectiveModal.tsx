'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { X, ChevronDown } from 'lucide-react'

interface Session {
  id: string
  name: string
  start_date: string
  end_date: string
  status: string
  color: string
}

interface Profile {
  id: string
  full_name: string
  email: string
}

interface Objective {
  id: string
  title: string
}

interface KeyResult {
  id: string
  title: string
  objective_id: string
}

interface CreateObjectiveModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  getCurrentUserOrgId: () => Promise<string | null>
}

export default function CreateObjectiveModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  getCurrentUserOrgId 
}: CreateObjectiveModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    session_id: '',
    owner_id: '',
    parent_objective_id: '',
    parent_key_result_id: '',
    parent_type: '' // 'objective' or 'key_result' or ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [availableSessions, setAvailableSessions] = useState<Session[]>([])
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([])
  const [availableObjectives, setAvailableObjectives] = useState<Objective[]>([])
  const [availableKeyResults, setAvailableKeyResults] = useState<KeyResult[]>([])

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )


  // Fetch available data when modal opens
  const fetchAvailableData = useCallback(async () => {
    try {
      const organizationId = await getCurrentUserOrgId()
      if (!organizationId) return

      // Fetch sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, name, start_date, end_date, status, color')
        .eq('organization_id', organizationId)
        .in('status', ['open', 'in_progress'])
        .order('start_date', { ascending: false })

      if (!sessionsError) {
        setAvailableSessions(sessions || [])
      }

      // Fetch users in organization
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('organization_id', organizationId)
        .order('full_name')

      if (!usersError) {
        setAvailableUsers(users || [])
      }

      // Fetch existing objectives for parent selection
      const { data: objectives, error: objectivesError } = await supabase
        .from('objectives')
        .select('id, title')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('title')

      if (!objectivesError) {
        setAvailableObjectives(objectives || [])
      }

      // Fetch existing key results for parent selection
      const { data: keyResults, error: keyResultsError } = await supabase
        .from('key_results')
        .select('id, title, objective_id')
        .eq('organization_id', organizationId)
        .order('title')

      if (!keyResultsError) {
        setAvailableKeyResults(keyResults || [])
      }

    } catch (error) {
      console.error('Error fetching available data:', error)
    }
  }, [supabase, getCurrentUserOrgId])

  useEffect(() => {
    if (isOpen) {
      fetchAvailableData()
    }
  }, [isOpen, fetchAvailableData])

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

      const objectiveData = {
        title: formData.title,
        session_id: formData.session_id,
        owner_id: formData.owner_id,
        organization_id: organizationId,
        parent_objective_id: formData.parent_type === 'objective' ? formData.parent_objective_id || null : null,
        parent_key_result_id: formData.parent_type === 'key_result' ? formData.parent_key_result_id || null : null,
        tags: [],
        okr_design_score: 0,
        status: 'active'
      }

      const response = await fetch('/api/objectives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(objectiveData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to create objective')
        return
      }

      // Reset form and close modal
      setFormData({
        title: '',
        session_id: '',
        owner_id: '',
        parent_objective_id: '',
        parent_key_result_id: '',
        parent_type: ''
      })
      setAvailableSessions([])
      setAvailableUsers([])
      setAvailableObjectives([])
      setAvailableKeyResults([])
      
      onSuccess()
    } catch (error) {
      console.error('Error creating objective:', error)
      setError('Failed to create objective')
    } finally {
      setLoading(false)
    }
  }

  const handleParentChange = (type: string, value: string) => {
    setFormData({
      ...formData,
      parent_type: type,
      parent_objective_id: type === 'objective' ? value : '',
      parent_key_result_id: type === 'key_result' ? value : ''
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create Objective</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4 text-sm text-gray-600">
            All required fields are marked with an asterisk (*).
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session*
              </label>
              <div className="relative">
                <select
                  required
                  value={formData.session_id}
                  onChange={(e) => setFormData({ ...formData, session_id: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  <option value="">Select a session</option>
                  {availableSessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                {/* Color indicator for selected session */}
                {formData.session_id && (
                  <div 
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 w-3 h-3 rounded-full"
                    style={{ 
                      backgroundColor: availableSessions.find(s => s.id === formData.session_id)?.color || '#3B82F6'
                    }}
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title*
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Objective title"
              />
              <div className="text-right text-xs text-gray-500 mt-1">
                {formData.title.length}/255
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner*
              </label>
              <div className="relative">
                <select
                  required
                  value={formData.owner_id}
                  onChange={(e) => setFormData({ ...formData, owner_id: e.target.value })}
                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  <option value="">Select owner</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                {/* Avatar for selected owner */}
                {formData.owner_id && (
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                    {(() => {
                      const user = availableUsers.find(u => u.id === formData.owner_id)
                      if (!user) return 'U'
                      const names = user.full_name?.split(' ') || [user.email]
                      return names.length > 1 
                        ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
                        : names[0].substring(0, 2).toUpperCase()
                    })()}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parent
              </label>
              <div className="relative">
                <select
                  value={
                    formData.parent_type === 'objective' ? `objective:${formData.parent_objective_id}` :
                    formData.parent_type === 'key_result' ? `key_result:${formData.parent_key_result_id}` : ''
                  }
                  onChange={(e) => {
                    if (!e.target.value) {
                      handleParentChange('', '')
                    } else {
                      const [type, id] = e.target.value.split(':')
                      handleParentChange(type, id)
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  <option value="">Select Objective or Key Result</option>
                  <optgroup label="Objectives">
                    {availableObjectives.map((objective) => (
                      <option key={objective.id} value={`objective:${objective.id}`}>
                        🎯 {objective.title}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Key Results">
                    {availableKeyResults.map((keyResult) => (
                      <option key={keyResult.id} value={`key_result:${keyResult.id}`}>
                        📊 {keyResult.title}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-blue-600 bg-white border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Creating...' : 'Create Objective'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}