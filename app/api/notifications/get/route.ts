import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getDb } from '@/lib/mongodb'
import { getDbNameForCity } from '@/lib/db-config'
import { ObjectId } from 'mongodb'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.response) return auth.response

    const city = req.nextUrl.searchParams.get('city') || 'Karachi'
    const unreadOnly = req.nextUrl.searchParams.get('unreadOnly') === 'true'

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

    const query: any = { $or: recipientMatchers }
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
      senderId: n.senderId?.toString?.() || n.senderId || n.data?.donorId || n.data?.requesterId || n.data?.receiverId || '',
      senderName: n.senderName || n.data?.donorName || n.data?.requesterName || n.data?.receiverName || n.title || 'BloodNet',
      senderEmail: n.senderEmail || n.data?.donorEmail || n.data?.requesterEmail || '',
      senderRole: n.senderRole || n.data?.senderRole || '',
      recipientId: n.recipientId?.toString(),
      title: n.title,
      message: n.message,
      actionUrl: n.actionUrl,
      actionLabel: n.actionLabel,
      donationId: n.donationId || n.data?.donationId,
    }))

    return NextResponse.json({ success: true, notifications: mapped })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch notifications'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
