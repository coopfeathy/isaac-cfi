'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Admin {
  id: string
  full_name: string | null
  email: string | null
  created_at?: string
}

function AddAdminModal({ isOpen, onClose, onAdd }: { isOpen: boolean; onClose: () => void; onAdd: () => void }) {
  const [formData, setFormData] = useState({ full_name: '', email: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const password = Math.random().toString(36).slice(-12)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: password,
      })

      if (authError) throw new Error(authError.message)

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user.id,
              full_name: formData.full_name,
              is_admin: true,
            },
          ])

        if (profileError) throw new Error(profileError.message)

        onAdd()
        setFormData({ full_name: '', email: '' })
        onClose()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '32px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>Add New Administrator</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Full Name</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          {error && <div style={{ color: '#dc2626', fontSize: '14px', marginBottom: '16px' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '10px 20px', backgroundColor: '#C59A2A', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, border: 'none' }}
            >
              {loading ? 'Adding...' : 'Add Administrator'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdministratorsPage() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  useEffect(() => {
    loadAdmins()
  }, [])

  async function loadAdmins() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_admin', true)
        .order('full_name', { ascending: true })
      
      if (error) throw error
      setAdmins(data || [])
    } catch (err) {
      console.error('Error loading admins:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAdmin = async (adminId: string) => {
    if (!confirm('Are you sure you want to remove admin privileges?')) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: false })
        .eq('id', adminId)

      if (error) throw error
      setAdmins(admins.filter(a => a.id !== adminId))
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  return (
    <div style={{ padding: 0 }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0 }}>Administrators</h1>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            style={{ backgroundColor: '#C59A2A', color: '#fff', padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
          >
            + Add Administrator
          </button>
        </div>
      </div>
      
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>Loading administrators...</div>
        ) : admins.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>No administrators found. <br /><a href="#" onClick={() => setIsAddModalOpen(true)} style={{ color: '#C59A2A' }}>Add your first administrator</a></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Email</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', fontWeight: 500 }}>{admin.full_name || 'Unnamed'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{admin.email || '-'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px' }}>
                      <a href="#" onClick={() => handleDeleteAdmin(admin.id)} style={{ color: '#dc2626', textDecoration: 'none', fontWeight: 500 }}>Remove</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddAdminModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={() => loadAdmins()} />
    </div>
  )
}
