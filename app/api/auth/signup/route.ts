import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getDbNameForCity } from '@/lib/db-config'
import { getDb } from '@/lib/mongodb'
import { mapMongoUserToAppUser } from '@/lib/mappers'
import { sendOtpEmail } from '@/lib/email'
import { validateSignupInput } from '@/lib/validation-utils'
import type { AppRole } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    const { name, email, password, phone, role, city, bloodGroup } = payload

    const validation = validateSignupInput({ name, email, password, phone, role, city, bloodGroup })
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.errors[0] }, { status: 400 })
    }

    if (role === 'admin') {
      return NextResponse.json({ error: 'Admin signup is not allowed' }, { status: 400 })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const normalizedPhone = String(phone).trim().replace(/\s+/g, '')
    const normalizedCity = String(city).trim()

    const dbName = getDbNameForCity(normalizedCity)
    const db = await getDb(dbName)
    const users = db.collection('users')

    const existing = await users.findOne({ email: normalizedEmail })
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(String(password), 10)
    const now = new Date().toISOString()

    const newUser = {
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
      phone: normalizedPhone,
      role: role as AppRole,
      city: normalizedCity,
      bloodGroup: role === 'donor' || role === 'receiver' ? bloodGroup : undefined,
      isVerified: false,
      availability: role === 'donor' ? true : undefined,
      totalDonations: 0,
      livesImpacted: 0,
      achievements: [],
      lastDonationDate: undefined,
      createdAt: now,
    }

    const insertResult = await users.insertOne(newUser)
    const createdUser = { _id: insertResult.insertedId, ...newUser }
    const appUser = mapMongoUserToAppUser(createdUser as any)
    // Generate OTP and send verification email (10 minute expiry)
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString()
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
      await users.updateOne({ _id: insertResult.insertedId }, { $set: { otpCode: otp, otpExpiresAt, otpVerified: false } })
      await sendOtpEmail(normalizedEmail, otp, String(name))
    } catch (e) {
      // Non-fatal: continue but warn in response
      console.warn('Failed to send OTP email:', e)
    }

    return NextResponse.json({ success: true, message: 'Signup successful. OTP sent to email', user: appUser }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Signup failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
