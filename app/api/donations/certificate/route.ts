import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createCertificatePdfBuffer } from '@/lib/donation-workflow'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.response) return auth.response

    if (auth.user.role !== 'donor' && auth.user.role !== 'hospital' && auth.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized to generate certificates' }, { status: 403 })
    }

    const body = await req.json()
    const {
      donorName,
      bloodGroup,
      hospitalName,
      donationDate,
      donationId,
    } = body

    if (!donorName || !bloodGroup || !hospitalName) {
      return NextResponse.json(
        { error: 'Donor name, blood group, and hospital name are required' },
        { status: 400 }
      )
    }

    const pdfBuffer = createCertificatePdfBuffer({
      donorName,
      donationId: donationId || Math.random().toString(36).substr(2, 9).toUpperCase(),
      date: donationDate || new Date().toISOString(),
      bloodGroup,
      hospitalName,
    })

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="BloodNet_Certificate_${donorName.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf"`,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Certificate generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
