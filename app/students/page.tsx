'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Student } from '@/lib/supabase'

export default function StudentsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [activeTab, setActiveTab] = useState<'list' | 'details'>('list')

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    certificate_type: '',
    certificate_number: '',
    medical_class: '' as 'first' | 'second' | 'third' | 'basic_med' | '',
    medical_expiration: '',
    flight_review_date: '',
    flight_review_due: '',
    ipc_date: '',
    ipc_due: '',
    rental_checkout_date: '',
    rental_currency_due: '',
    total_hours: 0,
    pic_hours: 0,
    dual_hours: 0,
    instrument_hours: 0,
    training_stage: '',
    notes: '',
    status: 'active' as 'active' | 'inactive' | 'completed' | 'on_hold'
  })

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/')
    }
  }, [user, isAdmin, authLoading, router])

  useEffect(() => {
    if (user && isAdmin) {
      fetchStudents()
    }
  }, [user, isAdmin])

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('full_name', { ascending: true })

      if (error) throw error
      setStudents(data || [])
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (selectedStudent) {
        // Update existing student
        const { error } = await supabase
          .from('students')
          .update(formData)
          .eq('id', selectedStudent.id)

        if (error) throw error
      } else {
        // Create new student
        const { error } = await supabase
          .from('students')
          .insert([formData])

        if (error) throw error
      }

      setShowAddForm(false)
      setSelectedStudent(null)
      resetForm()
      fetchStudents()
      setActiveTab('list')
    } catch (error) {
      console.error('Error saving student:', error)
      alert('Failed to save student record')
    }
  }

  const handleEdit = (student: Student) => {
    setSelectedStudent(student)
    setFormData({
      full_name: student.full_name,
      email: student.email || '',
      phone: student.phone || '',
      certificate_type: student.certificate_type || '',
      certificate_number: student.certificate_number || '',
      medical_class: student.medical_class || '',
      medical_expiration: student.medical_expiration || '',
      flight_review_date: student.flight_review_date || '',
      flight_review_due: student.flight_review_due || '',
      ipc_date: student.ipc_date || '',
      ipc_due: student.ipc_due || '',
      rental_checkout_date: student.rental_checkout_date || '',
      rental_currency_due: student.rental_currency_due || '',
      total_hours: student.total_hours,
      pic_hours: student.pic_hours,
      dual_hours: student.dual_hours,
      instrument_hours: student.instrument_hours,
      training_stage: student.training_stage || '',
      notes: student.notes || '',
      status: student.status
    })
    setShowAddForm(true)
    setActiveTab('details')
  }

  const handleDelete = async (studentId: string) => {
    if (!confirm('Are you sure you want to delete this student record?')) return

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId)

      if (error) throw error
      fetchStudents()
    } catch (error) {
      console.error('Error deleting student:', error)
      alert('Failed to delete student')
    }
  }

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      certificate_type: '',
      certificate_number: '',
      medical_class: '',
      medical_expiration: '',
      flight_review_date: '',
      flight_review_due: '',
      ipc_date: '',
      ipc_due: '',
      rental_checkout_date: '',
      rental_currency_due: '',
      total_hours: 0,
      pic_hours: 0,
      dual_hours: 0,
      instrument_hours: 0,
      training_stage: '',
      notes: '',
      status: 'active'
    })
  }

  const isOverdue = (date: string | null) => {
    if (!date) return false
    return new Date(date) < new Date()
  }

  const isDueSoon = (date: string | null, days: number = 30) => {
    if (!date) return false
    const dueDate = new Date(date)
    const soon = new Date()
    soon.setDate(soon.getDate() + days)
    return dueDate <= soon && dueDate > new Date()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'on_hold': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-golden"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-darkText">Student Records</h1>
          <button
            onClick={() => {
              setSelectedStudent(null)
              resetForm()
              setShowAddForm(!showAddForm)
              setActiveTab(showAddForm ? 'list' : 'details')
            }}
            className="px-6 py-3 bg-golden text-darkText font-bold rounded-lg hover:bg-opacity-90"
          >
            {showAddForm ? 'Cancel' : 'Add Student'}
          </button>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold text-darkText mb-6">
              {selectedStudent ? 'Edit Student Record' : 'Add New Student'}
            </h2>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b">
              <button
                onClick={() => setActiveTab('details')}
                className={`pb-2 px-4 font-semibold ${
                  activeTab === 'details'
                    ? 'border-b-2 border-golden text-golden'
                    : 'text-gray-500'
                }`}
              >
                Personal & Contact
              </button>
              <button
                onClick={() => setActiveTab('list')}
                className={`pb-2 px-4 font-semibold ${
                  activeTab === 'list'
                    ? 'border-b-2 border-golden text-golden'
                    : 'text-gray-500'
                }`}
              >
                Certificates & Currency
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {activeTab === 'details' && (
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Training Stage
                    </label>
                    <input
                      type="text"
                      value={formData.training_stage}
                      onChange={(e) => setFormData({ ...formData, training_stage: e.target.value })}
                      placeholder="e.g., Pre-solo, Cross-country, Checkride prep"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="completed">Completed</option>
                      <option value="on_hold">On Hold</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Flight Hours
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs text-gray-600">Total Hours</label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.total_hours}
                          onChange={(e) => setFormData({ ...formData, total_hours: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">PIC Hours</label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.pic_hours}
                          onChange={(e) => setFormData({ ...formData, pic_hours: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Dual Hours</label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.dual_hours}
                          onChange={(e) => setFormData({ ...formData, dual_hours: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Instrument Hours</label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.instrument_hours}
                          onChange={(e) => setFormData({ ...formData, instrument_hours: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={4}
                      placeholder="Training notes, goals, areas to focus on..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'list' && (
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="md:col-span-2">
                    <h3 className="font-bold text-lg mb-3">Certificate Information</h3>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Certificate Type
                    </label>
                    <select
                      value={formData.certificate_type}
                      onChange={(e) => setFormData({ ...formData, certificate_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                    >
                      <option value="">None</option>
                      <option value="student">Student Pilot</option>
                      <option value="sport">Sport Pilot</option>
                      <option value="recreational">Recreational Pilot</option>
                      <option value="private">Private Pilot</option>
                      <option value="instrument">Instrument Rating</option>
                      <option value="commercial">Commercial Pilot</option>
                      <option value="cfi">CFI</option>
                      <option value="cfii">CFII</option>
                      <option value="mei">MEI</option>
                      <option value="atp">ATP</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Certificate Number
                    </label>
                    <input
                      type="text"
                      value={formData.certificate_number}
                      onChange={(e) => setFormData({ ...formData, certificate_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Medical Class
                    </label>
                    <select
                      value={formData.medical_class}
                      onChange={(e) => setFormData({ ...formData, medical_class: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                    >
                      <option value="">Select...</option>
                      <option value="first">1st Class</option>
                      <option value="second">2nd Class</option>
                      <option value="third">3rd Class</option>
                      <option value="basic_med">BasicMed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Medical Expiration
                    </label>
                    <input
                      type="date"
                      value={formData.medical_expiration}
                      onChange={(e) => setFormData({ ...formData, medical_expiration: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <h3 className="font-bold text-lg mb-3 mt-4">Currency & Requirements</h3>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Flight Review
                    </label>
                    <input
                      type="date"
                      value={formData.flight_review_date}
                      onChange={(e) => {
                        const date = e.target.value
                        setFormData({ 
                          ...formData, 
                          flight_review_date: date,
                          flight_review_due: date ? new Date(new Date(date).setFullYear(new Date(date).getFullYear() + 2)).toISOString().split('T')[0] : ''
                        })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Flight Review Due
                    </label>
                    <input
                      type="date"
                      value={formData.flight_review_due}
                      onChange={(e) => setFormData({ ...formData, flight_review_due: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last IPC
                    </label>
                    <input
                      type="date"
                      value={formData.ipc_date}
                      onChange={(e) => {
                        const date = e.target.value
                        setFormData({ 
                          ...formData, 
                          ipc_date: date,
                          ipc_due: date ? new Date(new Date(date).setMonth(new Date(date).getMonth() + 6)).toISOString().split('T')[0] : ''
                        })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      IPC Due
                    </label>
                    <input
                      type="date"
                      value={formData.ipc_due}
                      onChange={(e) => setFormData({ ...formData, ipc_due: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rental Checkout Date
                    </label>
                    <input
                      type="date"
                      value={formData.rental_checkout_date}
                      onChange={(e) => setFormData({ ...formData, rental_checkout_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rental Currency Expires
                    </label>
                    <input
                      type="date"
                      value={formData.rental_currency_due}
                      onChange={(e) => setFormData({ ...formData, rental_currency_due: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-golden focus:border-golden"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-golden text-darkText font-bold rounded-lg hover:bg-opacity-90"
                >
                  {selectedStudent ? 'Update Student' : 'Add Student'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setSelectedStudent(null)
                    resetForm()
                    setActiveTab('list')
                  }}
                  className="px-6 py-3 bg-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Students List */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((student) => (
            <div key={student.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-bold text-darkText">{student.full_name}</h3>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(student.status)}`}>
                  {student.status}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                {student.email && <p>📧 {student.email}</p>}
                {student.phone && <p>📞 {student.phone}</p>}
                {student.certificate_type && <p>🎓 {student.certificate_type}</p>}
                {student.training_stage && <p>📚 {student.training_stage}</p>}
                <p>✈️ {student.total_hours} hours</p>
              </div>

              {/* Currency Alerts */}
              <div className="space-y-1 mb-4">
                {student.flight_review_due && (
                  <p className={`text-xs font-semibold ${
                    isOverdue(student.flight_review_due) ? 'text-red-600' :
                    isDueSoon(student.flight_review_due) ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {isOverdue(student.flight_review_due) ? '⚠️ ' : ''}
                    Flight Review: {new Date(student.flight_review_due).toLocaleDateString()}
                  </p>
                )}
                {student.ipc_due && (
                  <p className={`text-xs font-semibold ${
                    isOverdue(student.ipc_due) ? 'text-red-600' :
                    isDueSoon(student.ipc_due, 14) ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {isOverdue(student.ipc_due) ? '⚠️ ' : ''}
                    IPC: {new Date(student.ipc_due).toLocaleDateString()}
                  </p>
                )}
                {student.rental_currency_due && (
                  <p className={`text-xs font-semibold ${
                    isOverdue(student.rental_currency_due) ? 'text-red-600' :
                    isDueSoon(student.rental_currency_due, 7) ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {isOverdue(student.rental_currency_due) ? '⚠️ ' : ''}
                    Rental: {new Date(student.rental_currency_due).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleEdit(student)}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(student.id)}
                  className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {students.length === 0 && !showAddForm && (
          <div className="text-center text-gray-500 py-12">
            No student records yet. Click "Add Student" to get started.
          </div>
        )}
      </div>
    </div>
  )
}
