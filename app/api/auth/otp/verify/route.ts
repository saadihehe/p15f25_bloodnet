import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { DB_KARACHI, DB_PAKISTAN } from '@/lib/db-config'
import { setAuthCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, otp } = body
    if (!email || !otp) return NextResponse.json({ error: 'Email and OTP required' }, { status: 400 })

    const emailNorm = String(email).trim().toLowerCase()

    const dbKarachi = await getDb(DB_KARACHI)
    let users = dbKarachi.collection('users')
    let user = await users.findOne({ email: emailNorm })

    if (!user) {
      const dbPakistan = await getDb(DB_PAKISTAN)
      users = dbPakistan.collection('users')
      user = await users.findOne({ email: emailNorm })
    }

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    if (!user.otpCode || !user.otpExpiresAt) {
      return NextResponse.json({ error: 'No OTP pending for this user' }, { status: 400 })
    }

    const now = new Date()
    const expires = new Date(user.otpExpiresAt)
    if (now > expires) {
      return NextResponse.json({ error: 'OTP expired' }, { status: 400 })
    }

    if (String(otp).trim() !== String(user.otpCode).trim()) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 })
    }

    // Mark verified and clear otp fields
    await users.updateOne({ _id: user._id }, { $set: { isVerified: true }, $unset: { otpCode: '', otpExpiresAt: '' } })

    // Create a NextResponse so we can set auth cookie
    const response = NextResponse.json({ success: true, message: 'Email verified' })
    // user may be a raw DB document; map minimal fields expected by setAuthCookie
    const userForCookie = {
      _id: user._id,
      name: user.name || user.email,
      email: user.email || emailNorm,
      role: user.role || 'receiver',
    }
    setAuthCookie(response, userForCookie as any)
    return response
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'OTP verification failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
