import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getDbNameForCity } from '@/lib/db-config'
import { getDb } from '@/lib/mongodb'
import { createDonationRecord } from '@/lib/donation-workflow'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.response) return auth.response

    const { searchParams } = new URL(req.url)
    const city = searchParams.get('city') || 'Karachi'
    let donorId = searchParams.get('donorId')
    let recipientId = searchParams.get('recipientId')

    if (auth.user.role === 'donor') {
      if (!donorId) donorId = auth.user._id.toString()
      else if (donorId !== auth.user._id.toString()) {
        return NextResponse.json({ error: 'Donors can only view their own donation history' }, { status: 403 })
      }
    }

    if (auth.user.role === 'receiver') {
      if (!recipientId) recipientId = auth.user._id.toString()
      else if (recipientId !== auth.user._id.toString()) {
        return NextResponse.json({ error: 'Receivers can only view donations made for their own requests' }, { status: 403 })
      }
    }

    const dbName = getDbNameForCity(city)
    const db = await getDb(dbName)
    const filter: Record<string, unknown> = { city }

    if (auth.user.role === 'donor') {
      filter.donorId = auth.user._id.toString()
    } else if (donorId) {
      filter.donorId = donorId
    }

    if (auth.user.role === 'receiver') {
      filter.recipientId = auth.user._id.toString()
    } else if (recipientId) {
      filter.recipientId = recipientId
    }

    if (auth.user.role === 'hospital') {
      filter.hospitalId = auth.user._id.toString()
    }

    const docs = await db
      .collection('donations')
      .find(filter)
      .sort({ communicationDate: -1 })
      .limit(50)
      .toArray()

    const donations = docs.map((d) => ({
      id: d._id.toString(),
      donorId: d.donorId,
      donorName: d.donorName,
      donorEmail: d.donorEmail,
      donorConfirmed: d.donorConfirmed ?? false,
      donorConfirmedDate: d.donorConfirmedDate,
      recipientId: d.recipientId,
      recipientName: d.recipientName,
      recipientEmail: d.recipientEmail,
      bloodGroup: d.bloodGroup,
      units: d.units,
      status: d.status,
      communicationDate: d.communicationDate,
      donationDate: d.donationDate,
      recipientConfirmed: d.recipientConfirmed ?? false,
      recipientConfirmedDate: d.recipientConfirmedDate,
      recipientRating: d.recipientRating,
      recipientReview: d.recipientReview,
      receiptUrl: d.receiptUrl,
      receiptVerificationStatus: d.receiptVerificationStatus,
      hospitalName: d.hospitalName,
      certificateGenerated: d.certificateGenerated ?? false,
      certificateUrl: d.certificateUrl,
      certificateId: d.certificateId,
      requestId: d.requestId,
      city: d.city,
    }))

    return NextResponse.json(donations)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch donations'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.response) return auth.response

    const body = await req.json()
    const {
      donorId,
      donorName,
      donorEmail,
      recipientId,
      recipientName,
      recipientEmail,
      bloodGroup,
      units,
      city = 'Karachi',
      hospitalName,
      requestId,
    } = body

    if (!donorId || !donorName || !bloodGroup || !units) {
      return NextResponse.json({ error: 'Missing required donation fields' }, { status: 400 })
    }

    if (auth.user.role === 'donor' && auth.user._id.toString() !== donorId) {
      return NextResponse.json({ error: 'Donors may only create donations for their own account' }, { status: 403 })
    }

    if (auth.user.role === 'receiver' && recipientId && recipientId !== auth.user._id.toString()) {
      return NextResponse.json({ error: 'Receivers may only register donations for their own request' }, { status: 403 })
    }

    const donation = await createDonationRecord({
      donorId,
      donorName,
      donorEmail,
      recipientId,
      recipientName,
      recipientEmail,
      bloodGroup,
      units: Number(units),
      city,
      hospitalName,
      requestId,
    })
    return NextResponse.json({ success: true, donation }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Donation creation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
