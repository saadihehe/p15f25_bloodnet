import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getDbNameForCity } from '@/lib/db-config'
import { getDb } from '@/lib/mongodb'
import { getEligibilityStatus } from '@/lib/mappers'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, { admin: true })
    if (auth.response) return auth.response

    const city = req.nextUrl.searchParams.get('city') || 'Karachi'
    const dbName = getDbNameForCity(city)
    const db = await getDb(dbName)

    const usersCollection = db.collection('users')
    const donationsCollection = db.collection('donations')

    const [totalUsers, signupsToday, signupsThisWeek, completedDonations, pendingApprovals] = await Promise.all([
      usersCollection.countDocuments(),
      usersCollection.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)).toISOString() },
      }),
      usersCollection.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
      }),
      donationsCollection.countDocuments({ status: 'completed' }),
      donationsCollection.countDocuments({
        status: { $nin: ['completed', 'rejected'] },
        recipientConfirmed: true,
        $or: [
          { donorConfirmed: true },
          { status: { $in: ['submitted', 'receiver_confirmed'] } },
        ],
      }),
    ])

    const donorUsers = await usersCollection.find({ role: 'donor' }).project({ lastDonationDate: 1 }).toArray()
    const eligibleCount = donorUsers.filter((user) => getEligibilityStatus(user.lastDonationDate) === 'eligible').length
    const notEligibleCount = donorUsers.length - eligibleCount


    return NextResponse.json({
      success: true,
      kpis: {
        totalUsers,
        signupsToday,
        signupsThisWeek,
        totalCompletedDonations: completedDonations,
        pendingApprovals,
        eligibleDonors: eligibleCount,
        notEligibleDonors: notEligibleCount,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load admin KPIs'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
