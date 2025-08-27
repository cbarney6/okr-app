import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout'
import { Target, Plus } from 'lucide-react'

export default async function OKRsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  return (
    <AuthenticatedLayout pageTitle="Objectives & Key Results">
      <div className="p-6">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Objectives & Key Results</h1>
            <p className="text-gray-600">Track and manage your OKRs across sessions</p>
          </div>
          <button
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create OKR
          </button>
        </div>

        <div className="text-center py-12">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">OKRs Coming Soon</h3>
          <p className="text-gray-500 mb-6">
            This page will allow you to create and manage your objectives and key results.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-yellow-800">
              <strong>Development Status:</strong> This feature will be implemented in the next development chunk.
            </p>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}