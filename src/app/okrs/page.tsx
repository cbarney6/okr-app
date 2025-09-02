'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout'
import CreateObjectiveModal from '@/components/objectives/CreateObjectiveModal'
import CreateKeyResultModal from '@/components/objectives/CreateKeyResultModal'
import ObjectiveDetailModal from '@/components/objectives/ObjectiveDetailModal'
import KeyResultDetailModal from '@/components/objectives/KeyResultDetailModal'
import { createBrowserClient } from '@supabase/ssr'

interface Objective {
  id: string
  title: string
  description: string
  owner_id: string
  session_id: string
  organization_id: string
  status: string
  created_at: string
  start_date: string
  end_date: string
  tags: string[]
  owner?: {
    id: string
    full_name: string
    email: string
  }
  session?: {
    id: string
    name: string
    color: string
  }
}

interface KeyResult {
  id: string
  title: string
  objective_id: string
  current_value: number
  target_value: number
  unit: string
  confidence_level: string
  owner?: {
    id: string
    full_name: string
    email: string
  }
}

export default function OKRsPage() {
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [keyResults, setKeyResults] = useState<KeyResult[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateObjective, setShowCreateObjective] = useState(false)
  const [showCreateKeyResult, setShowCreateKeyResult] = useState(false)
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string>('')
  const [showObjectiveDetail, setShowObjectiveDetail] = useState(false)
  const [showKeyResultDetail, setShowKeyResultDetail] = useState(false)
  const [selectedDetailObjectiveId, setSelectedDetailObjectiveId] = useState<string | null>(null)
  const [selectedDetailKeyResultId, setSelectedDetailKeyResultId] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Get current user's organization ID
  const getCurrentUserOrgId = async (): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      return profile?.organization_id || null
    } catch (error) {
      console.error('Error getting user org ID:', error)
      return null
    }
  }

  const fetchObjectives = async () => {
    setLoading(true)
    try {
      const organizationId = await getCurrentUserOrgId()
      if (!organizationId) return

      // Fetch objectives with related data
      const { data: objectivesData, error: objError } = await supabase
        .from('objectives')
        .select(`
          *,
          owner:profiles!owner_id(id, full_name, email),
          session:sessions!session_id(id, name, color)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (objError) throw objError

      // Fetch key results with related data
      const { data: keyResultsData, error: krError } = await supabase
        .from('key_results')
        .select(`
          *,
          owner:profiles!owner_id(id, full_name, email)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (krError) throw krError

      setObjectives(objectivesData || [])
      setKeyResults(keyResultsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchObjectives()
  }, [])

  const handleObjectiveSuccess = () => {
    setShowCreateObjective(false)
    fetchObjectives()
  }

  const handleKeyResultSuccess = () => {
    setShowCreateKeyResult(false)
    setSelectedObjectiveId('')
    fetchObjectives()
  }

  const handleAddKeyResult = (objectiveId: string) => {
    setSelectedObjectiveId(objectiveId)
    setShowCreateKeyResult(true)
  }

  const handleObjectiveClick = (objectiveId: string) => {
    setSelectedDetailObjectiveId(objectiveId)
    setShowObjectiveDetail(true)
  }

  const handleKeyResultClick = (keyResultId: string) => {
    setSelectedDetailKeyResultId(keyResultId)
    setShowKeyResultDetail(true)
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


  if (loading) {
    return (
      <AuthenticatedLayout pageTitle="Objectives & Key Results">
        <div className="p-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">Loading objectives...</div>
          </div>
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout pageTitle="Objectives & Key Results">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900">My OKRs</h2>
            <div className="flex space-x-4 mt-2">
              <button className="text-sm font-medium text-blue-600 border-b-2 border-blue-600 pb-1">
                All
              </button>
              <button className="text-sm text-gray-500 hover:text-gray-700">
                Owned by me and my teams
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowCreateObjective(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create OKR
          </button>
        </div>

        {/* OKRs Table */}
        {objectives.length === 0 && keyResults.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-gray-500 mb-4">No OKRs found</div>
            <button
              onClick={() => setShowCreateObjective(true)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first objective
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    OKRs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tags
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Objectives */}
                {objectives.map((objective) => (
                  <tr 
                    key={objective.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleObjectiveClick(objective.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {objective.title}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-semibold mr-2">
                          {objective.owner?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                        </div>
                        <span className="text-sm text-gray-900">
                          {objective.owner?.full_name || objective.owner?.email || 'Unassigned'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">-</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '0%' }}></div>
                        </div>
                        <span className="text-sm text-gray-900">0%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {objective.tags?.slice(0, 2).map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {tag}
                          </span>
                        ))}
                        {objective.tags && objective.tags.length > 2 && (
                          <span className="text-xs text-gray-500">+{objective.tags.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 truncate max-w-xs">
                        {objective.description || '-'}
                      </div>
                    </td>
                  </tr>
                ))}
                
                {/* Key Results */}
                {keyResults.map((keyResult) => (
                  <tr 
                    key={keyResult.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleKeyResultClick(keyResult.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center pl-6">
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {keyResult.title}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-semibold mr-2">
                          {keyResult.owner?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                        </div>
                        <span className="text-sm text-gray-900">
                          {keyResult.owner?.full_name || keyResult.owner?.email || 'Unassigned'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getConfidenceColor(keyResult.confidence_level)}`}>
                        {keyResult.confidence_level.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{ width: `${Math.min(100, (keyResult.current_value / keyResult.target_value) * 100)}%` }}></div>
                        </div>
                        <span className="text-sm text-gray-900">
                          {Math.round((keyResult.current_value / keyResult.target_value) * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">-</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">
                        {formatValue(keyResult.current_value, keyResult.unit)} / {formatValue(keyResult.target_value, keyResult.unit)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create Objective Modal */}
        <CreateObjectiveModal
          isOpen={showCreateObjective}
          onClose={() => setShowCreateObjective(false)}
          onSuccess={handleObjectiveSuccess}
          getCurrentUserOrgId={getCurrentUserOrgId}
        />

        {/* Create Key Result Modal */}
        <CreateKeyResultModal
          isOpen={showCreateKeyResult}
          onClose={() => {
            setShowCreateKeyResult(false)
            setSelectedObjectiveId('')
          }}
          onSuccess={handleKeyResultSuccess}
          getCurrentUserOrgId={getCurrentUserOrgId}
          preselectedObjectiveId={selectedObjectiveId}
        />

        {/* Objective Detail Modal */}
        <ObjectiveDetailModal
          isOpen={showObjectiveDetail}
          onClose={() => {
            setShowObjectiveDetail(false)
            setSelectedDetailObjectiveId(null)
          }}
          objectiveId={selectedDetailObjectiveId}
          onSave={() => {
            fetchObjectives()
          }}
        />

        {/* Key Result Detail Modal */}
        <KeyResultDetailModal
          isOpen={showKeyResultDetail}
          onClose={() => {
            setShowKeyResultDetail(false)
            setSelectedDetailKeyResultId(null)
          }}
          keyResultId={selectedDetailKeyResultId}
          onSave={() => {
            fetchObjectives()
          }}
        />
      </div>
    </AuthenticatedLayout>
  )
}