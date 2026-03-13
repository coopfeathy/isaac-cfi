'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Item {
  id: string
  name: string
  description?: string
  price_cents?: number
  created_at?: string
}

function AddItemModal({ isOpen, onClose, onAdd }: { isOpen: boolean; onClose: () => void; onAdd: () => void }) {
  const [formData, setFormData] = useState({ name: '', description: '', price: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!formData.name.trim()) throw new Error('Item name is required')

      const priceCents = formData.price ? Math.round(parseFloat(formData.price) * 100) : 0

      const { error } = await supabase
        .from('items')
        .insert([{
          name: formData.name,
          description: formData.description || null,
          price_cents: priceCents,
        }])

      if (error) throw new Error(error.message)

      onAdd()
      setFormData({ name: '', description: '', price: '' })
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
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>Add New Item</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Item Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', minHeight: '80px', fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Price ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
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
              {loading ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('name', { ascending: true })
      
      if (error) throw error
      setItems(data || [])
    } catch (err) {
      console.error('Error loading items:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId)

      if (error) throw error
      setItems(items.filter(i => i.id !== itemId))
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  return (
    <div style={{ padding: 0 }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0 }}>Items</h1>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            style={{ backgroundColor: '#C59A2A', color: '#fff', padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
          >
            + Add Item
          </button>
        </div>
      </div>
      
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>Loading items...</div>
        ) : items.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>No items found. <br /><a href="#" onClick={() => setIsAddModalOpen(true)} style={{ color: '#C59A2A' }}>Add your first item</a></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Description</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Price</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', fontWeight: 500 }}>{item.name}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{item.description || '-'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                      {item.price_cents !== undefined ? `$${(item.price_cents / 100).toFixed(2)}` : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px' }}>
                      <a href="#" style={{ color: '#C59A2A', textDecoration: 'none', fontWeight: 500, marginRight: '16px' }}>Edit</a>
                      <a href="#" onClick={() => handleDeleteItem(item.id)} style={{ color: '#dc2626', textDecoration: 'none', fontWeight: 500 }}>Delete</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddItemModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={() => loadItems()} />
    </div>
  )
}
