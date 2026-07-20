import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb'
import { DB_KARACHI, DB_PAKISTAN } from '@/lib/db-config'
import { sendOtpEmail } from '@/lib/email'

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, name } = body
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const emailNorm = String(email).trim().toLowerCase()

    // Search Karachi then Pakistan DB for a user with that email
    const dbKarachi = await getDb(DB_KARACHI)
    let users = dbKarachi.collection('users')
    let user = await users.findOne({ email: emailNorm })
    let dbName = DB_KARACHI

    if (!user) {
      const dbPakistan = await getDb(DB_PAKISTAN)
      users = dbPakistan.collection('users')
      user = await users.findOne({ email: emailNorm })
      dbName = DB_PAKISTAN
    }

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const otp = generateOtp()
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    await users.updateOne({ _id: user._id }, { $set: { otpCode: otp, otpExpiresAt, otpVerified: false } })

    await sendOtpEmail(emailNorm, otp, name || user.name)

    return NextResponse.json({ success: true, message: 'OTP sent' }, { status: 200 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to send OTP'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
