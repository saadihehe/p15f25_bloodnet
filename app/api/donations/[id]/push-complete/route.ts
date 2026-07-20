import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { confirmDonationByDonor } from '@/lib/donation-workflow'

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const auth = await requireAuth(req)
    if (auth.response) return auth.response

    const city = req.nextUrl.searchParams.get('city') || 'Karachi'
    if (auth.user.role !== 'donor') {
      return NextResponse.json({ error: 'Only donors can confirm donations' }, { status: 403 })
    }

    const result = await confirmDonationByDonor(params.id, auth.user._id.toString(), auth.user.name, city)
    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to push donation'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
