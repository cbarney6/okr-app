'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

interface SignupComponentProps {
  invitationToken?: string
  prefilledEmail?: string
  prefilledOrganization?: string
}

export default function SignupComponent({ 
  invitationToken, 
  prefilledEmail, 
  prefilledOrganization 
}: SignupComponentProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState(prefilledEmail || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [title, setTitle] = useState('')
  const [phone, setPhone] = useState('')
  const [companyName, setCompanyName] = useState(prefilledOrganization || '')
  const [companyWebsite, setCompanyWebsite] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isInvitation] = useState(!!invitationToken)

  const router = useRouter()
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Email validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Check if organization name already exists
  const checkOrganizationExists = async (name: string) => {
    const { data, error } = await supabase
      .from('organizations')
      .select('id')
      .ilike('name', name)
      .single()
    
    return !error && data
  }

  // Generate unique slug
  const generateUniqueSlug = (name: string) => {
    const baseSlug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim()
    
    const randomBytes = new Uint8Array(4)
    crypto.getRandomValues(randomBytes)
    const randomSuffix = Array.from(randomBytes, byte => byte.toString(36)).join('')
    return `${baseSlug}-${randomSuffix}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validation
      if (!validateEmail(email)) {
        throw new Error('Please enter a valid email address')
      }
      
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match')
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long')
      }

      if (!isInvitation) {
        // Check for duplicate organization name
        const orgExists = await checkOrganizationExists(companyName)
        if (orgExists) {
          throw new Error('An organization with this name already exists. Please choose a different name.')
        }
      }

      let organizationId: string

      if (isInvitation && invitationToken) {
        // Handle invitation signup
        const { data: invitation, error: invError } = await supabase
          .from('user_invitations')
          .select('organization_id, expires_at')
          .eq('token', invitationToken)
          .eq('email', email)
          .single()

        if (invError || !invitation) {
          throw new Error('Invalid or expired invitation')
        }

        if (new Date() > new Date(invitation.expires_at)) {
          throw new Error('This invitation has expired')
        }

        organizationId = invitation.organization_id
      } else {
        // Create new organization for first user
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: companyName,
            slug: generateUniqueSlug(companyName),
            created_by: null // Will be updated after user creation
          })
          .select()
          .single()

        if (orgError) throw orgError
        organizationId = orgData.id
      }

      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            organization_id: organizationId
          }
        }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create user account')

      // Create profile
      const userRoles = isInvitation ? ['user'] : ['admin'] // First user is admin
      
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          full_name: fullName,
          email: email,
          title: title || null,
          phone: phone || null,
          company_website: companyWebsite || null,
          organization_id: organizationId,
          roles: userRoles
        })

      if (profileError) throw profileError

      // Update organization created_by if this is the first user
      if (!isInvitation) {
        await supabase
          .from('organizations')
          .update({ created_by: authData.user.id })
          .eq('id', organizationId)
      }

      // Mark invitation as accepted if this was an invitation signup
      if (isInvitation && invitationToken) {
        await supabase
          .from('user_invitations')
          .update({ accepted_at: new Date().toISOString() })
          .eq('token', invitationToken)
      }

      // Redirect to dashboard
      router.push('/dashboard')

    } catch (err) {
      console.error('Signup error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            {isInvitation ? 'Join Your Team' : 'Create Your Account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isInvitation 
              ? 'Complete your profile to access your organization'
              : 'Start your OKR journey by setting up your organization'
            }
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="full-name" className="block text-sm font-medium text-gray-700">
                Full Name *
              </label>
              <input
                id="full-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email *
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isInvitation}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="your.email@company.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password *
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                Confirm Password *
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirm your password"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Job Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., CEO, Manager, Developer"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            {!isInvitation && (
              <>
                <div>
                  <label htmlFor="company-name" className="block text-sm font-medium text-gray-700">
                    Company / Organization Name *
                  </label>
                  <input
                    id="company-name"
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Your company name"
                  />
                </div>

                <div>
                  <label htmlFor="company-website" className="block text-sm font-medium text-gray-700">
                    Company Website
                  </label>
                  <input
                    id="company-website"
                    type="url"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://www.yourcompany.com"
                  />
                </div>
              </>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : (isInvitation ? 'Join Team' : 'Create Account')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}