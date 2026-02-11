'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestSupabase() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testConnection = async () => {
    setLoading(true)
    try {
      // Test basic connectivity
      const { data, error } = await supabase.auth.getSession()
      setResult({ 
        success: true, 
        message: 'Supabase connection successful!',
        session: data.session ? 'Active session' : 'No active session',
        error: error?.message 
      })
    } catch (err: any) {
      setResult({ 
        success: false, 
        message: 'Connection failed',
        error: err.message 
      })
    } finally {
      setLoading(false)
    }
  }

  const testEmailAuth = async () => {
    setLoading(true)
    try {
      const testEmail = 'test@example.com'
      const { data, error } = await supabase.auth.signInWithOtp({
        email: testEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      setResult({ 
        success: !error, 
        message: error ? 'Email auth failed' : 'Email auth works! (Check spam for test email)',
        error: error?.message,
        data: data 
      })
    } catch (err: any) {
      setResult({ 
        success: false, 
        message: 'Email auth test failed',
        error: err.message 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Supabase Connection Test</h1>
        
        <div className="space-y-4 mb-8">
          <button
            onClick={testConnection}
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Basic Connection'}
          </button>

          <button
            onClick={testEmailAuth}
            disabled={loading}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Email Auth (sends test email)'}
          </button>
        </div>

        {result && (
          <div className={`p-6 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <h2 className={`text-xl font-bold mb-4 ${result.success ? 'text-green-900' : 'text-red-900'}`}>
              {result.message}
            </h2>
            {result.error && (
              <div className="mb-4">
                <p className="font-semibold text-sm">Error:</p>
                <code className="block mt-2 p-3 bg-white rounded text-sm">{result.error}</code>
              </div>
            )}
            {result.session && (
              <div className="mb-4">
                <p className="font-semibold text-sm">Session:</p>
                <code className="block mt-2 p-3 bg-white rounded text-sm">{result.session}</code>
              </div>
            )}
            {result.data && (
              <div>
                <p className="font-semibold text-sm">Response Data:</p>
                <pre className="mt-2 p-3 bg-white rounded text-xs overflow-auto">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-bold text-blue-900 mb-2">Configuration Checklist:</h3>
          <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
            <li>Email provider enabled in Supabase Dashboard</li>
            <li>Site URL: <code className="bg-blue-100 px-1">http://localhost:3000</code></li>
            <li>Redirect URL: <code className="bg-blue-100 px-1">http://localhost:3000/auth/callback</code></li>
            <li>Magic Link email template configured</li>
          </ul>
          <a 
            href="https://supabase.com/dashboard/project/fwttykpznnoupoxowvlg/auth/providers" 
            target="_blank"
            className="inline-block mt-4 text-blue-600 hover:text-blue-800 underline"
          >
            Open Supabase Auth Settings →
          </a>
        </div>
      </div>
    </div>
  )
}
