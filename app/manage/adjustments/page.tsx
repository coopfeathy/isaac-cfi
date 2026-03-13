'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Adjustment {
  id: string
  user_id: string
  profiles?: { full_name: string | null }
  amount_cents: number
  type: string
  description?: string
  created_at?: string
}

function AddAdjustmentModal({ isOpen, onClose, onAdd, users }: { isOpen: boolean; onClose: () => void; onAdd: () => void; users: any[] }) {
  const [formData, setFormData] = useState({ user_id: '', amount: '', type: 'adjustment', description: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!formData.user_id) throw new Error('Please select a user')
      if (!formData.amount) throw new Error('Amount is required')

      const amountCents = Math.round(parseFloat(formData.amount) * 100)
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('transactions')
        .insert([{
          user_id: formData.user_id,
          amount_cents: amountCents,
          type: formData.type,
          description: formData.description || null,
          created_by: user?.id,
        }])

      if (error) throw new Error(error.message)

      // Update user balance
      const currentUser = users.find(u => u.id === formData.user_id)
      const newBalance = (currentUser?.balance_cents || 0) + amountCents

      await supabase
        .from('profiles')
        .update({ balance_cents: newBalance })
        .eq('id', formData.user_id)

      onAdd()
      setFormData({ user_id: '', amount: '', type: 'adjustment', description: '' })
      onClose()
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
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>Add Balance Adjustment</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>User *</label>
            <select
              required
              value={formData.user_id}
              onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
            >
              <option value="">Select a user...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.full_name || 'Unnamed'}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Amount ($) *</label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
            >
              <option value="adjustment">Adjustment</option>
              <option value="payment">Payment</option>
              <option value="charge">Charge</option>
            </select>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', minHeight: '80px', fontFamily: 'inherit' }}
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
              {loading ? 'Adding...' : 'Add Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  useEffect(() => {
    Promise.all([loadAdjustments(), loadUsers()])
  }, [])

  async function loadAdjustments() {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, profiles:user_id(full_name)')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setAdjustments(data || [])
    } catch (err) {
      console.error('Error loading adjustments:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadUsers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, balance_cents')
        .order('full_name', { ascending: true })
      
      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Error loading users:', err)
    }
  }

  const handleDeleteAdjustment = async (adjustmentId: string) => {
    if (!confirm('Are you sure you want to delete this adjustment?')) return

    try {
      // Get the adjustment to reverse the balance change
      const adjustment = adjustments.find(a => a.id === adjustmentId)
      if (adjustment) {
        const user = users.find(u => u.id === adjustment.user_id)
        const newBalance = (user?.balance_cents || 0) - adjustment.amount_cents
        
        await supabase
          .from('profiles')
          .update({ balance_cents: newBalance })
          .eq('id', adjustment.user_id)
      }

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', adjustmentId)

      if (error) throw error
      await loadAdjustments()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  return (
    <div style={{ padding: 0 }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0 }}>Adjustments</h1>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            style={{ backgroundColor: '#C59A2A', color: '#fff', padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
          >
            + Add Adjustment
          </button>
        </div>
      </div>
      
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>Loading adjustments...</div>
        ) : adjustments.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>No adjustments found. <br /><a href="#" onClick={() => setIsAddModalOpen(true)} style={{ color: '#C59A2A' }}>Make your first adjustment</a></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>User</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Type</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Amount</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Description</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Date</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map((adjustment) => (
                  <tr key={adjustment.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', fontWeight: 500 }}>{adjustment.profiles?.full_name || 'Unknown'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                      <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '4px', backgroundColor: '#dbeafe', color: '#0369a1', textTransform: 'capitalize' }}>
                        {adjustment.type}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: adjustment.amount_cents < 0 ? '#dc2626' : '#059669' }}>
                      {adjustment.amount_cents < 0 ? '-' : '+'}${Math.abs(adjustment.amount_cents / 100).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{adjustment.description || '-'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>
                      {adjustment.created_at ? new Date(adjustment.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px' }}>
                      <a href="#" onClick={() => handleDeleteAdjustment(adjustment.id)} style={{ color: '#dc2626', textDecoration: 'none', fontWeight: 500 }}>Delete</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddAdjustmentModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={() => loadAdjustments()} users={users} />
    </div>
  )
}
