import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AuthButton from '@/components/auth/AuthButton'

export default async function Dashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organizations(*)')
    .eq('id', user.id)
    .single()

  const { data: objectives } = await supabase
    .from('objectives')
    .select(`
      *,
      key_results (*)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome, {profile?.full_name || user.email}
                </h1>
                {profile?.organizations && (
                  <p className="text-gray-600">
                    Organization: {profile.organizations.name}
                  </p>
                )}
              </div>
              <AuthButton />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-blue-900">
                  Total Objectives
                </h3>
                <p className="text-2xl font-bold text-blue-600">
                  {objectives?.length || 0}
                </p>
              </div>

              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-green-900">
                  Active Key Results
                </h3>
                <p className="text-2xl font-bold text-green-600">
                  {objectives?.reduce((acc, obj) => acc + (obj.key_results?.length || 0), 0) || 0}
                </p>
              </div>

              <div className="bg-purple-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-purple-900">
                  Completion Rate
                </h3>
                <p className="text-2xl font-bold text-purple-600">
                  85%
                </p>
              </div>
            </div>

            {objectives && objectives.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Recent Objectives
                </h2>
                <div className="space-y-4">
                  {objectives.slice(0, 3).map((objective) => (
                    <div key={objective.id} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900">{objective.title}</h3>
                      <p className="text-gray-600 text-sm mt-1">{objective.description}</p>
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <span>
                          {new Date(objective.start_date).toLocaleDateString()} - {' '}
                          {new Date(objective.end_date).toLocaleDateString()}
                        </span>
                        <span className="ml-4 px-2 py-1 bg-green-100 text-green-800 rounded-full">
                          {objective.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
