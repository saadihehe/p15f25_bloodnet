import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { getDbNameForCity } from '@/lib/db-config'
import { ObjectId } from 'mongodb'

export async function GET(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
  try {
    const params = await context.params
    const city = req.nextUrl.searchParams.get('city') || 'Karachi'

    const dbName = getDbNameForCity(city)
    const db = await getDb(dbName)

    const user = await db.collection('users').findOne({ _id: new ObjectId(params.userId) })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Don't expose password hash
    const { passwordHash, ...safeUser } = user

    return NextResponse.json({
      success: true,
      user: {
        ...safeUser,
        id: user._id.toString(),
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch user'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
