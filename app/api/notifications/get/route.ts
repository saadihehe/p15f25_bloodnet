import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getDb } from '@/lib/mongodb'
import { getDbNameForCity } from '@/lib/db-config'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.response) return auth.response

    const city = req.nextUrl.searchParams.get('city') || 'Karachi'
    const unreadOnly = req.nextUrl.searchParams.get('unreadOnly') === 'true'

    const dbName = getDbNameForCity(city)
    const db = await getDb(dbName)

    const query: any = { recipientId: auth.user._id }
    if (unreadOnly) query.read = false

    const notifications = await db
      .collection('notifications')
      .find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()

    const mapped = notifications.map((n) => ({
      ...n,
      id: n._id.toString(),
      senderId: n.senderId?.toString(),
      recipientId: n.recipientId?.toString(),
    }))

    return NextResponse.json({ success: true, notifications: mapped })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch notifications'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
