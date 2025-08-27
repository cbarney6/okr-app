import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout'
import { Settings as SettingsIcon, User, Bell, Shield, Database, Palette } from 'lucide-react'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const settingsSections = [
    {
      icon: User,
      title: 'Account Settings',
      description: 'Manage your personal account preferences and security',
      items: ['Profile Information', 'Password & Security', 'Email Preferences']
    },
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Configure when and how you receive notifications',
      items: ['Email Notifications', 'Push Notifications', 'Reminder Settings']
    },
    {
      icon: Shield,
      title: 'Privacy & Security',
      description: 'Control your data privacy and security settings',
      items: ['Data Privacy', 'Access Controls', 'Session Management']
    },
    {
      icon: Database,
      title: 'Organization Settings',
      description: 'Manage organization-wide settings and preferences',
      items: ['General Settings', 'User Roles', 'Data Management'],
      adminOnly: true
    },
    {
      icon: Palette,
      title: 'Appearance',
      description: 'Customize the look and feel of your workspace',
      items: ['Theme Settings', 'Dashboard Layout', 'Color Preferences']
    }
  ]

  return (
    <AuthenticatedLayout pageTitle="Settings">
      <div className="px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your account and application preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {settingsSections.map((section, index) => {
            const IconComponent = section.icon
            return (
              <div key={index} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <IconComponent className="h-6 w-6 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{section.title}</h3>
                      {section.adminOnly && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          Admin Only
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-4">{section.description}</p>
                    <div className="space-y-2">
                      {section.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                          <span className="text-sm text-gray-700">{item}</span>
                          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                            Configure
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* System Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <SettingsIcon className="h-5 w-5 mr-2 text-gray-500" />
            System Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Application Version:</span>
              <span className="text-gray-900 font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Last Updated:</span>
              <span className="text-gray-900 font-medium">December 2024</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Environment:</span>
              <span className="text-gray-900 font-medium">Production</span>
            </div>
          </div>
        </div>

        {/* Development Status Notice */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <SettingsIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800 mb-1">Settings Under Development</h4>
              <p className="text-sm text-yellow-700">
                Comprehensive settings functionality will be implemented in future development cycles. 
                Current placeholder shows the planned settings structure and organization.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}