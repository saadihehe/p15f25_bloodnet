import './load-env.mjs'
import bcrypt from 'bcryptjs'
import { MongoClient } from 'mongodb'
import { pathToFileURL } from 'url'

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017'
const dbName = process.env.MONGODB_KARACHI_DB || 'bloodnet_karachi'
const defaultPassword = process.env.DEMO_USER_PASSWORD || 'StrongPass123'
const adminEmail = (process.env.MONGODB_ADMIN_EMAIL || 'admin@bloodnet.dev').toLowerCase()
const adminPassword = process.env.MONGODB_ADMIN_PASSWORD || 'Admin@123456'

const demoUsers = [
  {
    name: 'Mustafa Admin',
    email: adminEmail,
    phone: '+923000000001',
    role: 'admin',
    city: 'Karachi',
    password: adminPassword,
  },
  {
    name: 'Aga Khan University Hospital',
    email: 'hospital@bloodnet.dev',
    phone: '+922134861000',
    role: 'hospital',
    city: 'Karachi',
    password: defaultPassword,
  },
  {
    name: 'Ali Donor',
    email: 'donor@bloodnet.dev',
    phone: '+923001234567',
    role: 'donor',
    city: 'Karachi',
    bloodGroup: 'O-',
    password: defaultPassword,
  },
  {
    name: 'Sara Receiver',
    email: 'receiver@bloodnet.dev',
    phone: '+923331234567',
    role: 'receiver',
    city: 'Karachi',
    bloodGroup: 'A+',
    password: defaultPassword,
  },
]

const hospitals = [
  {
    name: 'Aga Khan University Hospital',
    email: 'hospital@bloodnet.dev',
    phone: '+922134861000',
    address: 'Stadium Road, Karachi',
    city: 'Karachi',
    lat: 24.8504,
    lng: 67.0117,
  },
]

export async function seedDemoUsers() {
  const client = new MongoClient(uri)
  try {
    await client.connect()
    const db = client.db(dbName)
    const users = db.collection('users')
    const now = new Date().toISOString()

    for (const user of demoUsers) {
      const passwordHash = await bcrypt.hash(user.password, 10)
      await users.updateOne(
        { email: user.email.toLowerCase() },
        {
          $set: {
            name: user.name,
            email: user.email.toLowerCase(),
            phone: user.phone,
            role: user.role,
            city: user.city,
            bloodGroup: user.bloodGroup,
            passwordHash,
            isVerified: true,
            availability: user.role === 'donor' ? true : undefined,
            eligibilityStatus: user.role === 'donor' ? 'eligible' : undefined,
            totalDonations: 0,
            livesImpacted: 0,
            achievements: [],
            createdAt: now,
          },
        },
        { upsert: true },
      )
      console.log(`Ready: ${user.email} (${user.role}) / ${user.password}`)
    }

    const hospitalCollection = db.collection('hospitals')
    for (const hospital of hospitals) {
      await hospitalCollection.updateOne(
        { email: hospital.email.toLowerCase() },
        {
          $set: {
            ...hospital,
            email: hospital.email.toLowerCase(),
            bloodBankAvailability: 'Emergency stock available',
            capacity: 300,
            operatingHours: '24/7',
            services: ['Emergency', 'Blood Bank'],
            createdAt: now,
          },
        },
        { upsert: true },
      )
      console.log(`Hospital ready: ${hospital.name}`)
    }

    console.log(`\nSeed complete in ${dbName}.`)
  } finally {
    await client.close()
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedDemoUsers().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
