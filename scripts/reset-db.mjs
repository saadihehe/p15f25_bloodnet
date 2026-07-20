import './load-env.mjs'
import bcrypt from 'bcryptjs'
import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017'
const dbName = process.env.MONGODB_DB || 'bloodnet'
const adminEmail = process.env.MONGODB_ADMIN_EMAIL || 'admin@bloodnet.dev'
const adminPassword = process.env.MONGODB_ADMIN_PASSWORD || 'Admin@123456'

const hospitals = [
  {
    name: 'Aga Khan University Hospital',
    email: 'agakhan.hospital@test.com',
    phone: '+92-21-3486-1000',
    city: 'Karachi',
    password: process.env.AGAKHAN_PASSWORD || 'AghaKhan@123',
    address: 'Stadium Road, Karachi',
    lat: 24.8504,
    lng: 67.0117,
  },
  {
    name: 'Jinnah Postgraduate Medical Centre',
    email: 'jpmc.hospital@test.com',
    phone: '+92-21-9920-1000',
    city: 'Karachi',
    password: process.env.JPMC_PASSWORD || 'JPMC@123',
    address: 'Rafiqui H.J. Road, Karachi',
    lat: 24.9667,
    lng: 67.0833,
  },
  {
    name: 'Dow University Hospital',
    email: 'dow.hospital@test.com',
    phone: '+92-21-9926-1300',
    city: 'Karachi',
    password: process.env.DOW_PASSWORD || 'Dow@123',
    address: 'Baba-e-Urdu Road, Karachi',
    lat: 24.9496,
    lng: 67.0822,
  },
]

async function main() {
  const client = new MongoClient(uri)
  try {
    await client.connect()
    const db = client.db(dbName)

    // Drop database to reset state
    console.log(`Dropping database: ${dbName}`)
    await db.dropDatabase()
    console.log('Database dropped')

    // Create admin user
    const users = db.collection('users')
    const passwordHash = await bcrypt.hash(adminPassword, 10)
    const now = new Date().toISOString()

    const admin = {
      name: 'Admin',
      email: adminEmail.toLowerCase(),
      phone: '+920000000000',
      role: 'admin',
      city: 'Karachi',
      passwordHash,
      isVerified: true,
      createdAt: now,
      totalDonations: 0,
      livesImpacted: 0,
      achievements: [],
    }

    await users.insertOne(admin)
    console.log('✓ Admin user created')
    console.log(`  Email: ${admin.email}`)
    console.log(`  Password: ${adminPassword}`)

    const hospitalsColl = db.collection('hospitals')

    for (const h of hospitals) {
      const hash = await bcrypt.hash(h.password, 10)
      // insert hospital record
      await hospitalsColl.insertOne({
        name: h.name,
        address: h.address,
        phone: h.phone,
        email: h.email,
        bloodBankAvailability: 'All types available',
        city: h.city,
        lat: h.lat,
        lng: h.lng,
        capacity: 300,
        operatingHours: '24/7',
        services: ['Emergency', 'Blood Bank'],
        createdAt: now,
      })

      // create corresponding hospital user
      await users.insertOne({
        name: h.name,
        email: h.email.toLowerCase(),
        phone: h.phone,
        role: 'hospital',
        city: h.city,
        passwordHash: hash,
        isVerified: true,
        createdAt: now,
      })

      console.log(`✓ Hospital seeded: ${h.name} — ${h.email} / ${h.password}`)
    }

    console.log('\nReset complete. Admin and hospitals seeded.')
  } finally {
    await client.close()
  }
}

main().catch((error) => {
  console.error('✗ Reset failed:', error)
  process.exit(1)
})
