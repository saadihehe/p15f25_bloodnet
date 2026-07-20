import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getDb } from '@/lib/mongodb'
import { getDbNameForCity } from '@/lib/db-config'
import { ObjectId } from 'mongodb'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.response) return auth.response

    const body = await req.json()
    const { recipientId, message, type, city = 'Karachi' } = body

    if (!recipientId || !message || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const dbName = getDbNameForCity(city)
    const db = await getDb(dbName)
    const recipient = await db.collection('users').findOne({ _id: new ObjectId(recipientId) })
    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
    }

    const notification = {
      _id: new ObjectId(),
      senderId: auth.user._id.toString(),
      senderName: auth.user.name,
      senderEmail: auth.user.email,
      senderRole: auth.user.role,
      recipientId,
      recipientEmail: recipient.email,
      recipientRole: recipient.role,
      title: type === 'message' ? 'New Message' : 'New Notification',
      message,
      type, // 'connection', 'message', 'donation_completed', etc
      read: false,
      priority: 'medium',
      city,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const result = await db.collection('notifications').insertOne(notification)

    return NextResponse.json({ success: true, notificationId: result.insertedId })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send notification'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
