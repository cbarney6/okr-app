'use client'

import { useState, useEffect, Suspense } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, ArrowRight, RefreshCw, CheckCircle } from 'lucide-react'

function VerifyOTPContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const email = searchParams.get('email') || ''
  const isNewOrg = searchParams.get('newOrg') === 'true'
  const orgName = searchParams.get('orgName') || ''
  const orgId = searchParams.get('orgId') || ''
  
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [timeLeft, setTimeLeft] = useState(60)
  const [canResend, setCanResend] = useState(false)
  
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
    
    setIsLoading(true)
    setMessage('')
    
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: otpCode,
        type: 'email'
      })
      
      if (error) throw error
      
      if (data.session) {
        // If new org, create the organization
        if (isNewOrg && orgName) {
          const { data: org, error: orgError } = await supabase
            .from('organizations')
            .insert({
              name: orgName,
              created_by: data.session.user.id
            })
            .select()
            .single()
          
          if (orgError) throw orgError
          
          // Update user profile with org and admin role
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              organization_id: org.id,
              roles: ['admin']
            })
            .eq('id', data.session.user.id)
          
          if (profileError) throw profileError
          
          router.push('/onboarding')
        } else if (!isNewOrg && orgId) {
          // Join existing org
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              organization_id: orgId,
              roles: ['user']
            })
            .eq('id', data.session.user.id)
          
          if (profileError) throw profileError
          
          router.push('/dashboard')
        } else {
          // Regular sign in
          router.push('/dashboard')
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Invalid verification code')
      setOtp(['', '', '', '', '', ''])
      document.getElementById('otp-0')?.focus()
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
          shouldCreateUser: true
        }
      })
      
      if (error) throw error
      
      setMessage('New code sent! Check your email.')
      setTimeLeft(60)
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
                    className="w-12 h-12 text-center text-xl font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={() => verifyOTP()}
              disabled={otp.some(d => !d) || isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
            >
              {isLoading ? 'Verifying...' : (
                <>
                  Verify Code
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>

            {/* Resend */}
            <div className="text-center">
              {canResend ? (
                <button
                  onClick={resendOTP}
                  disabled={isLoading}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center justify-center mx-auto"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Resend Code
                </button>
              ) : (
                <p className="text-sm text-gray-500">
                  Resend code in {timeLeft} seconds
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