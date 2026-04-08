'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function SettingsTab() {
  const [courses, setCourses] = useState<any[]>([])
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null)
  const [editingCourseTitle, setEditingCourseTitle] = useState('')
  const [editingCourseDescription, setEditingCourseDescription] = useState('')
  const [savingCourseId, setSavingCourseId] = useState<string | null>(null)
  const [courseMessage, setCourseMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchCourses()
  }, [])

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
      setCourses(
        courses.map((c) =>
          c.id === courseId
            ? { ...c, title: editingCourseTitle, description: editingCourseDescription }
            : c
        )
      )
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

  return (
    <div className="space-y-6">
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
            <Link
              href="/admin/courses/create"
              className="inline-block mt-4 px-4 py-2 bg-golden text-darkText font-bold rounded hover:bg-opacity-90"
            >
              Create First Course
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-gray-50 border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
              >
                {editingCourseId === course.id ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Course Name</label>
                      <input
                        type="text"
                        value={editingCourseTitle}
                        onChange={(e) => setEditingCourseTitle(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        value={editingCourseDescription}
                        onChange={(e) => setEditingCourseDescription(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golden focus:border-transparent"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSaveCourse(course.id)}
                        disabled={savingCourseId === course.id}
                        className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-60"
                      >
                        {savingCourseId === course.id ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingCourseId(null)}
                        className="px-6 py-2 bg-gray-400 text-white font-semibold rounded-lg hover:bg-gray-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-darkText">{course.title}</h3>
                        {course.description && (
                          <p className="text-sm text-gray-600 mt-1">{course.description}</p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        course.is_published
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {course.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingCourseId(course.id)
                          setEditingCourseTitle(course.title)
                          setEditingCourseDescription(course.description || '')
                        }}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700"
                      >
                        Edit Course
                      </button>
                      <Link
                        href={`/admin/courses/${course.id}/edit`}
                        className="px-4 py-2 bg-gray-600 text-white text-sm font-semibold rounded-lg hover:bg-gray-700"
                      >
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
          <Link
            href="/admin/courses"
            className="inline-block px-6 py-2 bg-golden text-darkText font-bold rounded-lg hover:bg-opacity-90"
          >
            + Create New Course
          </Link>
        </div>
      </div>
    </div>
  )
}
