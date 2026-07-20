import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { DB_KARACHI, DB_PAKISTAN, getDbNameForCity, isKarachi } from '@/lib/db-config'
import { mapKarachiDonorDoc, mapMongoUserToDonor } from '@/lib/mappers'
import { getCompatibleDonorBloodGroups } from '@/lib/blood-compatibility'
import { getEligibilityStatus } from '@/lib/mappers'
import { getDb } from '@/lib/mongodb'
import { isValidEmail, isValidPakistaniPhone, normalizePakistaniPhone } from '@/lib/validation-utils'
import type { MongoUser } from '@/lib/types'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const city = searchParams.get('city') || 'Karachi'
    const bloodGroup = searchParams.get('bloodGroup')
    const availableOnly = searchParams.get('available') !== 'false'
    const compatibleBloodGroups = bloodGroup ? getCompatibleDonorBloodGroups(bloodGroup) : []
    const bloodGroupFilter = compatibleBloodGroups.length ? { $in: compatibleBloodGroups } : bloodGroup

    let donors: any[] = []

    if (isKarachi(city)) {
      const db = await getDb(DB_KARACHI)
      
      // Query donors collection
      const donorFilter: Record<string, unknown> = { city }
      if (bloodGroup) donorFilter.bloodGroup = bloodGroupFilter
      if (availableOnly) donorFilter.available = true
      
      const donorDocs = await db.collection('donors').find(donorFilter).toArray()
      const donorsFromCollection = donorDocs
        .filter((doc) => getEligibilityStatus(String(doc.lastDonationDate || '')) === 'eligible')
        .map((doc) => mapKarachiDonorDoc(doc))
      
      // Query users collection (role='donor')
      const userFilter: Record<string, unknown> = { role: 'donor', city }
      if (bloodGroup) userFilter.bloodGroup = bloodGroupFilter
      if (availableOnly) userFilter.availability = true  // FIX: Use correct field name
      
      const userDocs = await db.collection<MongoUser>('users').find(userFilter).toArray()
      const donorsFromUsers = userDocs
        .filter((user) => getEligibilityStatus(user.lastDonationDate) === 'eligible')
        .map((user, index) => mapMongoUserToDonor(user, index))

      donors = [...donorsFromCollection, ...donorsFromUsers]
    } else {
      const db = await getDb(DB_PAKISTAN)
      
      const userFilter: Record<string, unknown> = { role: 'donor', city }
      if (bloodGroup) userFilter.bloodGroup = bloodGroupFilter
      if (availableOnly) userFilter.availability = true  // FIX: Use correct field name
      
      const users = await db.collection<MongoUser>('users').find(userFilter).toArray()
      donors = users
        .filter((user) => getEligibilityStatus(user.lastDonationDate) === 'eligible')
        .map((user, index) => mapMongoUserToDonor(user, index))
    }

    return NextResponse.json({
      donors,
      total: donors.length,
      city,
      database: getDbNameForCity(city),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch donors'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, city, bloodGroup, lastDonationDate, availability, userId } = body

    if (!name || !email || !phone || !city || !bloodGroup || availability === undefined) {
      return NextResponse.json({ error: 'Blood type, city, phone, availability, and contact details are required' }, { status: 400 })
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }

    const normalizedPhone = normalizePakistaniPhone(phone)
    if (!isValidPakistaniPhone(normalizedPhone)) {
      return NextResponse.json({ error: 'Phone number must be a valid Pakistani number in format +92xxxxxxxxxx' }, { status: 400 })
    }

    const dbName = getDbNameForCity(city)
    const db = await getDb(dbName)
    const users = db.collection<Partial<MongoUser>>('users')

    type NewUserProfile = Omit<MongoUser, '_id'>

    const donorProfile: NewUserProfile = {
      name,
      email: email.toLowerCase(),
      phone: normalizedPhone,
      city,
      bloodGroup,
      lastDonationDate: lastDonationDate || undefined,
      role: 'donor',
      availability: Boolean(availability),
      isVerified: false,
      totalDonations: 0,
      livesImpacted: 0,
      achievements: [],
      createdAt: new Date().toISOString(),
    }

    if (userId) {
      const userObjectId = ObjectId.isValid(userId) ? new ObjectId(userId) : userId
      await users.updateOne({ _id: userObjectId as any }, { $set: donorProfile })
      return NextResponse.json({ success: true, message: 'Donor registration updated' })
    }

    const existing = await users.findOne({ email: email.toLowerCase() })
    if (existing) {
      return NextResponse.json({ error: 'A donor with this email already exists' }, { status: 409 })
    }

    const result = await users.insertOne(donorProfile)
    return NextResponse.json({ success: true, donorId: result.insertedId.toString(), message: 'Donor registration saved' }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Donor registration failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
