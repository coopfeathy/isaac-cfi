'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  is_admin: boolean
  balance_cents?: number
  is_instructor?: boolean
  email?: string
}

function AddUserModal({ isOpen, onClose, onAdd }: { isOpen: boolean; onClose: () => void; onAdd: (user: Profile) => void }) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    // Personal Info
    first_name: '',
    middle_name: '',
    last_name: '',
    address: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    date_of_birth: '',
    gender: '',
    phone: '',
    emergency_contact: '',
    emergency_phone: '',
    // Login
    email: '',
    password: '',
    notify_user: true,
    is_admin: false,
    is_instructor: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailSearchPerformed, setEmailSearchPerformed] = useState(false)
  const [userExists, setUserExists] = useState(false)
  const [searchEmail, setSearchEmail] = useState('')

  const handleSearchEmail = async () => {
    if (!searchEmail.trim()) {
      setError('Please enter an email')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data } = await supabase.auth.signInWithPassword({
        email: searchEmail,
        password: 'dummy', // Will fail, but tells us if user exists
      })

      setUserExists(!!data?.user)
      setEmailSearchPerformed(true)

      if (data?.user) {
        setFormData({ ...formData, email: searchEmail })
      }
    } catch (err) {
      // User not found, which is what we want for new users
      setUserExists(false)
      setEmailSearchPerformed(true)
      setFormData({ ...formData, email: searchEmail })
    } finally {
      setLoading(false)
    }
  }

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleSubmit = async () => {
    setError('')
    setLoading(true)

    try {
      if (!formData.email) throw new Error('Email is required')
      if (!formData.first_name.trim()) throw new Error('First name is required')

      const password = formData.password || Math.random().toString(36).slice(-12)
      const full_name = [formData.first_name, formData.middle_name, formData.last_name]
        .filter(Boolean)
        .join(' ')

      // Call API route to create user with service role
      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: password,
          profile: {
            full_name: full_name,
            first_name: formData.first_name,
            middle_name: formData.middle_name || null,
            last_name: formData.last_name || null,
            phone: formData.phone || null,
            address: formData.address || null,
            address2: formData.address2 || null,
            city: formData.city || null,
            state: formData.state || null,
            zip: formData.zip || null,
            date_of_birth: formData.date_of_birth || null,
            gender: formData.gender || null,
            emergency_contact: formData.emergency_contact || null,
            emergency_phone: formData.emergency_phone || null,
            is_admin: formData.is_admin,
            is_instructor: formData.is_instructor,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('API error response:', data)
        throw new Error(data.error || 'Failed to create user')
      }

      onAdd({ ...formData, id: data.user.id, full_name: `${formData.first_name} ${formData.last_name}`.trim() } as unknown as Profile)
      setStep(1)
      setFormData({
        first_name: '',
        middle_name: '',
        last_name: '',
        address: '',
        address2: '',
        city: '',
        state: '',
        zip: '',
        date_of_birth: '',
        gender: '',
        phone: '',
        emergency_contact: '',
        emergency_phone: '',
        email: '',
        password: '',
        notify_user: true,
        is_admin: false,
        is_instructor: false,
      })
      setEmailSearchPerformed(false)
      setSearchEmail('')
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
        maxWidth: '700px',
        width: '90%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>New User</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
        </div>

        {/* Progress indicator */}
        <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px' }}>
            {step === 1 && 'Does the account exist? (1 of 4)'}
            {step === 2 && 'Personal (2 of 4)'}
            {step === 3 && 'Personal (Cont.) (3 of 4)'}
            {step === 4 && 'Login Account (4 of 4)'}
          </div>
          <div style={{ width: '100%', height: '4px', backgroundColor: '#e5e7eb', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${(step / 4) * 100}%`, height: '100%', backgroundColor: '#C59A2A', transition: 'width 0.3s' }}></div>
          </div>
        </div>

        {/* Step 1: Email Check */}
        {step === 1 && (
          <div>
            <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fcd34d', padding: '12px', borderRadius: '6px', marginBottom: '20px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#92400e' }}>
                <strong>Warning:</strong> You should attempt to find the User as an existing User in our system. If they do not exist, you can then create the account for them. Ignoring this warning may result in two accounts for the same person.
              </p>
            </div>

            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>User Email</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input
                type="email"
                placeholder="user@example.com"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchEmail()}
                style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
              />
              <button
                onClick={handleSearchEmail}
                disabled={loading}
                style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
              >
                Search
              </button>
            </div>

            {error && <div style={{ color: '#dc2626', fontSize: '14px', marginBottom: '16px' }}>{error}</div>}

            {emailSearchPerformed && (
              <div style={{ marginBottom: '16px' }}>
                {userExists ? (
                  <div style={{ color: '#dc2626', fontSize: '14px' }}>Account found! This user already exists in the system.</div>
                ) : (
                  <button
                    onClick={() => {
                      setFormData({ ...formData, email: searchEmail })
                      setStep(2)
                    }}
                    style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
                  >
                    I did not find an account
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Personal Info */}
        {step === 2 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>First Name *</label>
                <input
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Middle Name</label>
                <input
                  type="text"
                  value={formData.middle_name}
                  onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Last Name</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Address 2</label>
              <input
                type="text"
                value={formData.address2}
                onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>State/Region</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Zip Code</label>
                <input
                  type="text"
                  value={formData.zip}
                  onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Personal Cont. */}
        {step === 3 && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Date of Birth</label>
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Gender</label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="gender"
                    value="Male"
                    checked={formData.gender === 'Male'}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  />
                  Male
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="gender"
                    value="Female"
                    checked={formData.gender === 'Female'}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  />
                  Female
                </label>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Emergency Contact</label>
              <input
                type="text"
                value={formData.emergency_contact}
                onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Emergency Phone</label>
              <input
                type="tel"
                value={formData.emergency_phone}
                onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        )}

        {/* Step 4: Login Account */}
        {step === 4 && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Email address *</label>
              <input
                type="email"
                disabled
                value={formData.email}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', backgroundColor: '#f3f4f6' }}
              />
            </div>

            <div style={{ marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <button
                  onClick={() => setFormData({ ...formData, password: Math.random().toString(36).slice(-12) })}
                  style={{ width: '100%', padding: '8px 12px', backgroundColor: '#e5e7eb', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
                >
                  Temporary Password
                </button>
              </div>
              <div>
                <button
                  onClick={() => setFormData({ ...formData, password: '' })}
                  style={{ width: '100%', padding: '8px 12px', backgroundColor: '#e5e7eb', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
                >
                  Set Password
                </button>
              </div>
            </div>

            {formData.password && (
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '6px', fontSize: '13px' }}>
                Password: <code style={{ fontWeight: 600 }}>{formData.password}</code>
              </div>
            )}

            <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.notify_user}
                  onChange={(e) => setFormData({ ...formData, notify_user: e.target.checked })}
                />
                <span style={{ fontSize: '14px' }}>Notify user</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.is_admin}
                  onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                />
                <span style={{ fontSize: '14px' }}>Administrator</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.is_instructor}
                  onChange={(e) => setFormData({ ...formData, is_instructor: e.target.checked })}
                />
                <span style={{ fontSize: '14px' }}>Instructor</span>
              </label>
            </div>
          </div>
        )}

        {error && <div style={{ color: '#dc2626', fontSize: '14px', marginTop: '16px', marginBottom: '16px' }}>{error}</div>}

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
          <button
            onClick={onClose}
            style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
          >
            Cancel
          </button>

          {step > 1 && (
            <button
              onClick={handleBack}
              style={{ padding: '10px 20px', backgroundColor: '#e5e7eb', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
            >
              Back
            </button>
          )}

          {step < 4 ? (
            <button
              onClick={handleNext}
              style={{ padding: '10px 20px', backgroundColor: '#C59A2A', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || !formData.first_name || !formData.email}
              style={{ padding: '10px 20px', backgroundColor: '#C59A2A', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, opacity: loading ? 0.6 : 1 }}
            >
              {loading ? 'Adding...' : 'Add User'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true })
      
      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Error loading users:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      // Delete from Supabase Auth
      const { error } = await supabase.auth.admin.deleteUser(userId)
      if (error) throw error

      setUsers(users.filter(u => u.id !== userId))
    } catch (err: any) {
      alert(`Error deleting user: ${err.message}`)
    }
  }

  return (
    <div style={{ padding: 0 }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0 }}>Users</h1>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            style={{ backgroundColor: '#C59A2A', color: '#fff', padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
          >
            + Add User
          </button>
        </div>
      </div>
      
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>Loading users...</div>
        ) : users.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>No users found. <br /><a href="#" onClick={() => setIsAddModalOpen(true)} style={{ color: '#C59A2A' }}>Add your first user</a></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Phone</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Role</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Balance</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', fontWeight: 500 }}>{user.full_name || 'Unnamed'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{user.phone || '-'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {user.is_admin && (
                          <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '4px', backgroundColor: '#ddd6fe', color: '#6d28d9' }}>
                            Admin
                          </span>
                        )}
                        {user.is_instructor && (
                          <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '4px', backgroundColor: '#dbeafe', color: '#0369a1' }}>
                            Instructor
                          </span>
                        )}
                        {!user.is_admin && !user.is_instructor && (
                          <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '4px', backgroundColor: '#dcfce7', color: '#166534' }}>
                            User
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: user.balance_cents && user.balance_cents < 0 ? '#dc2626' : '#111827' }}>
                      {user.balance_cents !== undefined ? `$${(user.balance_cents / 100).toFixed(2)}` : '--'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px' }}>
                      <a href="#" style={{ color: '#C59A2A', textDecoration: 'none', fontWeight: 500, marginRight: '16px' }}>Edit</a>
                      <a href="#" onClick={() => handleDeleteUser(user.id)} style={{ color: '#dc2626', textDecoration: 'none', fontWeight: 500 }}>Delete</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddUserModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={() => loadUsers()} />
    </div>
  )
}
