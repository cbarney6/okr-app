'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

interface OnboardingComponentProps {
  userId: string
  email: string
  prefilledData: {
    full_name?: string
    organization_id?: string
    invitation_token?: string
  }
}

export default function OnboardingComponent({ 
  userId, 
  email, 
  prefilledData 
}: OnboardingComponentProps) {
  const [fullName, setFullName] = useState(prefilledData.full_name || '')
  const [title, setTitle] = useState('')
  const [phone, setPhone] = useState('')
  const [organizationChoice, setOrganizationChoice] = useState<'new' | 'existing' | 'suggested'>('new')
  const [organizationName, setOrganizationName] = useState('')
  const [organizationId, setOrganizationId] = useState('')
  const [companyWebsite, setCompanyWebsite] = useState('')
  const [suggestedOrg, setSuggestedOrg] = useState<{id: string, name: string} | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkingOrg, setCheckingOrg] = useState(true)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkForExistingOrganization()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const checkForExistingOrganization = async () => {
    setCheckingOrg(true)
    try {
      // If user has a pre-assigned organization from invitation
      if (prefilledData.organization_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', prefilledData.organization_id)
          .single()
        
        if (org) {
          setOrganizationChoice('existing')
          setOrganizationId(org.id)
          setOrganizationName(org.name)
          setCheckingOrg(false)
          return
        }
      }

      // Check if email domain matches any organization
      const emailDomain = email.split('@')[1]
      if (emailDomain) {
        // Extract the main domain (e.g., 'example' from 'example.com')
        const domainName = emailDomain.split('.')[0]
        
        const { data: orgs } = await supabase
          .from('organizations')
          .select('*')
          .or(`name.ilike.%${domainName}%,slug.ilike.%${domainName}%`)
        
        if (orgs && orgs.length > 0) {
          // Suggest the first matching organization
          setSuggestedOrg(orgs[0])
          setOrganizationChoice('suggested')
        }
      }
    } catch (err) {
      console.error('Error checking organization:', err)
    } finally {
      setCheckingOrg(false)
    }
  }

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
      let finalOrganizationId: string

      if (organizationChoice === 'new') {
        // Validate organization name
        if (!organizationName.trim()) {
          throw new Error('Organization name is required')
        }

        // Check if organization already exists
        const { data: existingOrg } = await supabase
          .from('organizations')
          .select('id')
          .ilike('name', organizationName)
          .single()
        
        if (existingOrg) {
          throw new Error('An organization with this name already exists')
        }

        // Create new organization
        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: organizationName,
            slug: generateUniqueSlug(organizationName),
            created_by: userId
          })
          .select()
          .single()

        if (orgError) throw orgError
        finalOrganizationId = newOrg.id

      } else if (organizationChoice === 'existing') {
        // Validate organization ID or name
        if (!organizationId && !organizationName) {
          throw new Error('Please enter an organization name or ID')
        }

        // Find the organization
        let query = supabase.from('organizations').select('*')
        
        if (organizationId) {
          query = query.eq('id', organizationId)
        } else {
          query = query.ilike('name', organizationName)
        }
        
        const { data: org, error: orgError } = await query.single()
        
        if (orgError || !org) {
          throw new Error('Organization not found. Please check the name or ID.')
        }
        
        finalOrganizationId = org.id

      } else if (organizationChoice === 'suggested' && suggestedOrg) {
        finalOrganizationId = suggestedOrg.id
      } else {
        throw new Error('Please select an organization option')
      }

      // Determine user role
      const { data: existingProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('organization_id', finalOrganizationId)
      
      const isFirstUser = !existingProfiles || existingProfiles.length === 0
      const userRoles = isFirstUser ? ['admin'] : ['user']

      // Create user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          full_name: fullName,
          email: email,
          title: title || null,
          phone: phone || null,
          company_website: companyWebsite || null,
          organization_id: finalOrganizationId,
          roles: userRoles
        })

      if (profileError) throw profileError

      // If invitation was used, mark it as accepted
      if (prefilledData.invitation_token) {
        await supabase
          .from('user_invitations')
          .update({ accepted_at: new Date().toISOString() })
          .eq('token', prefilledData.invitation_token)
      }

      // Redirect to dashboard
      router.push('/dashboard')

    } catch (err) {
      console.error('Onboarding error:', err)
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding')
    } finally {
      setLoading(false)
    }
  }

  if (checkingOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Complete Your Profile
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Set up your profile and organization to get started
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
            
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
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                disabled
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md bg-gray-100"
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
          </div>

          {/* Organization Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Organization</h3>
            
            {prefilledData.organization_id ? (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <p className="text-sm text-blue-800">
                  You&apos;ve been invited to join <strong>{organizationName}</strong>
                </p>
              </div>
            ) : (
              <>
                {suggestedOrg && (
                  <div className="space-y-2">
                    <label className="flex items-start">
                      <input
                        type="radio"
                        name="orgChoice"
                        value="suggested"
                        checked={organizationChoice === 'suggested'}
                        onChange={() => setOrganizationChoice('suggested')}
                        className="mt-1 mr-2"
                      />
                      <div>
                        <p className="font-medium">Join {suggestedOrg.name}</p>
                        <p className="text-sm text-gray-600">
                          Based on your email domain, you may belong to this organization
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="flex items-start">
                    <input
                      type="radio"
                      name="orgChoice"
                      value="existing"
                      checked={organizationChoice === 'existing'}
                      onChange={() => setOrganizationChoice('existing')}
                      className="mt-1 mr-2"
                    />
                    <div className="flex-1">
                      <p className="font-medium">Join Existing Organization</p>
                      <p className="text-sm text-gray-600 mb-2">
                        Enter the organization name or ID
                      </p>
                      {organizationChoice === 'existing' && (
                        <input
                          type="text"
                          value={organizationName}
                          onChange={(e) => setOrganizationName(e.target.value)}
                          className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Organization name or ID"
                        />
                      )}
                    </div>
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="flex items-start">
                    <input
                      type="radio"
                      name="orgChoice"
                      value="new"
                      checked={organizationChoice === 'new'}
                      onChange={() => setOrganizationChoice('new')}
                      className="mt-1 mr-2"
                    />
                    <div className="flex-1">
                      <p className="font-medium">Create New Organization</p>
                      <p className="text-sm text-gray-600 mb-2">
                        You&apos;ll be the admin of this organization
                      </p>
                      {organizationChoice === 'new' && (
                        <>
                          <input
                            type="text"
                            value={organizationName}
                            onChange={(e) => setOrganizationName(e.target.value)}
                            className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Organization name"
                            required={organizationChoice === 'new'}
                          />
                          <input
                            type="url"
                            value={companyWebsite}
                            onChange={(e) => setCompanyWebsite(e.target.value)}
                            className="mt-2 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="https://www.example.com (optional)"
                          />
                        </>
                      )}
                    </div>
                  </label>
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
              {loading ? 'Setting up...' : 'Complete Setup'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}