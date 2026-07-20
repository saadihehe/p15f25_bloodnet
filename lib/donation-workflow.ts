import { NextResponse } from 'next/server'
// import fs from 'fs'
// import path from 'path'
import { ObjectId } from 'mongodb'
import { getDbNameForCity } from './db-config'
import { getDb } from './mongodb'
import type { MongoUser } from './types'

export type DonationStatus =
  | 'pending'
  | 'submitted'
  | 'verified'
  | 'receipt_uploaded'
  | 'receipt_verified'
  | 'receiver_confirmed'
  | 'completed'
  | 'rejected'

export interface DonationDocument {
  _id: ObjectId
  donorId: string
  donorName: string
  donorEmail?: string
  donorConfirmed?: boolean
  donorConfirmedDate?: string
  recipientId?: string
  recipientName?: string
  recipientEmail?: string
  bloodGroup: string
  units: number
  status: DonationStatus
  verificationStatus?: 'pending' | 'verified' | 'rejected'
  communicationDate?: string
  donationDate?: string
  hospitalId?: string
  hospitalName?: string
  receiptUrl?: string
  receiptVerificationStatus?: 'pending' | 'verified' | 'rejected'
  submissionProofUrl?: string
  verifiedAt?: string
  verifiedBy?: string
  verifiedByName?: string
  rejectionReason?: string
  certificateGenerated?: boolean
  certificateUrl?: string
  certificateId?: string
  certificatePath?: string
  requestId?: string
  recipientConfirmed?: boolean
  recipientConfirmedDate?: string
  recipientRating?: number
  recipientReview?: string
  createdAt: string
  updatedAt: string
}

// const CERTIFICATE_DIR = path.join(process.cwd(), 'public', 'certificates')

// function ensureCertificatesDir() {
//   fs.mkdirSync(CERTIFICATE_DIR, { recursive: true })
// }

function escapePdfText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function textLine(value: string, x: number, y: number, fontSize = 12, font = 'F1') {
  return `BT /${font} ${fontSize} Tf ${x} ${y} Td (${escapePdfText(value)}) Tj ET\n`
}

