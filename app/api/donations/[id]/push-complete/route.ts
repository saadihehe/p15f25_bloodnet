import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getDb } from '@/lib/mongodb'
import { getDbNameForCity } from '@/lib/db-config'
import { ObjectId } from 'mongodb'

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const auth = await requireAuth(req)
    if (auth.response) return auth.response

    const city = req.nextUrl.searchParams.get('city') || 'Karachi'
    const dbName = getDbNameForCity(city)
    const db = await getDb(dbName)

    const donation = await db.collection('donations').findOne({ _id: new ObjectId(params.id) })
    if (!donation) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 })
    }

    // Donor pushes confirmation - marks donation as "submitted" (ready for admin approval)
    if (auth.user.role === 'donor' && donation.donorId === auth.user._id.toString()) {
      await db.collection('donations').updateOne(
        { _id: donation._id },
        {
          $set: {
            status: 'submitted',
            donorConfirmedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }
      )

      // Send notification to receiver
      await db.collection('notifications').insertOne({
        _id: new ObjectId(),
        senderId: new ObjectId(auth.user._id),
        senderName: auth.user.name,
        senderEmail: auth.user.email,
        senderRole: 'donor',
        recipientId: new ObjectId(donation.recipientId),
        message: `${auth.user.name} confirmed they donated ${donation.units} units of ${donation.bloodGroup} blood`,
        type: 'donation_completed',
        donationId: donation._id.toString(),
        read: false,
        createdAt: new Date().toISOString(),
      })

      return NextResponse.json({
        success: true,
        message: 'Donation marked as complete by donor. Receiver and admin notified.',
      })
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to push donation'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
