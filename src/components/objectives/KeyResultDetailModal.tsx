'use client'

import { useState, useEffect } from 'react'
import { X, Edit2, Save, AlertCircle } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

interface KeyResultDetailModalProps {
  isOpen: boolean
  onClose: () => void
  keyResultId: string | null
  onSave?: () => void
}

interface KeyResultData {
  id: string
  title: string
  description: string
  target_value: number
  initial_value: number
  current_value: number
  unit: string
  key_result_type: string
  confidence_level: string
  deadline: string | null
  tags: string[]
  created_at: string
  updated_at: string
  owner: {
    id: string
    full_name: string
    email: string
  }
  objective: {
    id: string
    title: string
    session_id: string
  }
}

interface CheckIn {
  id: string
  value: number
  notes: string | null
  created_at: string
  user: {
    id: string
    full_name: string
    email: string
  }
}

export default function KeyResultDetailModal({ 
  isOpen, 
  onClose, 
  keyResultId,
  onSave
}: KeyResultDetailModalProps) {
  const [keyResult, setKeyResult] = useState<KeyResultData | null>(null)
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    target_value: 0,
    current_value: 0,
    unit: 'number',
    key_result_type: 'should_increase_to',
    confidence_level: 'medium',
    tags: [] as string[]
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchKeyResultData = async () => {
    if (!keyResultId) return

    setLoading(true)
    setError('')

    try {
      const { data: keyResultData, error: krError } = await supabase
        .from('key_results')
        .select(`
          *,
          owner:profiles!owner_id(id, full_name, email),
          objective:objectives!objective_id(id, title, session_id)
        `)
        .eq('id', keyResultId)
        .single()

      if (krError) throw krError

      setKeyResult(keyResultData)
      setEditForm({
        title: keyResultData.title,
        description: keyResultData.description || '',
        target_value: keyResultData.target_value,
        current_value: keyResultData.current_value,
        unit: keyResultData.unit,
        key_result_type: keyResultData.key_result_type,
        confidence_level: keyResultData.confidence_level,
        tags: keyResultData.tags || []
      })

      const { data: checkInsData, error: ciError } = await supabase
        .from('check_ins')
        .select(`
          *,
          user:profiles!user_id(id, full_name, email)
        `)
        .eq('key_result_id', keyResultId)
        .order('created_at', { ascending: false })

      if (ciError) throw ciError

      setCheckIns(checkInsData || [])
    } catch (err) {
      console.error('Error fetching key result data:', err)
      setError('Failed to load key result details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && keyResultId) {
      fetchKeyResultData()
    }
  }, [isOpen, keyResultId])

  const calculateProgress = () => {
    if (!keyResult) return 0

    let progress = 0
    const { key_result_type, current_value, initial_value, target_value } = keyResult

    if (key_result_type === 'should_increase_to' && target_value > initial_value) {
      progress = Math.min(100, Math.max(0, ((current_value - initial_value) / (target_value - initial_value)) * 100))
    } else if (key_result_type === 'should_decrease_to' && initial_value > target_value) {
      progress = Math.min(100, Math.max(0, ((initial_value - current_value) / (initial_value - target_value)) * 100))
    } else if (key_result_type === 'should_stay_above') {
      progress = current_value >= target_value ? 100 : 0
    } else if (key_result_type === 'should_stay_below') {
      progress = current_value <= target_value ? 100 : 0
    } else if (key_result_type === 'achieved_or_not') {
      progress = current_value >= target_value ? 100 : 0
    }

    return Math.round(progress)
  }

  const formatValue = (value: number, unit: string) => {
    if (unit === 'percentage') return `${value}%`
    if (unit === 'usd') return `$${value.toLocaleString()}`
    if (unit === 'gbp') return `£${value.toLocaleString()}`
    if (unit === 'eur') return `€${value.toLocaleString()}`
    return value.toLocaleString()
  }

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getKeyResultTypeLabel = (type: string) => {
    switch (type) {
      case 'should_increase_to': return 'Should increase to'
      case 'should_decrease_to': return 'Should decrease to'
      case 'should_stay_above': return 'Should stay above'
      case 'should_stay_below': return 'Should stay below'
      case 'achieved_or_not': return 'Achieved or not'
      default: return type
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleSave = async () => {
    if (!keyResult) return
    
    setSaving(true)
    setError('')
    
    try {
      const response = await fetch(`/api/key-results/${keyResult.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save key result')
      }
      
      setIsEditing(false)
      if (onSave) {
        onSave()
      }
      onClose()
    } catch (err) {
      console.error('Error saving key result:', err)
      setError(err instanceof Error ? err.message : 'Failed to save key result')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (keyResult) {
      setEditForm({
        title: keyResult.title,
        description: keyResult.description || '',
        target_value: keyResult.target_value,
        current_value: keyResult.current_value,
        unit: keyResult.unit,
        key_result_type: keyResult.key_result_type,
        confidence_level: keyResult.confidence_level,
        tags: keyResult.tags || []
      })
    }
    setIsEditing(false)
    setError('')
  }

  const addTag = (tag: string) => {
    if (tag.trim() && !editForm.tags.includes(tag.trim())) {
      setEditForm(prev => ({
        ...prev,
        tags: [...prev.tags, tag.trim()]
      }))
    }
  }

  const removeTag = (index: number) => {
    setEditForm(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {loading ? 'Loading...' : keyResult?.title || 'Key Result Details'}
          </h2>
          <div className="flex items-center space-x-2">
            {!loading && keyResult && (
              <button
                onClick={() => isEditing ? handleCancel() : setIsEditing(true)}
                className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-blue-600 transition-colors"
              >
                {isEditing ? (
                  <>
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </>
                ) : (
                  <>
                    <Edit2 className="h-4 w-4" />
                    <span>Edit</span>
                  </>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="text-gray-500">Loading key result details...</div>
            </div>
          ) : keyResult ? (
            <div className="space-y-6">
              {/* Edit Mode Alert */}
              {isEditing && (
                <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  <span className="text-sm text-blue-800">You are now editing this key result. Make your changes and click Save to update.</span>
                </div>
              )}
              {/* Title */}
              {isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter key result title"
                  />
                </div>
              )}
              
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                      {keyResult.owner?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                    </div>
                    <span className="text-gray-900">{keyResult.owner?.full_name || keyResult.owner?.email}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parent Objective</label>
                  <div className="text-gray-900">
                    🎯 {keyResult.objective?.title}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <div className="text-gray-900">
                    {getKeyResultTypeLabel(keyResult.key_result_type)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confidence Level</label>
                  {isEditing ? (
                    <select
                      value={editForm.confidence_level}
                      onChange={(e) => setEditForm(prev => ({ ...prev, confidence_level: e.target.value }))}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(keyResult.confidence_level)}`}>
                      {keyResult.confidence_level.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                {isEditing ? (
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter key result description"
                  />
                ) : (
                  <div className="text-gray-900">
                    {keyResult.description || <span className="text-gray-500 italic">No description provided</span>}
                  </div>
                )}
              </div>

              {/* Edit Form Fields */}
              {isEditing && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={editForm.key_result_type}
                      onChange={(e) => setEditForm(prev => ({ ...prev, key_result_type: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="should_increase_to">Should increase to</option>
                      <option value="should_decrease_to">Should decrease to</option>
                      <option value="should_stay_above">Should stay above</option>
                      <option value="should_stay_below">Should stay below</option>
                      <option value="achieved_or_not">Achieved or not</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                    <select
                      value={editForm.unit}
                      onChange={(e) => setEditForm(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="number">Number</option>
                      <option value="percentage">Percentage</option>
                      <option value="usd">USD</option>
                      <option value="gbp">GBP</option>
                      <option value="eur">EUR</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Value</label>
                    <input
                      type="number"
                      value={editForm.target_value}
                      onChange={(e) => setEditForm(prev => ({ ...prev, target_value: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter target value"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Value</label>
                    <input
                      type="number"
                      value={editForm.current_value}
                      onChange={(e) => setEditForm(prev => ({ ...prev, current_value: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter current value"
                      step="0.01"
                    />
                  </div>
                </div>
              )}

              {/* Values and Progress */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Initial</label>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatValue(keyResult.initial_value, keyResult.unit)}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current</label>
                    <div className="text-lg font-semibold text-blue-600">
                      {formatValue(keyResult.current_value, keyResult.unit)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target</label>
                    <div className="text-lg font-semibold text-green-600">
                      {formatValue(keyResult.target_value, keyResult.unit)}
                    </div>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{calculateProgress()}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, calculateProgress()))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Tags */}
              {(isEditing || (keyResult.tags && keyResult.tags.length > 0)) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {editForm.tags.map((tag, index) => (
                          <span key={index} className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            <span>{tag}</span>
                            <button
                              type="button"
                              onClick={() => removeTag(index)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="Type a tag and press Enter"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const target = e.target as HTMLInputElement
                            addTag(target.value)
                            target.value = ''
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {keyResult.tags?.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {tag}
                        </span>
                      )) || <span className="text-gray-500 italic">No tags</span>}
                    </div>
                  )}
                </div>
              )}

              {/* Update History */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Update History</h3>
                
                {checkIns.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {checkIns.map(checkIn => (
                      <div key={checkIn.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                              {checkIn.user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {checkIn.user?.full_name || checkIn.user?.email}
                            </span>
                            <span className="text-sm text-gray-500">
                              updated to {formatValue(checkIn.value, keyResult.unit)}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDate(checkIn.created_at)}
                          </span>
                        </div>
                        
                        {checkIn.notes && (
                          <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-2">
                            {checkIn.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No updates yet
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editForm.title.trim()}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}