export function createCertificatePdfBuffer({
  donorName,
  donationId,
  date,
  bloodGroup,
  hospitalName,
}: {
  donorName: string
  donationId: string
  date: string
  bloodGroup?: string
  hospitalName?: string
}) {
  const displayDate = new Date(date).toLocaleDateString()
  const details = [
    `Donor: ${donorName}`,
    bloodGroup ? `Blood Group: ${bloodGroup}` : null,
    hospitalName ? `Hospital: ${hospitalName}` : null,
    `Date: ${displayDate}`,
    `Certificate ID: ${donationId}`,
  ].filter(Boolean) as string[]

  const content = [
    'q\n',
    '1 0 0 RG 2 w 42 42 511 758 re S\n',
    '0.82 0.02 0.02 RG 4 w 58 58 479 726 re S\n',
    '0.82 0.02 0.02 rg 74 690 447 50 re f\n',
    '1 1 1 rg\n',
    textLine('BloodNet Donation Certificate', 142, 710, 24, 'F2'),
    '0 0 0 rg\n',
    textLine('This certificate is proudly presented to', 178, 626, 14),
    textLine(donorName, 176, 584, 28, 'F2'),
    textLine('Thank you for donating blood and helping save lives.', 133, 536, 14),
    textLine('Your verified donation has been approved by BloodNet administration.', 94, 510, 12),
    ...details.map((detail, index) => textLine(detail, 86, 438 - index * 26, 12)),
    textLine('With gratitude,', 86, 242, 12),
    textLine('BloodNet Team', 86, 216, 16, 'F2'),
    textLine('Connecting donors, saving lives', 196, 108, 11),
    'Q\n',
  ].join('')

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
    `6 0 obj\n<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}endstream\nendobj\n`,
  ]

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'))
    pdf += object
  }

  const xrefStart = Buffer.byteLength(pdf, 'utf8')
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`

  return Buffer.from(pdf, 'utf8')
}

export async function createDonationRecord(input: Partial<DonationDocument> & { donorId: string; donorName: string; bloodGroup: string; units: number; city?: string }) {
  const city = input.city || 'Karachi'
  const dbName = getDbNameForCity(city)
  const db = await getDb(dbName)
  const now = new Date().toISOString()

  const donation = {
    donorId: input.donorId,
    donorName: input.donorName,
    donorEmail: input.donorEmail,
    donorConfirmed: input.donorConfirmed ?? false,
    donorConfirmedDate: input.donorConfirmedDate,
    recipientId: input.recipientId,
    recipientName: input.recipientName,
    recipientEmail: input.recipientEmail,
    bloodGroup: input.bloodGroup,
    units: input.units,
    status: 'pending' as DonationStatus,
    communicationDate: input.communicationDate || now,
    donationDate: input.donationDate,
    hospitalName: input.hospitalName,
    requestId: input.requestId,
    city,
    recipientConfirmed: input.recipientConfirmed ?? false,
    certificateGenerated: false,
    createdAt: now,
    updatedAt: now,
  }

  const result = await db.collection('donations').insertOne(donation)
  return { ...donation, id: result.insertedId.toString() }
}

export async function confirmDonationByDonor(
  donationId: string,
  donorId: string,
  donorName: string,
  city: string
) {
  const dbName = getDbNameForCity(city)
  const db = await getDb(dbName)
  const donation = await db.collection<DonationDocument>('donations').findOne({ _id: new ObjectId(donationId) })

  if (!donation) {
    return { success: false, message: 'Donation not found' }
  }

  if (donation.donorId && donation.donorId !== donorId) {
    return { success: false, message: 'Only the donor can confirm this donation' }
  }

  if (donation.status === 'completed' || donation.status === 'rejected') {
    return { success: false, message: `Donation already ${donation.status}` }
  }

  const updatedAt = new Date().toISOString()
  const receiverAlreadyConfirmed = Boolean(donation.recipientConfirmed)
  await db.collection('donations').updateOne(
    { _id: donation._id },
    {
      $set: {
        status: receiverAlreadyConfirmed ? 'receiver_confirmed' : 'submitted',
        donorId,
        donorName,
        donorConfirmed: true,
        donorConfirmedDate: updatedAt,
        updatedAt,
      },
    }
  )

  if (donation.recipientId || donation.recipientEmail) {
    await db.collection('notifications').insertOne({
      recipientId: donation.recipientId,
      recipientEmail: donation.recipientEmail,
      recipientRole: 'receiver',
      type: 'donation_completed',
      title: 'Donor Confirmed Donation',
      message: `${donorName} confirmed they donated ${donation.units} unit(s) of ${donation.bloodGroup} blood.`,
      data: { donationId: donation._id.toString(), donorId, donorName },
      read: false,
      priority: 'high',
      city,
      createdAt: updatedAt,
    })
  }

  const updatedDonation = await db.collection<DonationDocument>('donations').findOne({ _id: donation._id })

  return {
    success: true,
    message: receiverAlreadyConfirmed
      ? 'Donation confirmed by both parties and sent to admin'
      : 'Donation marked as donated by donor',
    donation: updatedDonation ? { ...updatedDonation, id: updatedDonation._id.toString() } : null,
  }
}

export async function confirmDonationByReceiver(
  donationId: string,
  receiverId: string,
  receiverName: string,
  city: string,
  rating?: number,
  review?: string
) {
  const dbName = getDbNameForCity(city)
  const db = await getDb(dbName)
  const donation = await db.collection<DonationDocument>('donations').findOne({ _id: new ObjectId(donationId) })

  if (!donation) {
    return { success: false, message: 'Donation not found' }
  }

  if (donation.recipientId && donation.recipientId !== receiverId) {
    return { success: false, message: 'Only the matched receiver can confirm this donation' }
  }

  if (donation.status === 'completed' || donation.status === 'rejected') {
    return { success: false, message: `Donation already ${donation.status}` }
  }

  const updatedAt = new Date().toISOString()
  const donorAlreadyConfirmed = Boolean(donation.donorConfirmed || donation.status === 'submitted')
  await db.collection('donations').updateOne(
    { _id: donation._id },
    {
      $set: {
        status: donorAlreadyConfirmed ? 'receiver_confirmed' : 'pending',
        recipientId: receiverId,
        recipientName: receiverName,
        recipientConfirmed: true,
        recipientConfirmedDate: updatedAt,
        recipientRating: rating ?? donation.recipientRating,
        recipientReview: review ?? donation.recipientReview,
        updatedAt,
      },
    }
  )

  if (donation.donorId || donation.donorEmail) {
    await db.collection('notifications').insertOne({
      recipientId: donation.donorId,
      recipientEmail: donation.donorEmail,
      recipientRole: 'donor',
      type: 'blood_received',
      title: 'Receiver Confirmed Blood Received',
      message: `${receiverName} confirmed they received ${donation.units} unit(s) of ${donation.bloodGroup} blood.`,
      data: { donationId: donation._id.toString(), receiverId, receiverName },
      read: false,
      priority: 'high',
      city,
      createdAt: updatedAt,
    })
  }

  const updatedDonation = await db
    .collection<DonationDocument>('donations')
    .findOne({ _id: donation._id })

  return {
    success: true,
    message: donorAlreadyConfirmed
      ? 'Donation confirmed by both parties and sent to admin'
      : 'Blood receipt confirmed by receiver',
    donation: updatedDonation
      ? { ...updatedDonation, id: updatedDonation._id.toString() }
      : null,
  }
}

export async function getPendingDonations(city: string) {
  const dbName = getDbNameForCity(city)
  const db = await getDb(dbName)
  const docs = await db.collection<DonationDocument>('donations').find({
    status: { $nin: ['completed', 'rejected'] },
    recipientConfirmed: true,
    $or: [
      { donorConfirmed: true },
      { status: { $in: ['submitted', 'receiver_confirmed'] } },
    ],
  }).sort({ updatedAt: -1 }).toArray()
  return docs.map((d) => ({ ...d, id: d._id.toString() }))
}

export async function approveDonation(donationId: string, city: string) {
  const dbName = getDbNameForCity(city)
  const db = await getDb(dbName)
  const donation = await db.collection<DonationDocument>('donations').findOne({ _id: new ObjectId(donationId) })

  if (!donation) {
    return { success: false, message: 'Donation not found' }
  }

  if (donation.status === 'completed') {
    return { success: false, message: 'Donation already approved' }
  }

  const donorConfirmed = Boolean(donation.donorConfirmed || donation.status === 'submitted' || donation.status === 'receiver_confirmed')
  const receiverConfirmed = Boolean(donation.recipientConfirmed)
  if (!donorConfirmed || !receiverConfirmed) {
    return { success: false, message: 'Both donor and receiver must confirm before approval' }
  }

  const donorUser = ObjectId.isValid(donation.donorId)
    ? await db.collection<MongoUser>('users').findOne({ _id: new ObjectId(donation.donorId) })
    : donation.donorEmail
      ? await db.collection<MongoUser>('users').findOne({ email: donation.donorEmail.toLowerCase() })
      : null
  if (!donorUser) {
    return { success: false, message: 'Donor not found' }
  }

  const approvalDate = new Date().toISOString()
  const nextEligibleDonationDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
  const certificateUrl = await generateCertificateFile({
    donorName: donation.donorName,
    donationId: donation._id.toString(),
    date: approvalDate,
  })

  await db.collection('donations').updateOne(
    { _id: donation._id },
    {
      $set: {
        status: 'completed',
        donationDate: approvalDate,
        certificateGenerated: true,
        certificateUrl,
        certificateId: certificateUrl.split('/').pop()?.replace('.pdf', ''),
        updatedAt: approvalDate,
      },
    }
  )

  await db.collection('users').updateOne(
    { _id: donorUser._id },
    {
      $set: {
        lastDonationDate: approvalDate,
        eligibilityStatus: 'not_eligible',
        nextEligibleDonationDate,
      },
      $inc: {
        totalDonations: 1,
        livesImpacted: 1,
      },
    }
  )

  await db.collection('notifications').insertOne({
    recipientId: donation.donorId,
    recipientEmail: donorUser.email,
    recipientRole: 'donor',
    type: 'certificate_ready',
    title: 'Certificate Ready',
    message: 'Your blood donation certificate is ready to download from your dashboard.',
    data: { donationId: donation._id.toString(), certificateUrl, nextEligibleDonationDate },
    read: false,
    priority: 'high',
    city,
    createdAt: approvalDate,
  })

  return {
    success: true,
    message: 'Donation approved',
    certificateUrl,
    donation: {
      ...donation,
      id: donation._id.toString(),
      status: 'completed',
      donationDate: approvalDate,
      certificateGenerated: true,
      certificateUrl,
      certificateId: certificateUrl.split('/').pop()?.replace('.pdf', ''),
    },
  }
}

export async function rejectDonation(donationId: string, reason: string, city: string) {
  const dbName = getDbNameForCity(city)
  const db = await getDb(dbName)
  const donation = await db.collection<DonationDocument>('donations').findOne({ _id: new ObjectId(donationId) })

  if (!donation) {
    return { success: false, message: 'Donation not found' }
  }

  await db.collection('donations').updateOne(
    { _id: donation._id },
    {
      $set: {
        status: 'rejected',
        rejectionReason: reason,
        updatedAt: new Date().toISOString(),
      },
    }
  )

  return { success: true, message: 'Donation rejected' }
}

export async function getDonationCertificate(donationId: string, city: string) {
  const dbName = getDbNameForCity(city)
  const db = await getDb(dbName)
  const donation = await db.collection<DonationDocument>('donations').findOne({ _id: new ObjectId(donationId) })

  if (!donation?.certificateUrl) {
    return null
  }

  return donation.certificateUrl
}

// export async function generateCertificateFile({ donorName, donationId, date }: { donorName: string; donationId: string; date: string }) {
//   ensureCertificatesDir()
//   const safeName = donorName.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'donor'
//   const fileName = `${safeName}-${donationId}.pdf`
//   const filePath = path.join(CERTIFICATE_DIR, fileName)
//   fs.writeFileSync(filePath, createCertificatePdfBuffer({ donorName, donationId, date }))

//   return `/certificates/${fileName}`
// }

export async function generateCertificateFile({
  donorName,
  donationId,
  date,
}: {
  donorName: string
  donationId: string
  date: string
}) {
  // Just return a URL that points to your API route.
  // The PDF will be generated when the user downloads it.
  return `/api/certificates/${donationId}`
}

// export async function streamCertificateResponse(donationId: string, city: string) {
//   const certificateUrl = await getDonationCertificate(donationId, city)
//   if (!certificateUrl) {
//     return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
//   }

//   const filePath = path.join(process.cwd(), 'public', certificateUrl.replace(/^\//, ''))
//   if (!fs.existsSync(filePath)) {
//     return NextResponse.json({ error: 'Certificate file missing' }, { status: 404 })
//   }

//   return new NextResponse(fs.createReadStream(filePath) as unknown as BodyInit, {
//     status: 200,
//     headers: {
//       'Content-Type': 'application/pdf',
//       'Content-Disposition': `attachment; filename="certificate-${donationId}.pdf"`,
//     },
//   })
// }

export async function streamCertificateResponse(
  donationId: string,
  city: string
) {
  const dbName = getDbNameForCity(city)
  const db = await getDb(dbName)

  const donation = await db
    .collection<DonationDocument>("donations")
    .findOne({ _id: new ObjectId(donationId) })

  if (!donation) {
    return NextResponse.json(
      { error: "Certificate not found" },
      { status: 404 }
    )
  }

  if (donation.status !== "completed") {
    return NextResponse.json(
      { error: "Donation not approved yet" },
      { status: 400 }
    )
  }

  const pdf = createCertificatePdfBuffer({
    donorName: donation.donorName,
    donationId: donation._id.toString(),
    date: donation.donationDate || donation.updatedAt,
    bloodGroup: donation.bloodGroup,
    hospitalName: donation.hospitalName,
  })

  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificate-${donation._id}.pdf"`,
    },
  })
}
