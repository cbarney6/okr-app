'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { X, ChevronDown, ChevronUp } from 'lucide-react'

interface Profile {
  id: string
  full_name: string
  email: string
}

interface Objective {
  id: string
  title: string
}

interface CreateKeyResultModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  getCurrentUserOrgId: () => Promise<string | null>
  preselectedObjectiveId?: string
}

export default function CreateKeyResultModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  getCurrentUserOrgId,
  preselectedObjectiveId
}: CreateKeyResultModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    key_result_type: 'should_increase_to',
    unit: '',
    target_value: '',
    initial_value: '',
    description: '',
    owner_id: '',
    deadline: '',
    objective_id: preselectedObjectiveId || ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([])
  const [availableObjectives, setAvailableObjectives] = useState<Objective[]>([])

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const keyResultTypes = [
    { value: 'should_increase_to', label: 'Should increase to' },
    { value: 'should_decrease_to', label: 'Should decrease to' },
    { value: 'should_stay_above', label: 'Should stay above' },
    { value: 'should_stay_below', label: 'Should stay below' },
    { value: 'achieved_or_not', label: 'Achieved or not (100%/0%)' }
  ]

  const unitOptions = [
    { value: '', label: 'Not set' },
    { value: 'percentage', label: 'Percentage (%)' },
    { value: 'usd', label: 'US dollar ($)' },
    { value: 'gbp', label: 'British pound (£)' },
    { value: 'eur', label: 'Euro (€)' },
    { value: 'custom', label: 'Create a custom unit' }
  ]

  // Fetch available data when modal opens
  const fetchAvailableData = useCallback(async () => {
    try {
      const organizationId = await getCurrentUserOrgId()
      if (!organizationId) return

      // Fetch users in organization
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('organization_id', organizationId)
        .order('full_name')

      if (!usersError) {
        setAvailableUsers(users || [])
      }

      // Fetch existing objectives
      const { data: objectives, error: objectivesError } = await supabase
        .from('objectives')
        .select('id, title')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('title')

      if (!objectivesError) {
        setAvailableObjectives(objectives || [])
      }

    } catch (error) {
      console.error('Error fetching available data:', error)
    }
  }, [supabase, getCurrentUserOrgId])

  useEffect(() => {
    if (isOpen) {
      fetchAvailableData()
      if (preselectedObjectiveId) {
        setFormData(prev => ({ ...prev, objective_id: preselectedObjectiveId }))
      }
    }
  }, [isOpen, fetchAvailableData, preselectedObjectiveId])

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

      const keyResultData = {
        title: formData.title,
        description: formData.description,
        objective_id: formData.objective_id,
        target_value: parseFloat(formData.target_value),
        initial_value: parseFloat(formData.initial_value) || 0,
        current_value: parseFloat(formData.initial_value) || 0,
        unit: formData.unit,
        key_result_type: formData.key_result_type,
        confidence_level: 'medium',
        owner_id: formData.owner_id,
        deadline: formData.deadline || null,
        tags: [],
        organization_id: organizationId
      }

      const response = await fetch('/api/key-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(keyResultData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to create key result')
        return
      }

      // Reset form and close modal
      setFormData({
        title: '',
        key_result_type: 'should_increase_to',
        unit: '',
        target_value: '',
        initial_value: '',
        description: '',
        owner_id: '',
        deadline: '',
        objective_id: preselectedObjectiveId || ''
      })
      setAvailableUsers([])
      setAvailableObjectives([])
      
      onSuccess()
    } catch (error) {
      console.error('Error creating key result:', error)
      setError('Failed to create key result')
    } finally {
      setLoading(false)
    }
  }

  const showTargetInitialFields = ['should_increase_to', 'should_decrease_to'].includes(formData.key_result_type)
  const showTargetOnlyField = ['should_stay_above', 'should_stay_below', 'achieved_or_not'].includes(formData.key_result_type)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create Key Result</h2>
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
                Title*
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Key Result name"
              />
              <div className="text-right text-xs text-gray-500 mt-1">
                {formData.title.length}/255
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Key Result type
              </label>
              <div className="relative">
                <select
                  value={formData.key_result_type}
                  onChange={(e) => setFormData({ ...formData, key_result_type: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  {keyResultTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit
              </label>
              <div className="relative">
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  {unitOptions.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {showTargetInitialFields && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target number*
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.target_value}
                      onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter target number"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex flex-col">
                      <ChevronUp className="h-3 w-3 text-gray-400" />
                      <ChevronDown className="h-3 w-3 text-gray-400" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Initial number*
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.initial_value}
                      onChange={(e) => setFormData({ ...formData, initial_value: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter initial number"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex flex-col">
                      <ChevronUp className="h-3 w-3 text-gray-400" />
                      <ChevronDown className="h-3 w-3 text-gray-400" />
                    </div>
                  </div>
                </div>
              </>
            )}

            {showTargetOnlyField && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target number*
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.target_value}
                    onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter target number"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex flex-col">
                    <ChevronUp className="h-3 w-3 text-gray-400" />
                    <ChevronDown className="h-3 w-3 text-gray-400" />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter a description for this Key Result"
              />
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
                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
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
              <div className="text-xs text-gray-500 mt-1">
                Key Results can be assigned to multiple people and/or teams.
              </div>
            </div>

            {!preselectedObjectiveId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Objective*
                </label>
                <div className="relative">
                  <select
                    required
                    value={formData.objective_id}
                    onChange={(e) => setFormData({ ...formData, objective_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                  >
                    <option value="">Select objective</option>
                    {availableObjectives.map((objective) => (
                      <option key={objective.id} value={objective.id}>
                        {objective.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deadline
              </label>
              <div className="relative">
                <select
                  value={formData.deadline ? 'custom' : ''}
                  onChange={(e) => {
                    if (e.target.value === '') {
                      setFormData({ ...formData, deadline: '' })
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  <option value="">No custom deadline</option>
                  <option value="custom">Set custom deadline</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
              {formData.deadline !== '' && (
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
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
              {loading ? 'Adding...' : 'Add Key Result'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}