'use client'

import { useState, useEffect, Suspense } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, ArrowRight, RefreshCw } from 'lucide-react'

function VerifyOTPContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const email = searchParams.get('email') || ''
  const fullName = searchParams.get('fullName') || ''
  const isNewOrg = searchParams.get('newOrg') === 'true'
  const orgName = searchParams.get('orgName') || ''
  const orgId = searchParams.get('orgId') || ''
  
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes = 300 seconds
  const [canResend, setCanResend] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [timeLeft])

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return // Prevent pasting multiple chars
    
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }
    
    // Auto-submit when all 6 digits entered
    if (index === 5 && value && newOtp.every(digit => digit)) {
      verifyOTP(newOtp.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    }
  }

  const verifyOTP = async (code?: string) => {
    const otpCode = code || otp.join('')
    if (otpCode.length !== 6) {
      setMessage('Please enter all 6 digits')
      return
    }
    
    // Prevent double submission
    if (isVerified || isLoading) {
      return
    }
    
    setIsLoading(true)
    setMessage('')
    
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: otpCode,
        type: 'email'
      })
      
      if (error) {
        // Handle specific auth errors with user-friendly messages
        if (error.message.includes('expired')) {
          setMessage('Verification code has expired. Please request a new one.')
        } else if (error.message.includes('invalid')) {
          setMessage('Invalid verification code. Please check and try again.')
        } else {
          setMessage(error.message)
        }
        throw error
      }
      
      if (data.session) {
        setIsVerified(true)
        
        // Ensure the session is properly set in the client
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        })
        
        // Verify session is properly established by checking current user
        const waitForSessionEstablishment = async (): Promise<boolean> => {
          let retries = 0
          const maxRetries = 20 // Allow up to ~2 seconds total wait time
          
          while (retries < maxRetries) {
            const { data: currentUser, error: userError } = await supabase.auth.getUser()
            
            if (currentUser?.user && !userError && data.session && currentUser.user.id === data.session.user.id) {
              return true
            }
            
            retries++
            // Exponential backoff: 25ms, 50ms, 100ms, 150ms, etc.
            const delay = Math.min(25 * Math.pow(1.5, retries), 200)
            await new Promise(resolve => setTimeout(resolve, delay))
          }
          
          return false
        }
        
        const sessionEstablished = await waitForSessionEstablishment()
        if (!sessionEstablished) {
          console.error('Session establishment timeout')
          setMessage('Session setup is taking longer than expected. Please try signing in again.')
          return
        }
        
        // If new org, create the organization
        if (isNewOrg && orgName) {
          try {
            // Generate slug from organization name
            const generateSlug = (name: string): string => {
              return name
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
                .replace(/\s+/g, '-') // Replace spaces with hyphens
                .replace(/-+/g, '-') // Replace multiple hyphens with single
                .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
                || 'organization' // Fallback if name becomes empty
            }
            
            // Generate unique org code using database function
            const { data: codeResult, error: codeError } = await supabase
              .rpc('generate_unique_org_code')
            
            if (codeError) {
              console.error('Failed to generate org code:', codeError)
              setMessage('Failed to generate organization code. Please try again.')
              return
            }
            
            const orgSlug = generateSlug(orgName)
            const orgCode = codeResult as string
            
            const { data: org, error: orgError } = await supabase
              .from('organizations')
              .insert({
                name: orgName,
                slug: orgSlug,
                org_code: orgCode,
                created_by: data.session.user.id
              })
              .select()
              .single()
            
            if (orgError) {
              console.error('Organization creation error:', orgError)
              setMessage(`Failed to create organization: ${orgError.message}. Please try again or contact support.`)
              return
            }
            
            // Check if profile exists, then insert or update
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', data.session.user.id)
              .single()
            
            if (existingProfile) {
              // Profile already exists - this user is not new!
              setMessage('An account already exists with this email. Please sign in instead.')
              setTimeout(() => router.push('/'), 3000)
              return
            } else {
              // Profile doesn't exist, create it
              const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                  id: data.session.user.id,
                  email: email,
                  full_name: fullName,
                  organization_id: org.id,
                  roles: ['admin']
                })
              
              if (profileError) {
                console.error('Profile creation error:', profileError)
                setMessage(`Failed to create profile: ${profileError.message}. Please contact support.`)
                return
              }
            }
            
            router.push('/onboarding')
          } catch (dbError) {
            console.error('Database operation failed:', dbError)
            setMessage('Account created but organization setup failed. Please contact support.')
          }
        } else if (!isNewOrg && orgId) {
          try {
            // First check if profile exists
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', data.session.user.id)
              .single()
            
            if (existingProfile) {
              // Profile already exists - this user is not new!
              setMessage('An account already exists with this email. Please sign in instead.')
              setTimeout(() => router.push('/'), 3000)
              return
            } else {
              // Profile doesn't exist, create it
              const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                  id: data.session.user.id,
                  email: email,
                  full_name: fullName,
                  organization_id: orgId,
                  roles: ['user']
                })
              
              if (profileError) {
                console.error('Profile creation error:', profileError)
                setMessage(`Failed to create profile: ${profileError.message}. Please contact support.`)
                return
              }
            }
            
            router.push('/dashboard')
          } catch (dbError) {
            console.error('Database operation failed:', dbError)
            setMessage('Account created but failed to join organization. Please contact support.')
          }
        } else {
          // Regular sign in - just redirect
          router.push('/dashboard')
        }
      } else {
        setMessage('Verification successful but no session created. Please try signing in again.')
      }
    } catch (error) {
      console.error('OTP verification error:', error)
      // Only reset if it was an auth error (not a database error)
      if (!isVerified) {
        setOtp(['', '', '', '', '', ''])
        document.getElementById('otp-0')?.focus()
      }
      // Message already set above for auth errors
    } finally {
      setIsLoading(false)
    }
  }

  const resendOTP = async () => {
    setIsLoading(true)
    setMessage('')
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: undefined // Force OTP instead of magic link
        }
      })
      
      if (error) throw error
      
      setMessage('New code sent! Check your email.')
      setTimeLeft(300) // Reset to 5 minutes
      setCanResend(false)
      setOtp(['', '', '', '', '', ''])
      document.getElementById('otp-0')?.focus()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to resend code')
    } finally {
      setIsLoading(false)
    }
  }

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No email provided. Redirecting...</p>
          {(() => {
            setTimeout(() => router.push('/'), 2000)
            return null
          })()}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Check Your Email</h1>
            <p className="text-sm text-gray-600 mt-2">
              We sent a 6-digit code to
            </p>
            <p className="text-sm font-medium text-gray-900 mt-1">{email}</p>
          </div>

          {/* OTP Input */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                Enter verification code
              </label>
              <div className="flex justify-center space-x-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-12 text-center text-xl font-bold text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading || isVerified}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={() => verifyOTP()}
              disabled={otp.some(d => !d) || isLoading || isVerified}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
            >
              {isVerified ? 'Redirecting...' : isLoading ? 'Verifying...' : (
                <>
                  Verify Code
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>

            {/* Countdown and Resend */}
            <div className="text-center">
              {canResend ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-red-600">
                    Code expired - New code required
                  </p>
                  <button
                    onClick={resendOTP}
                    disabled={isLoading}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center justify-center mx-auto"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Resend Code
                  </button>
                </div>
              ) : (
                <p className={`text-sm font-medium ${
                  timeLeft > 120 ? 'text-green-600' : 
                  timeLeft > 30 ? 'text-orange-600' : 
                  'text-red-600'
                }`}>
                  Expires in {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </p>
              )}
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              message.includes('sent') 
                ? 'bg-green-50 text-green-800' 
                : 'bg-red-50 text-red-800'
            }`}>
              {message}
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              Wrong email?{' '}
              <button
                onClick={() => router.push('/register')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Go Back
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <VerifyOTPContent />
    </Suspense>
  )
}