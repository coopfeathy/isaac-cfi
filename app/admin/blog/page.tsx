import { redirect } from 'next/navigation'

export default function AdminBlogPage() {
  redirect('/admin?tab=blog')
}
