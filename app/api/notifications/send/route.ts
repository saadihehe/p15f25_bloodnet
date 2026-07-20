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

    const notification = {
      _id: new ObjectId(),
      senderId: new ObjectId(auth.user._id),
      senderName: auth.user.name,
      senderEmail: auth.user.email,
      senderRole: auth.user.role,
      recipientId: new ObjectId(recipientId),
      message,
      type, // 'connection', 'message', 'donation_completed', etc
      read: false,
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
