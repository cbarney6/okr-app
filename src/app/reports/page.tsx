import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout'
import { BarChart3, TrendingUp, Target } from 'lucide-react'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  return (
    <AuthenticatedLayout pageTitle="Reports">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">Analyze your OKR performance and progress</p>
        </div>

        <div className="text-center py-12">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="h-8 w-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Reports Coming Soon</h3>
          <p className="text-gray-500 mb-6">
            This page will provide detailed analytics and performance reports for your OKRs.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <TrendingUp className="h-6 w-6 text-gray-400 mb-2" />
              <h4 className="font-medium text-gray-900">Progress Analytics</h4>
              <p className="text-sm text-gray-500">Track completion rates and trends</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <BarChart3 className="h-6 w-6 text-gray-400 mb-2" />
              <h4 className="font-medium text-gray-900">Performance Metrics</h4>
              <p className="text-sm text-gray-500">Measure key result performance</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <Target className="h-6 w-6 text-gray-400 mb-2" />
              <h4 className="font-medium text-gray-900">Goal Achievement</h4>
              <p className="text-sm text-gray-500">Monitor objective completion</p>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-yellow-800">
              <strong>Development Status:</strong> Advanced reporting features will be implemented in future development cycles.
            </p>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}