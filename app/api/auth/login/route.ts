import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { DB_KARACHI, DB_PAKISTAN } from '@/lib/db-config'
import { mapMongoUserToAppUser } from '@/lib/mappers'
import { getDb } from '@/lib/mongodb'
import { setAuthCookie } from '@/lib/auth'
import type { AppRole, MongoUser } from '@/lib/types'

async function findUserByEmail(email: string) {
  for (const dbName of [DB_KARACHI, DB_PAKISTAN]) {
    const db = await getDb(dbName)
    const user = await db.collection<MongoUser>('users').findOne({ email: email.toLowerCase() })
    if (user) return { user, dbName }
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, role } = await req.json()

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Email, password, and role are required' }, { status: 400 })
    }

    const result = await findUserByEmail(email)
    if (!result) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const { user } = result
    const validPassword = await bcrypt.compare(password, user.passwordHash ?? '')
    if (!validPassword) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    if (!user.isVerified) {
      return NextResponse.json({ error: 'Email not verified', email: user.email }, { status: 403 })
    }

    if (user.role !== role) {
      return NextResponse.json({ error: `This account is registered as ${user.role}` }, { status: 401 })
    }

    const userData = mapMongoUserToAppUser(user)
    const response = NextResponse.json({ success: true, user: { ...userData, id: userData.id }, message: 'Login successful' })
    return setAuthCookie(response, user)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Login failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
