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
    const { recipientId, message, city = 'Karachi' } = body

    if (!recipientId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const dbName = getDbNameForCity(city)
    const db = await getDb(dbName)

    // Get recipient info
    const recipient = await db.collection('users').findOne({ _id: new ObjectId(recipientId) })
    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
    }

    // Create message in conversation
    const messageDoc = {
      _id: new ObjectId(),
      senderId: new ObjectId(auth.user._id),
      senderName: auth.user.name,
      senderEmail: auth.user.email,
      recipientId: new ObjectId(recipientId),
      recipientName: recipient.name,
      recipientEmail: recipient.email,
      message,
      read: false,
      phoneNumber: recipient.phone,
      city: recipient.city,
      bloodGroup: recipient.bloodGroup,
      createdAt: new Date().toISOString(),
    }

    const result = await db.collection('messages').insertOne(messageDoc)

    await db.collection('notifications').insertOne({
      _id: new ObjectId(),
      senderId: auth.user._id.toString(),
      senderName: auth.user.name,
      senderEmail: auth.user.email,
      senderRole: auth.user.role,
      recipientId,
      recipientEmail: recipient.email,
      recipientRole: recipient.role,
      type: 'message',
      title: 'New WhatsApp Contact',
      message: `${auth.user.name} opened a WhatsApp conversation with you.`,
      data: {
        senderId: auth.user._id.toString(),
        senderName: auth.user.name,
        senderEmail: auth.user.email,
        senderPhone: auth.user.phone,
      },
      read: false,
      priority: 'high',
      actionUrl: `/notifications/${auth.user._id.toString()}`,
      actionLabel: 'View Profile',
      city,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    // Generate WhatsApp link
    const whatsappLink = `https://wa.me/${recipient.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
      `${auth.user.name} says: ${message}`
    )}`

    return NextResponse.json({
      success: true,
      messageId: result.insertedId,
      whatsappLink,
      recipient: {
        id: recipient._id.toString(),
        name: recipient.name,
        phone: recipient.phone,
        city: recipient.city,
        bloodGroup: recipient.bloodGroup,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send message'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
