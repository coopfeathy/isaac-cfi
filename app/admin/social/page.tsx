import { redirect } from 'next/navigation'

export default function AdminSocialPage() {
  redirect('/admin?tab=social')
}
