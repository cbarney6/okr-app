import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const token_hash = searchParams.get('token_hash')
    const code = searchParams.get('code')
    const type = searchParams.get('type') as EmailOtpType | null
    const next = searchParams.get('redirect_to') ?? '/onboarding'
    
    console.log('Auth confirm received:', {
      url: request.url,
      token: token ? `${token.substring(0, 20)}...` : null,
      token_hash: token_hash ? `${token_hash.substring(0, 20)}...` : null,
      code: code ? `${code.substring(0, 20)}...` : null,
      type,
      next
    })

    const supabase = await createClient()

    // Check if user is already authenticated (from Supabase /verify redirect)
    const { data: { user }, error: getUserError } = await supabase.auth.getUser()
    
    console.log('User check result:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      getUserError: getUserError?.message
    })
    
    if (user) {
      console.log('User already authenticated, redirecting to onboarding')
      return NextResponse.redirect(new URL(next, request.url))
    }

    // For authorization code flow (modern Supabase), use the 'code' parameter
    if (code) {
      console.log('Attempting authorization code exchange...')
      try {
        const { data, error: codeError } = await supabase.auth.exchangeCodeForSession(code)
        if (!codeError && data.session) {
          console.log('Authorization code exchange successful')
          return NextResponse.redirect(new URL(next, request.url))
        }
        console.log('Authorization code exchange failed:', codeError)
      } catch (e) {
        console.log('Authorization code exchange exception:', e)
      }
    }

    // For PKCE tokens (legacy flow), Supabase sends 'token' parameter
    if (token && type) {
      console.log('Attempting PKCE token verification...')
      
      // Try different approaches for PKCE token verification
      try {
        // Method 1: Use exchangeCodeForSession for PKCE
        const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(token)
        if (!sessionError && data.session) {
          console.log('PKCE exchangeCodeForSession successful')
          return NextResponse.redirect(new URL(next, request.url))
        }
        console.log('exchangeCodeForSession failed:', sessionError)
      } catch (e) {
        console.log('exchangeCodeForSession exception:', e)
      }

      // Method 2: Use verifyOtp with token as token_hash
      try {
        const { error: otpError } = await supabase.auth.verifyOtp({
          type,
          token_hash: token,
        })
        if (!otpError) {
          console.log('PKCE verifyOtp successful')
          return NextResponse.redirect(new URL(next, request.url))
        }
        console.log('verifyOtp with token failed:', otpError)
      } catch (e) {
        console.log('verifyOtp exception:', e)
      }
    }

    // For legacy token_hash (older flow)
    if (token_hash && type) {
      console.log('Attempting legacy token_hash verification...')
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      })

      if (!error) {
        console.log('Legacy token verification successful')
        return NextResponse.redirect(new URL(next, request.url))
      }
      
      console.error('Legacy token verification error:', error)
    }

    console.error('All verification methods failed')
    return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
    
  } catch (error) {
    console.error('Confirmation route error:', error)
    return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
  }
}