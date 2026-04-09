'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Instructor {
  id: string
  full_name: string | null
  phone: string | null
  email?: string
  created_at?: string
}

interface Admin {
  id: string
  full_name: string | null
  email: string | null
  created_at?: string
}

interface Adjustment {
  id: string
  user_id: string
  profiles?: { full_name: string | null }
  amount_cents: number
  type: string
  description?: string
  created_at?: string
}

interface Form {
  id: string
  name: string
  description?: string
  url?: string
  created_at?: string
}

interface Group {
  id: string
  name: string
  description?: string
  created_at?: string
}

interface Item {
  id: string
  name: string
  description?: string
  price_cents?: number
  created_at?: string
}

type SubSection = 'courses' | 'instructors' | 'administrators' | 'adjustments' | 'forms' | 'groups' | 'items'

// ─── Add Instructor Modal ─────────────────────────────────────────────────────

function AddInstructorModal({ isOpen, onClose, onAdd }: { isOpen: boolean; onClose: () => void; onAdd: () => void }) {
  const [formData, setFormData] = useState({ full_name: '', phone: '', email: '' })
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
        password,
      })
      if (authError) throw new Error(authError.message)
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{ id: authData.user.id, full_name: formData.full_name, phone: formData.phone, is_instructor: true }])
        if (profileError) throw new Error(profileError.message)
        onAdd()
        setFormData({ full_name: '', phone: '', email: '' })
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-lg w-11/12 shadow-xl">
        <h2 className="text-xl font-bold mb-5">Add New Instructor</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Email *</label>
            <input type="email" required value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Full Name</label>
            <input type="text" value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Phone</label>
            <input type="tel" value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm" />
          </div>
          {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose}
              className="px-5 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading}
              className="px-5 py-2 bg-golden text-white rounded text-sm font-semibold disabled:opacity-60">
              {loading ? 'Adding...' : 'Add Instructor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Add Admin Modal ──────────────────────────────────────────────────────────

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
        password,
      })
      if (authError) throw new Error(authError.message)
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{ id: authData.user.id, full_name: formData.full_name, is_admin: true }])
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-lg w-11/12 shadow-xl">
        <h2 className="text-xl font-bold mb-5">Add New Administrator</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Email *</label>
            <input type="email" required value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Full Name</label>
            <input type="text" value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm" />
          </div>
          {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose}
              className="px-5 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading}
              className="px-5 py-2 bg-golden text-white rounded text-sm font-semibold disabled:opacity-60">
              {loading ? 'Adding...' : 'Add Administrator'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Add Adjustment Modal ─────────────────────────────────────────────────────

function AddAdjustmentModal({ isOpen, onClose, onAdd, users }: {
  isOpen: boolean; onClose: () => void; onAdd: () => void; users: any[]
}) {
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
      const { error: txErr } = await supabase
        .from('transactions')
        .insert([{ user_id: formData.user_id, amount_cents: amountCents, type: formData.type, description: formData.description || null, created_by: user?.id }])
      if (txErr) throw new Error(txErr.message)
      const currentUser = users.find(u => u.id === formData.user_id)
      const newBalance = (currentUser?.balance_cents || 0) + amountCents
      await supabase.from('profiles').update({ balance_cents: newBalance }).eq('id', formData.user_id)
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-lg w-11/12 shadow-xl">
        <h2 className="text-xl font-bold mb-5">Add Balance Adjustment</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">User *</label>
            <select required value={formData.user_id}
              onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm">
              <option value="">Select a user...</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || 'Unnamed'}</option>)}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Amount ($) *</label>
            <input type="number" step="0.01" required value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Type</label>
            <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm">
              <option value="adjustment">Adjustment</option>
              <option value="payment">Payment</option>
              <option value="charge">Charge</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3} className="w-full px-3 py-2 border border-gray-300 rounded text-sm" />
          </div>
          {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose}
              className="px-5 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading}
              className="px-5 py-2 bg-golden text-white rounded text-sm font-semibold disabled:opacity-60">
              {loading ? 'Adding...' : 'Add Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Add Form Modal ───────────────────────────────────────────────────────────

function AddFormModal({ isOpen, onClose, onAdd }: { isOpen: boolean; onClose: () => void; onAdd: () => void }) {
  const [formData, setFormData] = useState({ name: '', description: '', url: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (!formData.name.trim()) throw new Error('Form name is required')
      const { error: insertErr } = await supabase
        .from('forms')
        .insert([{ name: formData.name, description: formData.description || null, url: formData.url || null }])
      if (insertErr) throw new Error(insertErr.message)
      onAdd()
      setFormData({ name: '', description: '', url: '' })
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-lg w-11/12 shadow-xl">
        <h2 className="text-xl font-bold mb-5">Add New Form</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Form Name *</label>
            <input type="text" required value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3} className="w-full px-3 py-2 border border-gray-300 rounded text-sm" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Form URL</label>
            <input type="url" value={formData.url} placeholder="https://..."
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm" />
          </div>
          {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose}
              className="px-5 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading}
              className="px-5 py-2 bg-golden text-white rounded text-sm font-semibold disabled:opacity-60">
              {loading ? 'Adding...' : 'Add Form'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Add Group Modal ──────────────────────────────────────────────────────────

function AddGroupModal({ isOpen, onClose, onAdd }: { isOpen: boolean; onClose: () => void; onAdd: () => void }) {
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (!formData.name.trim()) throw new Error('Group name is required')
      const { error: insertErr } = await supabase
        .from('groups')
        .insert([{ name: formData.name, description: formData.description || null }])
      if (insertErr) throw new Error(insertErr.message)
      onAdd()
      setFormData({ name: '', description: '' })
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-lg w-11/12 shadow-xl">
        <h2 className="text-xl font-bold mb-5">Add New Group</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Group Name *</label>
            <input type="text" required value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3} className="w-full px-3 py-2 border border-gray-300 rounded text-sm" />
          </div>
          {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose}
              className="px-5 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading}
              className="px-5 py-2 bg-golden text-white rounded text-sm font-semibold disabled:opacity-60">
              {loading ? 'Adding...' : 'Add Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Add Item Modal ───────────────────────────────────────────────────────────

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
      const { error: insertErr } = await supabase
        .from('items')
        .insert([{ name: formData.name, description: formData.description || null, price_cents: priceCents }])
      if (insertErr) throw new Error(insertErr.message)
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-lg w-11/12 shadow-xl">
        <h2 className="text-xl font-bold mb-5">Add New Item</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Item Name *</label>
            <input type="text" required value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3} className="w-full px-3 py-2 border border-gray-300 rounded text-sm" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Price ($)</label>
            <input type="number" step="0.01" min="0" value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm" />
          </div>
          {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose}
              className="px-5 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading}
              className="px-5 py-2 bg-golden text-white rounded text-sm font-semibold disabled:opacity-60">
              {loading ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main SettingsTab ─────────────────────────────────────────────────────────

export default function SettingsTab() {
  const [activeSubSection, setActiveSubSection] = useState<SubSection>('courses')

  // ── Courses state ──
  const [courses, setCourses] = useState<any[]>([])
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null)
  const [editingCourseTitle, setEditingCourseTitle] = useState('')
  const [editingCourseDescription, setEditingCourseDescription] = useState('')
  const [savingCourseId, setSavingCourseId] = useState<string | null>(null)
  const [courseMessage, setCourseMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // ── Instructors state ──
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [instructorsLoaded, setInstructorsLoaded] = useState(false)
  const [instructorsLoading, setInstructorsLoading] = useState(false)
  const [isAddInstructorOpen, setIsAddInstructorOpen] = useState(false)

  // ── Administrators state ──
  const [admins, setAdmins] = useState<Admin[]>([])
  const [adminsLoaded, setAdminsLoaded] = useState(false)
  const [adminsLoading, setAdminsLoading] = useState(false)
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false)

  // ── Adjustments state ──
  const [adjustments, setAdjustments] = useState<Adjustment[]>([])
  const [adjustmentUsers, setAdjustmentUsers] = useState<any[]>([])
  const [adjustmentsLoaded, setAdjustmentsLoaded] = useState(false)
  const [adjustmentsLoading, setAdjustmentsLoading] = useState(false)
  const [isAddAdjustmentOpen, setIsAddAdjustmentOpen] = useState(false)

  // ── Forms state ──
  const [forms, setForms] = useState<Form[]>([])
  const [formsLoaded, setFormsLoaded] = useState(false)
  const [formsLoading, setFormsLoading] = useState(false)
  const [isAddFormOpen, setIsAddFormOpen] = useState(false)

  // ── Groups state ──
  const [groups, setGroups] = useState<Group[]>([])
  const [groupsLoaded, setGroupsLoaded] = useState(false)
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false)

  // ── Items state ──
  const [items, setItems] = useState<Item[]>([])
  const [itemsLoaded, setItemsLoaded] = useState(false)
  const [itemsLoading, setItemsLoading] = useState(false)
  const [isAddItemOpen, setIsAddItemOpen] = useState(false)

  // ── Load courses on mount ──
  useEffect(() => {
    fetchCourses()
  }, [])

  // ── Lazy load sub-sections when first visited ──
  useEffect(() => {
    if (activeSubSection === 'instructors' && !instructorsLoaded) fetchInstructors()
    if (activeSubSection === 'administrators' && !adminsLoaded) fetchAdmins()
    if (activeSubSection === 'adjustments' && !adjustmentsLoaded) fetchAdjustments()
    if (activeSubSection === 'forms' && !formsLoaded) fetchForms()
    if (activeSubSection === 'groups' && !groupsLoaded) fetchGroups()
    if (activeSubSection === 'items' && !itemsLoaded) fetchItems()
  }, [activeSubSection])

  // ── Courses ────────────────────────────────────────────────────────────────

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, description, is_published, created_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      setCourses(data || [])
    } catch (error) {
      console.error('Error fetching courses:', error)
      setCourseMessage({ type: 'error', text: 'Error loading courses' })
    }
  }

  const handleSaveCourse = async (courseId: string) => {
    if (!editingCourseTitle.trim()) {
      setCourseMessage({ type: 'error', text: 'Course name cannot be empty' })
      return
    }
    setSavingCourseId(courseId)
    try {
      const { error } = await supabase
        .from('courses')
        .update({ title: editingCourseTitle, description: editingCourseDescription })
        .eq('id', courseId)
      if (error) throw error
      setCourses(courses.map((c) =>
        c.id === courseId ? { ...c, title: editingCourseTitle, description: editingCourseDescription } : c
      ))
      setEditingCourseId(null)
      setCourseMessage({ type: 'success', text: 'Course updated successfully' })
      setTimeout(() => setCourseMessage(null), 3000)
    } catch (error) {
      console.error('Error updating course:', error)
      setCourseMessage({ type: 'error', text: 'Failed to update course' })
    } finally {
      setSavingCourseId(null)
    }
  }

  // ── Instructors ────────────────────────────────────────────────────────────

  const fetchInstructors = async () => {
    setInstructorsLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone, email, created_at')
        .eq('is_instructor', true)
        .order('full_name', { ascending: true })
      if (error) throw error
      setInstructors(data || [])
      setInstructorsLoaded(true)
    } catch (err) {
      console.error('Error loading instructors:', err)
    } finally {
      setInstructorsLoading(false)
    }
  }

  const handleRevokeInstructor = async (instructorId: string) => {
    if (!confirm('Remove instructor privileges from this user?')) return
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_instructor: false })
        .eq('id', instructorId)
      if (error) throw error
      setInstructors(instructors.filter(i => i.id !== instructorId))
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  // ── Administrators ─────────────────────────────────────────────────────────

  const fetchAdmins = async () => {
    setAdminsLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at')
        .eq('is_admin', true)
        .order('full_name', { ascending: true })
      if (error) throw error
      setAdmins(data || [])
      setAdminsLoaded(true)
    } catch (err) {
      console.error('Error loading admins:', err)
    } finally {
      setAdminsLoading(false)
    }
  }

  const handleRevokeAdmin = async (adminId: string) => {
    if (!confirm('Remove admin privileges from this user?')) return
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

  // ── Adjustments ────────────────────────────────────────────────────────────

  const fetchAdjustments = async () => {
    setAdjustmentsLoading(true)
    try {
      const [adjResult, usersResult] = await Promise.all([
        supabase.from('transactions').select('*, profiles:user_id(full_name)').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name, balance_cents').order('full_name', { ascending: true }),
      ])
      if (adjResult.error) throw adjResult.error
      setAdjustments(adjResult.data || [])
      setAdjustmentUsers(usersResult.data || [])
      setAdjustmentsLoaded(true)
    } catch (err) {
      console.error('Error loading adjustments:', err)
    } finally {
      setAdjustmentsLoading(false)
    }
  }

  const handleDeleteAdjustment = async (adjustmentId: string) => {
    if (!confirm('Delete this adjustment?')) return
    try {
      const adjustment = adjustments.find(a => a.id === adjustmentId)
      if (adjustment) {
        const user = adjustmentUsers.find(u => u.id === adjustment.user_id)
        const newBalance = (user?.balance_cents || 0) - adjustment.amount_cents
        await supabase.from('profiles').update({ balance_cents: newBalance }).eq('id', adjustment.user_id)
      }
      const { error } = await supabase.from('transactions').delete().eq('id', adjustmentId)
      if (error) throw error
      await fetchAdjustments()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  // ── Forms ──────────────────────────────────────────────────────────────────

  const fetchForms = async () => {
    setFormsLoading(true)
    try {
      const { data, error } = await supabase.from('forms').select('*').order('name', { ascending: true })
      if (error) throw error
      setForms(data || [])
      setFormsLoaded(true)
    } catch (err) {
      console.error('Error loading forms:', err)
    } finally {
      setFormsLoading(false)
    }
  }

  const handleDeleteForm = async (formId: string) => {
    if (!confirm('Delete this form?')) return
    try {
      const { error } = await supabase.from('forms').delete().eq('id', formId)
      if (error) throw error
      setForms(forms.filter(f => f.id !== formId))
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  // ── Groups ─────────────────────────────────────────────────────────────────

  const fetchGroups = async () => {
    setGroupsLoading(true)
    try {
      const { data, error } = await supabase.from('groups').select('*').order('name', { ascending: true })
      if (error) throw error
      setGroups(data || [])
      setGroupsLoaded(true)
    } catch (err) {
      console.error('Error loading groups:', err)
    } finally {
      setGroupsLoading(false)
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Delete this group?')) return
    try {
      const { error } = await supabase.from('groups').delete().eq('id', groupId)
      if (error) throw error
      setGroups(groups.filter(g => g.id !== groupId))
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  // ── Items ──────────────────────────────────────────────────────────────────

  const fetchItems = async () => {
    setItemsLoading(true)
    try {
      const { data, error } = await supabase.from('items').select('*').order('name', { ascending: true })
      if (error) throw error
      setItems(data || [])
      setItemsLoaded(true)
    } catch (err) {
      console.error('Error loading items:', err)
    } finally {
      setItemsLoading(false)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Delete this item?')) return
    try {
      const { error } = await supabase.from('items').delete().eq('id', itemId)
      if (error) throw error
      setItems(items.filter(i => i.id !== itemId))
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  // ── Sub-section nav pills ─────────────────────────────────────────────────

  const subSections: { key: SubSection; label: string }[] = [
    { key: 'courses', label: 'Courses' },
    { key: 'instructors', label: 'Instructors' },
    { key: 'administrators', label: 'Administrators' },
    { key: 'adjustments', label: 'Adjustments' },
    { key: 'forms', label: 'Forms' },
    { key: 'groups', label: 'Groups' },
    { key: 'items', label: 'Items' },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Sub-section navigation */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-wrap gap-2">
          {subSections.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveSubSection(key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                activeSubSection === key
                  ? 'bg-golden text-darkText border-golden'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-golden hover:text-darkText'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Courses sub-section ─────────────────────────────────────────── */}
      {activeSubSection === 'courses' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-darkText mb-6">Course Settings</h2>

          {courseMessage && (
            <div className={`mb-6 p-4 rounded-lg ${
              courseMessage.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {courseMessage.text}
            </div>
          )}

          <p className="text-gray-600 mb-6">Manage course names and descriptions. Changes will appear across the learning platform.</p>

          {courses.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-500">
              <p>No courses yet.</p>
              <Link href="/admin/courses/create"
                className="inline-block mt-4 px-4 py-2 bg-golden text-darkText font-bold rounded hover:bg-opacity-90">
                Create First Course
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {courses.map((course) => (
                <div key={course.id} className="bg-gray-50 border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                  {editingCourseId === course.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Course Name</label>
                        <input type="text" value={editingCourseTitle}
                          onChange={(e) => setEditingCourseTitle(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea value={editingCourseDescription}
                          onChange={(e) => setEditingCourseDescription(e.target.value)}
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent" />
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => handleSaveCourse(course.id)} disabled={savingCourseId === course.id}
                          className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-60">
                          {savingCourseId === course.id ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => setEditingCourseId(null)}
                          className="px-6 py-2 bg-gray-400 text-white font-semibold rounded-lg hover:bg-gray-500">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-darkText">{course.title}</h3>
                          {course.description && <p className="text-sm text-gray-600 mt-1">{course.description}</p>}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          course.is_published ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {course.is_published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingCourseId(course.id); setEditingCourseTitle(course.title); setEditingCourseDescription(course.description || '') }}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">
                          Edit Course
                        </button>
                        <Link href={`/admin/courses/${course.id}/edit`}
                          className="px-4 py-2 bg-gray-600 text-white text-sm font-semibold rounded-lg hover:bg-gray-700">
                          Manage Content
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <Link href="/admin/courses"
              className="inline-block px-6 py-2 bg-golden text-darkText font-bold rounded-lg hover:bg-opacity-90">
              + Create New Course
            </Link>
          </div>
        </div>
      )}

      {/* ── Instructors sub-section ──────────────────────────────────────── */}
      {activeSubSection === 'instructors' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-darkText">Instructors</h2>
            <button onClick={() => setIsAddInstructorOpen(true)}
              className="px-5 py-2 bg-golden text-darkText font-bold rounded-lg hover:bg-opacity-90">
              + Add Instructor
            </button>
          </div>
          <p className="text-gray-600 mb-6">Manage CFI accounts. Users with <code className="bg-gray-100 px-1 rounded">is_instructor</code> flag can be assigned to bookings.</p>

          {instructorsLoading ? (
            <div className="py-8 text-center text-gray-500">Loading instructors...</div>
          ) : instructors.length === 0 ? (
            <div className="py-8 text-center text-gray-500 border border-gray-200 rounded-lg">
              No instructors found. <button onClick={() => setIsAddInstructorOpen(true)} className="text-golden font-medium">Add your first instructor</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Phone</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {instructors.map((instructor) => (
                    <tr key={instructor.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{instructor.full_name || 'Unnamed'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{instructor.phone || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleRevokeInstructor(instructor.id)}
                          className="text-red-600 text-sm font-medium hover:text-red-800">Revoke</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <AddInstructorModal isOpen={isAddInstructorOpen} onClose={() => setIsAddInstructorOpen(false)} onAdd={fetchInstructors} />
        </div>
      )}

      {/* ── Administrators sub-section ───────────────────────────────────── */}
      {activeSubSection === 'administrators' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-darkText">Administrators</h2>
            <button onClick={() => setIsAddAdminOpen(true)}
              className="px-5 py-2 bg-golden text-darkText font-bold rounded-lg hover:bg-opacity-90">
              + Add Administrator
            </button>
          </div>
          <p className="text-gray-600 mb-6">Grant or revoke admin access. Users with <code className="bg-gray-100 px-1 rounded">is_admin</code> can access this dashboard.</p>

          {adminsLoading ? (
            <div className="py-8 text-center text-gray-500">Loading administrators...</div>
          ) : admins.length === 0 ? (
            <div className="py-8 text-center text-gray-500 border border-gray-200 rounded-lg">
              No administrators found. <button onClick={() => setIsAddAdminOpen(true)} className="text-golden font-medium">Add your first administrator</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <tr key={admin.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{admin.full_name || 'Unnamed'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{admin.email || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleRevokeAdmin(admin.id)}
                          className="text-red-600 text-sm font-medium hover:text-red-800">Revoke</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <AddAdminModal isOpen={isAddAdminOpen} onClose={() => setIsAddAdminOpen(false)} onAdd={fetchAdmins} />
        </div>
      )}

      {/* ── Adjustments sub-section ──────────────────────────────────────── */}
      {activeSubSection === 'adjustments' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-darkText">Billing Adjustments</h2>
            <button onClick={() => setIsAddAdjustmentOpen(true)}
              className="px-5 py-2 bg-golden text-darkText font-bold rounded-lg hover:bg-opacity-90">
              + Add Adjustment
            </button>
          </div>

          {adjustmentsLoading ? (
            <div className="py-8 text-center text-gray-500">Loading adjustments...</div>
          ) : adjustments.length === 0 ? (
            <div className="py-8 text-center text-gray-500 border border-gray-200 rounded-lg">
              No adjustments found. <button onClick={() => setIsAddAdjustmentOpen(true)} className="text-golden font-medium">Make your first adjustment</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Description</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map((adj) => (
                    <tr key={adj.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{(adj.profiles as any)?.full_name || 'Unknown'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-700 capitalize">{adj.type}</span>
                      </td>
                      <td className={`px-4 py-3 text-sm font-semibold ${adj.amount_cents < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {adj.amount_cents < 0 ? '-' : '+'}${Math.abs(adj.amount_cents / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{adj.description || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {adj.created_at ? new Date(adj.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDeleteAdjustment(adj.id)}
                          className="text-red-600 text-sm font-medium hover:text-red-800">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <AddAdjustmentModal isOpen={isAddAdjustmentOpen} onClose={() => setIsAddAdjustmentOpen(false)} onAdd={fetchAdjustments} users={adjustmentUsers} />
        </div>
      )}

      {/* ── Forms sub-section ────────────────────────────────────────────── */}
      {activeSubSection === 'forms' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-darkText">Forms</h2>
            <button onClick={() => setIsAddFormOpen(true)}
              className="px-5 py-2 bg-golden text-darkText font-bold rounded-lg hover:bg-opacity-90">
              + Add Form
            </button>
          </div>

          {formsLoading ? (
            <div className="py-8 text-center text-gray-500">Loading forms...</div>
          ) : forms.length === 0 ? (
            <div className="py-8 text-center text-gray-500 border border-gray-200 rounded-lg">
              No forms found. <button onClick={() => setIsAddFormOpen(true)} className="text-golden font-medium">Add your first form</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Description</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">URL</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {forms.map((form) => (
                    <tr key={form.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{form.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{form.description || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {form.url ? (
                          <a href={form.url} target="_blank" rel="noopener noreferrer" className="text-golden underline">View</a>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDeleteForm(form.id)}
                          className="text-red-600 text-sm font-medium hover:text-red-800">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <AddFormModal isOpen={isAddFormOpen} onClose={() => setIsAddFormOpen(false)} onAdd={fetchForms} />
        </div>
      )}

      {/* ── Groups sub-section ───────────────────────────────────────────── */}
      {activeSubSection === 'groups' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-darkText">Groups</h2>
            <button onClick={() => setIsAddGroupOpen(true)}
              className="px-5 py-2 bg-golden text-darkText font-bold rounded-lg hover:bg-opacity-90">
              + Add Group
            </button>
          </div>

          {groupsLoading ? (
            <div className="py-8 text-center text-gray-500">Loading groups...</div>
          ) : groups.length === 0 ? (
            <div className="py-8 text-center text-gray-500 border border-gray-200 rounded-lg">
              No groups found. <button onClick={() => setIsAddGroupOpen(true)} className="text-golden font-medium">Add your first group</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Description</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => (
                    <tr key={group.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{group.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{group.description || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDeleteGroup(group.id)}
                          className="text-red-600 text-sm font-medium hover:text-red-800">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <AddGroupModal isOpen={isAddGroupOpen} onClose={() => setIsAddGroupOpen(false)} onAdd={fetchGroups} />
        </div>
      )}

      {/* ── Items sub-section ────────────────────────────────────────────── */}
      {activeSubSection === 'items' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-darkText">Items</h2>
            <button onClick={() => setIsAddItemOpen(true)}
              className="px-5 py-2 bg-golden text-darkText font-bold rounded-lg hover:bg-opacity-90">
              + Add Item
            </button>
          </div>

          {itemsLoading ? (
            <div className="py-8 text-center text-gray-500">Loading items...</div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-gray-500 border border-gray-200 rounded-lg">
              No items found. <button onClick={() => setIsAddItemOpen(true)} className="text-golden font-medium">Add your first item</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Description</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Price</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.description || '-'}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                        {item.price_cents !== undefined ? `$${(item.price_cents / 100).toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDeleteItem(item.id)}
                          className="text-red-600 text-sm font-medium hover:text-red-800">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <AddItemModal isOpen={isAddItemOpen} onClose={() => setIsAddItemOpen(false)} onAdd={fetchItems} />
        </div>
      )}
    </div>
  )
}
