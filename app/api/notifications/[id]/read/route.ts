import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getDb } from '@/lib/mongodb'
import { getDbNameForCity } from '@/lib/db-config'
import { ObjectId } from 'mongodb'

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const auth = await requireAuth(req)
    if (auth.response) return auth.response

    const city = req.nextUrl.searchParams.get('city') || 'Karachi'
    const dbName = getDbNameForCity(city)
    const db = await getDb(dbName)
    const userId = auth.user._id.toString()
    const recipientMatchers: Record<string, unknown>[] = [
      { recipientId: userId },
      { recipientEmail: auth.user.email.toLowerCase() },
    ]
    if (ObjectId.isValid(userId)) {
      recipientMatchers.push({ recipientId: auth.user._id })
    }

    const result = await db.collection('notifications').updateOne(
      { _id: new ObjectId(params.id), $or: recipientMatchers },
      { $set: { read: true, updatedAt: new Date().toISOString() } }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to mark notification as read'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
