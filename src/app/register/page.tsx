'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Shield, Mail, Building, ArrowRight, CheckCircle } from 'lucide-react'

export default function RegisterPage() {
  const [step, setStep] = useState<'access' | 'details' | 'verify'>('access')
  const [accessCode, setAccessCode] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [orgCode, setOrgCode] = useState('')
  const [emailValidation, setEmailValidation] = useState<{
    status: 'idle' | 'validating' | 'available' | 'taken',
    message?: string
  }>({ status: 'idle' })
  const [orgValidation, setOrgValidation] = useState<{
    status: 'idle' | 'validating' | 'found' | 'not-found',
    orgName?: string,
    orgId?: string
  }>({ status: 'idle' })
  const [isNewOrg, setIsNewOrg] = useState(true)
  const [clientInfo, setClientInfo] = useState<{ name: string, email: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  
  const router = useRouter()
  const emailValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (emailValidationTimeoutRef.current) {
        clearTimeout(emailValidationTimeoutRef.current)
      }
    }
  }, [])
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const isValidEmailFormat = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/
    return emailRegex.test(email)
  }

  const validateEmail = async (emailAddress: string) => {
    // Reset org validation when email changes
    setOrgValidation({ status: 'idle' })
    setOrgCode('')
    
    if (!emailAddress || !isValidEmailFormat(emailAddress)) {
      setEmailValidation({ status: 'idle' })
      return
    }
    
    setEmailValidation({ status: 'validating' })
    
    try {
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', emailAddress)
        .single()
      
      if (existingUser) {
        setEmailValidation({ 
          status: 'taken',
          message: 'This email is already registered. Please sign in instead.'
        })
      } else if (checkError && checkError.code === 'PGRST116') {
        // PGRST116 means no rows found when expecting single result - email is available
        setEmailValidation({ 
          status: 'available',
          message: 'Email available for registration'
        })
      } else {
        console.warn('Email check error:', checkError)
        setEmailValidation({ status: 'idle' })
      }
    } catch (error) {
      console.error('Email validation error:', error)
      setEmailValidation({ status: 'idle' })
    }
  }

  const handleEmailChange = (value: string) => {
    setEmail(value)
    
    // Clear previous timeout
    if (emailValidationTimeoutRef.current) {
      clearTimeout(emailValidationTimeoutRef.current)
    }
    
    // Reset validation state immediately for invalid format
    if (!isValidEmailFormat(value) && value.length > 0) {
      setEmailValidation({ status: 'idle' })
      setOrgValidation({ status: 'idle' })
      setOrgCode('')
      return
    }
    
    // Only validate if format is valid
    if (isValidEmailFormat(value)) {
      setEmailValidation({ status: 'validating' })
      emailValidationTimeoutRef.current = setTimeout(() => {
        validateEmail(value)
      }, 800) // Slightly longer debounce for better UX
    } else {
      setEmailValidation({ status: 'idle' })
    }
  }

  const validateOrgCode = async (code: string) => {
    if (code.length !== 6) {
      setOrgValidation({ status: 'idle' })
      return
    }
    
    setOrgValidation({ status: 'validating' })
    
    try {
      const { data: orgs, error } = await supabase
        .from('organizations')
        .select('id, name, org_code')
        .eq('org_code', code)
        .single()
      
      if (error || !orgs) {
        setOrgValidation({ status: 'not-found' })
      } else {
        setOrgValidation({
          status: 'found',
          orgName: orgs.name,
          orgId: orgs.id
        })
      }
    } catch (error) {
      setOrgValidation({ status: 'not-found' })
    }
  }

  const handleOrgCodeChange = (value: string) => {
    // Only allow input if email is validated and available
    if (emailValidation.status !== 'available') {
      return
    }
    
    // Only allow numeric input and limit to 6 digits
    const numericValue = value.replace(/[^0-9]/g, '').slice(0, 6)
    setOrgCode(numericValue)
    
    // Debounced validation
    setTimeout(() => validateOrgCode(numericValue), 300)
  }

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
      // Email is already validated in real-time, so proceed directly to OTP
      // Send OTP
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: undefined, // Force OTP instead of magic link
          data: {
            organization_name: isNewOrg ? organizationName : undefined,
            organization_id: !isNewOrg ? orgValidation.orgId : undefined,
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
              {step === 'details' && (isNewOrg ? 'Create Your Organization' : 'Join Organization')}
              {step === 'verify' && 'Verify Your Email'}
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              {step === 'access' && 'Enter your exclusive access code'}
              {step === 'details' && (isNewOrg 
                ? 'Set up your new organization and account' 
                : 'Complete your account and join your team'
              )}
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
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Smith"
                  required
                />
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Mail className="h-4 w-4 mr-2" />
                  Your Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${
                      emailValidation.status === 'taken' 
                        ? 'border-red-300 focus:ring-red-500' 
                        : emailValidation.status === 'available'
                        ? 'border-green-300 focus:ring-green-500'
                        : emailValidation.status === 'validating'
                        ? 'border-blue-300 focus:ring-blue-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="you@company.com"
                    required
                  />
                  
                  {/* Email Validation Status */}
                  {emailValidation.status === 'validating' && (
                    <div className="flex items-center mt-2 text-sm text-blue-600">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
                      Checking email...
                    </div>
                  )}
                  
                  {emailValidation.status === 'available' && (
                    <div className="mt-2 text-sm text-green-600 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {emailValidation.message}
                    </div>
                  )}
                  
                  {emailValidation.status === 'taken' && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center text-sm text-red-800 mb-2">
                        <span className="text-red-600 mr-2">✗</span>
                        {emailValidation.message}
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push('/')}
                        className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded"
                      >
                        Go to Sign In
                      </button>
                    </div>
                  )}
                </div>
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
                      <span className="font-medium text-gray-900">Create New Organization</span>
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
                      <span className="font-medium text-gray-900">Join Existing Organization</span>
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
                    Organization Code
                  </label>
                  <div className="relative">
                    <div className="flex items-center">
                      <span className="inline-flex items-center px-3 py-3 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-l-lg">
                        org-
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={orgCode}
                        onChange={(e) => handleOrgCodeChange(e.target.value)}
                        disabled={emailValidation.status !== 'available'}
                        className={`flex-1 px-4 py-3 border border-gray-300 rounded-r-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${
                          emailValidation.status !== 'available' 
                            ? 'bg-gray-100 cursor-not-allowed text-gray-500 focus:ring-gray-400' 
                            : 'focus:ring-blue-500'
                        }`}
                        placeholder={emailValidation.status !== 'available' ? 'Verify email first' : '123456'}
                        required
                      />
                    </div>
                    
                    {/* Validation Status */}
                    {orgValidation.status === 'validating' && (
                      <div className="flex items-center mt-2 text-sm text-blue-600">
                        <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
                        Checking organization...
                      </div>
                    )}
                    
                    {orgValidation.status === 'found' && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center text-sm text-green-800">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Organization Found!
                        </div>
                        <p className="text-sm font-medium text-green-900 mt-1">
                          {orgValidation.orgName}
                        </p>
                        <p className="text-xs text-green-700">
                          Ready to join as team member
                        </p>
                      </div>
                    )}
                    
                    {orgValidation.status === 'not-found' && orgCode.length === 6 && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center text-sm text-red-800 mb-2">
                          <span className="text-red-600 mr-2">✗</span>
                          Organization Not Found
                        </div>
                        <p className="text-xs text-red-700 mb-2">
                          • Ask your admin for the correct organization code
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsNewOrg(true)}
                          className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded"
                        >
                          Or create a new organization
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-2">
                    Enter the 6-digit code provided by your administrator
                  </p>
                </div>
              )}

              <button
                onClick={sendOTP}
                disabled={
                  !fullName || 
                  emailValidation.status !== 'available' || 
                  (isNewOrg ? !organizationName : orgValidation.status !== 'found') || 
                  isLoading
                }
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
                  router.push(`/verify-otp?email=${encodeURIComponent(email)}&fullName=${encodeURIComponent(fullName)}&newOrg=${isNewOrg}&orgName=${encodeURIComponent(organizationName)}&orgId=${orgValidation.orgId || ''}`)
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