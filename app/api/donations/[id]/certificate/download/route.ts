import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getDb } from '@/lib/mongodb'
import { getDbNameForCity } from '@/lib/db-config'
import { ObjectId } from 'mongodb'
import fs from 'fs'
import path from 'path'

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const auth = await requireAuth(req)
    if (auth.response) return auth.response

    const city = req.nextUrl.searchParams.get('city') || 'Karachi'
    const dbName = getDbNameForCity(city)
    const db = await getDb(dbName)

    const donation = await db.collection('donations').findOne({ _id: new ObjectId(params.id) })
    if (!donation) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 })
    }

    // Only donor can download their own certificate
    if (donation.donorId !== auth.user._id.toString()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!donation.certificateGenerated || !donation.certificateUrl) {
      return NextResponse.json({ error: 'Certificate not generated yet' }, { status: 400 })
    }

    // Try to serve the certificate file if it exists locally
    const certificatePath = path.join(process.cwd(), 'public', donation.certificateUrl.replace(/^\//, ''))
    
    if (fs.existsSync(certificatePath)) {
      const fileBuffer = fs.readFileSync(certificatePath)
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="certificate-${params.id}.pdf"`,
        },
      })
    }

    // If file doesn't exist, return error
    return NextResponse.json({ error: 'Certificate file not found' }, { status: 404 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to download certificate'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
