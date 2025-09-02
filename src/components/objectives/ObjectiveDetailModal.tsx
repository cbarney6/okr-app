'use client'

import { useState, useEffect } from 'react'
import { X, Edit2, Save, AlertCircle } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

interface ObjectiveDetailModalProps {
  isOpen: boolean
  onClose: () => void
  objectiveId: string | null
  onSave?: () => void
}

interface ObjectiveData {
  id: string
  title: string
  description: string
  status: string
  tags: string[]
  okr_design_score: number
  start_date: string
  end_date: string
  created_at: string
  updated_at: string
  owner: {
    id: string
    full_name: string
    email: string
  }
  session: {
    id: string
    name: string
    color: string
    status: string
  }
  parent_objective: {
    id: string
    title: string
  } | null
  parent_key_result: {
    id: string
    title: string
  } | null
}

interface KeyResult {
  id: string
  title: string
  current_value: number
  target_value: number
  initial_value: number
  unit: string
  key_result_type: string
  confidence_level: string
}

export default function ObjectiveDetailModal({ 
  isOpen, 
  onClose, 
  objectiveId,
  onSave
}: ObjectiveDetailModalProps) {
  const [objective, setObjective] = useState<ObjectiveData | null>(null)
  const [keyResults, setKeyResults] = useState<KeyResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    tags: [] as string[],
    okr_design_score: 0
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchObjectiveData = async () => {
    if (!objectiveId) return

    setLoading(true)
    setError('')

    try {
      const { data: objectiveData, error: objError } = await supabase
        .from('objectives')
        .select(`
          *,
          owner:profiles!owner_id(id, full_name, email),
          session:sessions!session_id(id, name, color, status),
          parent_objective:objectives!parent_objective_id(id, title),
          parent_key_result:key_results!parent_key_result_id(id, title)
        `)
        .eq('id', objectiveId)
        .single()

      if (objError) throw objError

      setObjective(objectiveData)
      setEditForm({
        title: objectiveData.title,
        description: objectiveData.description || '',
        tags: objectiveData.tags || [],
        okr_design_score: objectiveData.okr_design_score || 0
      })

      const { data: keyResultsData, error: krError } = await supabase
        .from('key_results')
        .select('*')
        .eq('objective_id', objectiveId)
        .order('created_at', { ascending: true })

      if (krError) throw krError

      setKeyResults(keyResultsData || [])
    } catch (err) {
      console.error('Error fetching objective data:', err)
      setError('Failed to load objective details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && objectiveId) {
      fetchObjectiveData()
    }
  }, [isOpen, objectiveId])

  const calculateProgress = () => {
    if (keyResults.length === 0) return 0
    
    let totalProgress = 0
    keyResults.forEach(kr => {
      let progress = 0
      if (kr.key_result_type === 'should_increase_to' && kr.target_value > kr.initial_value) {
        progress = Math.min(100, Math.max(0, ((kr.current_value - kr.initial_value) / (kr.target_value - kr.initial_value)) * 100))
      } else if (kr.key_result_type === 'should_decrease_to' && kr.initial_value > kr.target_value) {
        progress = Math.min(100, Math.max(0, ((kr.initial_value - kr.current_value) / (kr.initial_value - kr.target_value)) * 100))
      } else if (kr.key_result_type === 'achieved_or_not') {
        progress = kr.current_value >= kr.target_value ? 100 : 0
      }
      totalProgress += progress
    })
    
    return Math.round(totalProgress / keyResults.length)
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

  const handleSave = async () => {
    if (!objective) return
    
    setSaving(true)
    setError('')
    
    try {
      const response = await fetch(`/api/objectives/${objective.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save objective')
      }
      
      setIsEditing(false)
      if (onSave) {
        onSave()
      }
      onClose()
    } catch (err) {
      console.error('Error saving objective:', err)
      setError(err instanceof Error ? err.message : 'Failed to save objective')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (objective) {
      setEditForm({
        title: objective.title,
        description: objective.description || '',
        tags: objective.tags || [],
        okr_design_score: objective.okr_design_score || 0
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
            {loading ? 'Loading...' : objective?.title || 'Objective Details'}
          </h2>
          <div className="flex items-center space-x-2">
            {!loading && objective && (
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
              <div className="text-gray-500">Loading objective details...</div>
            </div>
          ) : objective ? (
            <div className="space-y-6">
              {/* Edit Mode Alert */}
              {isEditing && (
                <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  <span className="text-sm text-blue-800">You are now editing this objective. Make your changes and click Save to update.</span>
                </div>
              )}
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: objective.session?.color || '#3B82F6' }}
                    />
                    <span className="text-gray-900">{objective.session?.name}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                      {objective.owner?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                    </div>
                    <span className="text-gray-900">{objective.owner?.full_name || objective.owner?.email}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">OKR Design Score</label>
                  {isEditing ? (
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setEditForm(prev => ({ ...prev, okr_design_score: i + 1 }))}
                          className={`w-4 h-4 rounded-full transition-colors ${
                            i < editForm.okr_design_score ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-300 hover:bg-gray-400'
                          }`}
                        />
                      ))}
                      <span className="ml-2 text-sm text-gray-600">{editForm.okr_design_score}/5</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <div 
                          key={i}
                          className={`w-3 h-3 rounded-full ${
                            i < (objective.okr_design_score || 0) ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parent</label>
                  <div className="text-gray-900">
                    {objective.parent_objective ? (
                      <span>🎯 {objective.parent_objective.title}</span>
                    ) : objective.parent_key_result ? (
                      <span>📊 {objective.parent_key_result.title}</span>
                    ) : (
                      <span className="text-gray-500">None</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Title */}
              {isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter objective title"
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                {isEditing ? (
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter objective description"
                  />
                ) : (
                  <div className="text-gray-900">
                    {objective.description || <span className="text-gray-500 italic">No description provided</span>}
                  </div>
                )}
              </div>

              {/* Tags */}
              {(isEditing || (objective.tags && objective.tags.length > 0)) && (
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
                      {objective.tags?.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {tag}
                        </span>
                      )) || <span className="text-gray-500 italic">No tags</span>}
                    </div>
                  )}
                </div>
              )}

              {/* Progress Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Progress</h3>
                  <span className="text-2xl font-bold text-blue-600">{calculateProgress()}%</span>
                </div>

                {keyResults.length > 0 ? (
                  <div className="space-y-4">
                    {keyResults.map(kr => {
                      let progress = 0
                      if (kr.key_result_type === 'should_increase_to' && kr.target_value > kr.initial_value) {
                        progress = Math.min(100, Math.max(0, ((kr.current_value - kr.initial_value) / (kr.target_value - kr.initial_value)) * 100))
                      } else if (kr.key_result_type === 'should_decrease_to' && kr.initial_value > kr.target_value) {
                        progress = Math.min(100, Math.max(0, ((kr.initial_value - kr.current_value) / (kr.initial_value - kr.target_value)) * 100))
                      } else if (kr.key_result_type === 'achieved_or_not') {
                        progress = kr.current_value >= kr.target_value ? 100 : 0
                      }

                      return (
                        <div key={kr.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-gray-900">{kr.title}</h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(kr.confidence_level)}`}>
                              {kr.confidence_level.toUpperCase()}
                            </span>
                          </div>
                          
                          <div className="mb-2">
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                              <span>Progress: {Math.round(progress)}%</span>
                              <span>
                                {formatValue(kr.current_value, kr.unit)} / {formatValue(kr.target_value, kr.unit)}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No key results found for this objective
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