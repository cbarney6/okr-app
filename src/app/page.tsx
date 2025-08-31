'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Target, CheckCircle2, Users, TrendingUp, Shield, ArrowRight } from 'lucide-react'

export default function Home() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false // Don't create new users on sign in
        }
      })
      
      if (error) throw error
      
      // Redirect to OTP verification page
      router.push(`/verify-otp?email=${encodeURIComponent(email)}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Table Rock Logo Placeholder */}
            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">TR</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Table Rock</h3>
              <p className="text-xs text-gray-600">Business Advisory Services</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-screen">
        {/* Left Side - Content */}
        <div className="flex-1 flex items-center justify-center px-8 py-16">
          <div className="max-w-xl">
            <div className="mb-8">
              <h1 className="text-5xl font-bold text-gray-900 mb-4">
                Strategic OKR Management
                <span className="block text-3xl text-blue-600 mt-2">For Growing Organizations</span>
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed">
                An exclusive tool for Table Rock clients to implement and manage Objectives and Key Results. 
                Built on proven methodologies from successful enterprise deployments.
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900">Enterprise-Tested Framework</h3>
                  <p className="text-sm text-gray-600">Proven OKR methodology from CEO and executive experience</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Users className="h-6 w-6 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900">Unlimited Team Access</h3>
                  <p className="text-sm text-gray-600">Invite your entire organization with role-based permissions</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Shield className="h-6 w-6 text-purple-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900">Invite-Only Platform</h3>
                  <p className="text-sm text-gray-600">Exclusive access for Table Rock advisory clients</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <TrendingUp className="h-6 w-6 text-orange-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900">Complimentary Tool</h3>
                  <p className="text-sm text-gray-600">Provided at no cost as part of our advisory engagement</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <p className="text-sm text-gray-500">
                This platform is exclusively available to organizations engaged with Table Rock Business Advisory Services. 
                Access is by invitation only.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Auth */}
        <div className="w-full max-w-md flex items-center justify-center px-8 py-16 bg-white shadow-xl">
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <Target className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
              <p className="text-sm text-gray-600 mt-2">Sign in to your OKR dashboard</p>
            </div>

            <form onSubmit={handleSignIn} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="you@company.com"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  We&apos;ll send you a secure 6-digit code to sign in
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium disabled:opacity-50 transition-colors flex items-center justify-center"
              >
                {isLoading ? (
                  'Sending Code...'
                ) : (
                  <>
                    Send Sign In Code
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </button>

              {message && (
                <div className="p-3 rounded-lg bg-red-50 text-red-800 text-sm">
                  {message}
                </div>
              )}
            </form>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-center text-sm text-gray-600 mb-3">
                New to the platform?
              </p>
              <button
                onClick={() => router.push('/register')}
                className="w-full text-center text-blue-600 hover:text-blue-700 font-medium text-sm py-2 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Register with Access Code
              </button>
              <p className="text-center text-xs text-gray-500 mt-3">
                Contact your Table Rock advisor for an invitation
              </p>
            </div>

            {/* Quick testing links */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Quick Testing Links:</p>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => router.push('/onboarding')}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded"
                >
                  Onboarding
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}