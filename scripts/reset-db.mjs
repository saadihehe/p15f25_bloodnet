import './load-env.mjs'
import { MongoClient } from 'mongodb'
import { seedDemoUsers } from './seed-demo-users.mjs'

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017'
const dbNames = Array.from(new Set([
  process.env.MONGODB_DB || 'bloodnet',
  process.env.MONGODB_KARACHI_DB || 'bloodnet_karachi',
]))

async function main() {
  const client = new MongoClient(uri)
  try {
    await client.connect()
    for (const dbName of dbNames) {
      console.log(`Dropping database: ${dbName}`)
      await client.db(dbName).dropDatabase()
    }
  } finally {
    await client.close()
  }

  await seedDemoUsers()
  console.log('\nReset complete.')
}

main().catch((error) => {
  console.error('Reset failed:', error)
  process.exit(1)
})
