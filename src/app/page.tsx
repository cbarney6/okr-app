import AuthButton from '@/components/auth/AuthButton'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            OKR Management
            <span className="block text-blue-600">Made Simple</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Track your objectives and key results with our powerful, multi-tenant platform.
            Perfect for teams and organizations of any size.
          </p>
          <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
            <AuthButton />
          </div>
        </div>

        <div className="mt-16">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900">Multi-Tenant</h3>
              <p className="mt-2 text-gray-600">
                Secure organization-based data isolation with Row Level Security.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900">Real-time</h3>
              <p className="mt-2 text-gray-600">
                Live updates across your team with Supabase real-time features.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900">Free Hosting</h3>
              <p className="mt-2 text-gray-600">
                Deploy for free on Vercel and Supabase - perfect for getting started.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
