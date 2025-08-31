'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Shield, Mail, Building, ArrowRight, CheckCircle } from 'lucide-react'

export default function RegisterPage() {
  const [step, setStep] = useState<'access' | 'details' | 'verify'>('access')
  const [accessCode, setAccessCode] = useState('')
  const [email, setEmail] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [organizationId, setOrganizationId] = useState('')
  const [isNewOrg, setIsNewOrg] = useState(true)
  const [clientInfo, setClientInfo] = useState<{ name: string, email: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const validateAccessCode = async () => {
    setIsLoading(true)
    setMessage('')
    
    try {
      const { data, error } = await supabase.rpc('validate_access_code', {
        input_code: accessCode.toUpperCase()
      })
      
      if (error) throw error
      
      if (data && data[0]?.is_valid) {
        setClientInfo({
          name: data[0].client_name,
          email: data[0].client_email
        })
        setStep('details')
      } else {
        setMessage('Invalid or expired access code. Please contact your Table Rock advisor.')
      }
    } catch (error) {
      setMessage('Error validating access code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const sendOTP = async () => {
    setIsLoading(true)
    setMessage('')
    
    try {
      // For new org, check if email already exists
      if (isNewOrg) {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single()
        
        if (existingUser) {
          setMessage('This email is already registered. Please sign in instead.')
          setTimeout(() => router.push('/'), 2000)
          return
        }
      }
      
      // Send OTP
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: undefined, // Force OTP instead of magic link
          data: {
            organization_name: isNewOrg ? organizationName : undefined,
            organization_id: !isNewOrg ? organizationId : undefined,
            is_first_user: isNewOrg,
            client_name: clientInfo?.name
          }
        }
      })
      
      if (error) throw error
      
      setOtpSent(true)
      setStep('verify')
      setMessage('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to send verification code')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">TR</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {step === 'access' && 'Welcome to Table Rock OKR'}
              {step === 'details' && 'Organization Setup'}
              {step === 'verify' && 'Verify Your Email'}
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              {step === 'access' && 'Enter your exclusive access code'}
              {step === 'details' && 'Tell us about your organization'}
              {step === 'verify' && 'Check your email for verification code'}
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step === 'access' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
            }`}>
              {step === 'access' ? '1' : <CheckCircle className="h-5 w-5" />}
            </div>
            <div className={`h-1 w-16 ${
              step !== 'access' ? 'bg-green-600' : 'bg-gray-300'
            }`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step === 'details' ? 'bg-blue-600 text-white' : 
              step === 'verify' ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-500'
            }`}>
              {step === 'verify' ? <CheckCircle className="h-5 w-5" /> : '2'}
            </div>
            <div className={`h-1 w-16 ${
              step === 'verify' ? 'bg-green-600' : 'bg-gray-300'
            }`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step === 'verify' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500'
            }`}>
              3
            </div>
          </div>

          {/* Step 1: Access Code */}
          {step === 'access' && (
            <div className="space-y-6">
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Shield className="h-4 w-4 mr-2" />
                  Access Code
                </label>
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ENTER-CODE"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  Contact your Table Rock advisor if you don&apos;t have a code
                </p>
              </div>

              <button
                onClick={validateAccessCode}
                disabled={!accessCode || isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                {isLoading ? 'Validating...' : (
                  <>
                    Validate Code
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 2: Organization Details */}
          {step === 'details' && (
            <div className="space-y-6">
              {clientInfo && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    Access granted for: <strong>{clientInfo.name}</strong>
                  </p>
                </div>
              )}

              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Mail className="h-4 w-4 mr-2" />
                  Your Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="you@company.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Organization Setup
                </label>
                <div className="space-y-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      checked={isNewOrg}
                      onChange={() => setIsNewOrg(true)}
                      className="mr-3"
                    />
                    <div>
                      <span className="font-medium">Create New Organization</span>
                      <p className="text-xs text-gray-500">You&apos;ll be the administrator</p>
                    </div>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      checked={!isNewOrg}
                      onChange={() => setIsNewOrg(false)}
                      className="mr-3"
                    />
                    <div>
                      <span className="font-medium">Join Existing Organization</span>
                      <p className="text-xs text-gray-500">You have an organization ID</p>
                    </div>
                  </label>
                </div>
              </div>

              {isNewOrg ? (
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Building className="h-4 w-4 mr-2" />
                    Organization Name
                  </label>
                  <input
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Acme Corporation"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Building className="h-4 w-4 mr-2" />
                    Organization ID
                  </label>
                  <input
                    type="text"
                    value={organizationId}
                    onChange={(e) => setOrganizationId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="org_xxxxx"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Ask your administrator for the organization ID
                  </p>
                </div>
              )}

              <button
                onClick={sendOTP}
                disabled={!email || (isNewOrg ? !organizationName : !organizationId) || isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                {isLoading ? 'Sending Code...' : (
                  <>
                    Send Verification Code
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 3: OTP Verification - Redirect to verify page */}
          {step === 'verify' && otpSent && (
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <p className="text-gray-700 mb-4">
                Verification code sent to <strong>{email}</strong>
              </p>
              <p className="text-sm text-gray-600 mb-6">
                Redirecting to verification page...
              </p>
              {(() => {
                setTimeout(() => {
                  router.push(`/verify-otp?email=${encodeURIComponent(email)}&newOrg=${isNewOrg}&orgName=${encodeURIComponent(organizationName)}&orgId=${organizationId}`)
                }, 2000)
                return null
              })()}
            </div>
          )}

          {/* Error Message */}
          {message && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-800 text-sm">
              {message}
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                onClick={() => router.push('/')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}