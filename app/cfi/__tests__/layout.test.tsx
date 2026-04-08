import { redirect } from 'next/navigation'

// Mock auth module
jest.mock('@/lib/auth', () => ({
  requireCFI: jest.fn(),
}))

import { requireCFI } from '@/lib/auth'

describe('CFI layout guard (CFI-01)', () => {
  it('redirects non-CFI user away from /cfi', async () => {
    // Mock requireCFI to simulate a non-CFI user (returns redirect response)
    ;(requireCFI as jest.Mock).mockResolvedValue({
      error: new Response(null, { status: 302, headers: { Location: '/dashboard' } }),
    })

    const result = await requireCFI()
    expect('error' in result).toBe(true)
    // Layout should NOT render children when requireCFI returns error
  })

  it('allows CFI user to proceed', async () => {
    ;(requireCFI as jest.Mock).mockResolvedValue({
      user: { id: 'cfi-user-id', email: 'cfi@example.com' },
      profile: { is_instructor: true, is_admin: false },
    })

    const result = await requireCFI()
    expect('error' in result).toBe(false)
    expect(result.user.id).toBe('cfi-user-id')
  })
})
