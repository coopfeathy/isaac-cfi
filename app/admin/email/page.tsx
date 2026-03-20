import { redirect } from 'next/navigation'

export default function AdminEmailPage() {
  redirect('/admin?tab=email')
}
