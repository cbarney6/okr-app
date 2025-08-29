import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('redirect_to') ?? '/onboarding'

  const supabase = await createClient()

  console.log('Auth confirm params:', { token: token?.substring(0, 20), token_hash: token_hash?.substring(0, 20), type, next })

  // Handle both PKCE tokens and legacy token_hash
  if (token && type) {
    // For PKCE tokens, use verifyOtp with token_hash set to the token value
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: token,
    })
    
    if (!error) {
      console.log('Email confirmation successful, redirecting to:', next)
      return NextResponse.redirect(new URL(next, request.url))
    }
    
    console.error('PKCE token verification error:', error)
  }

  // Handle legacy OTP flow (older Supabase email confirmations)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      console.log('Legacy OTP confirmation successful, redirecting to:', next)
      return NextResponse.redirect(new URL(next, request.url))
    }
    
    console.error('Legacy OTP verification error:', error)
  }

  console.error('No valid token found, redirecting to error page')
  // redirect the user to an error page with instructions
  return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
}