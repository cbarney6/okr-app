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

  // Handle PKCE flow (newer Supabase email confirmations)
  if (token && type === 'signup') {
    const { error } = await supabase.auth.exchangeCodeForSession(token)
    
    if (!error) {
      // User is now confirmed and logged in
      return NextResponse.redirect(new URL(next, request.url))
    }
    
    console.error('PKCE verification error:', error)
    return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
  }

  // Handle legacy OTP flow (older Supabase email confirmations)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
    
    console.error('OTP verification error:', error)
  }

  // redirect the user to an error page with instructions
  return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
}