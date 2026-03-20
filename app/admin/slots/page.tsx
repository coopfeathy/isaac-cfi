import { redirect } from 'next/navigation'

export default function AdminSlotsPage() {
  redirect('/admin?tab=slots')
}
