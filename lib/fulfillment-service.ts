/**
 * Complete Fulfillment Service
 * Handles: Appointments, Request acceptance, Verification, Inventory, Eligibility
 */

import { ObjectId } from 'mongodb'
import { getDb } from './mongodb'
import { getDbNameForCity } from './db-config'
import { generateCertificateFile } from './donation-workflow'
import { getCompatibleDonorBloodGroups } from './blood-compatibility'
import type { Appointment, BloodRequest, BloodUnit, DonationFull, AuditLog, EligibilityCheckResult, RealtimeNotification } from './types-extended'

const DAYS_BETWEEN_DONATIONS = 90
const MIN_AGE = 18
const MAX_AGE = 65
const MIN_WEIGHT_KG = 50

// ===== ELIGIBILITY CHECKS =====
export async function checkDonorEligibility(donorId: string, city: string): Promise<EligibilityCheckResult> {
  const dbName = getDbNameForCity(city)
  const db = await getDb(dbName)
  
  const donor = await db.collection('users').findOne({ _id: new ObjectId(donorId) })
  if (!donor) throw new Error('Donor not found')

  const reasons: string[] = []
  let eligible = true

  // Age check
  if (donor.dateOfBirth) {
    const birthDate = new Date(donor.dateOfBirth)
    const age = new Date().getFullYear() - birthDate.getFullYear()
    if (age < MIN_AGE || age > MAX_AGE) {
      eligible = false
      reasons.push(`Age ${age} is outside eligibility range (${MIN_AGE}-${MAX_AGE})`)
    }
  }

  // Weight check
  if (donor.weight && donor.weight < MIN_WEIGHT_KG) {
    eligible = false
    reasons.push(`Weight ${donor.weight}kg is below minimum ${MIN_WEIGHT_KG}kg`)
  }

  // Last donation check
  if (donor.lastDonationDate) {
    const lastDonation = new Date(donor.lastDonationDate)
    const daysSince = Math.floor((Date.now() - lastDonation.getTime()) / (1000 * 60 * 60 * 24))
    if (daysSince < DAYS_BETWEEN_DONATIONS) {
      eligible = false
      reasons.push(`Last donated ${daysSince} days ago. Must wait ${DAYS_BETWEEN_DONATIONS - daysSince} more days.`)
    }
  }

  return {
    donorId,
    eligible,
    reasons,
    checkedAt: new Date().toISOString(),
  }
}

// ===== APPOINTMENTS =====
export async function createAppointment(
  donorId: string,
  donorEmail: string,
  donorName: string,
  hospitalId: string,
  hospitalName: string,
  hospitalCity: string,
  appointmentDate: string,
  appointmentTime: string,
  bloodGroup: string,
  city: string
): Promise<Appointment> {
  const dbName = getDbNameForCity(city)
  const db = await getDb(dbName)

  // Check eligibility
  const eligibility = await checkDonorEligibility(donorId, city)
  if (!eligibility.eligible) {
    throw new Error(`Donor not eligible: ${eligibility.reasons.join(', ')}`)
  }

  const now = new Date().toISOString()
  const appointment: Appointment = {
    donorId,
    donorEmail,
    donorName,
    hospitalId,
    hospitalName,
    hospitalCity,
    appointmentDate,
    appointmentTime,
    status: 'scheduled',
    bloodGroup,
    eligibilityStatus: 'eligible',
    createdAt: now,
    updatedAt: now,
  }

  const result = await db.collection('appointments').insertOne(appointment)

  // Log audit
  await createAuditLog({
    action: 'appointment_created',
    entityType: 'appointment',
    entityId: result.insertedId.toString(),
    performedBy: donorEmail,
    performedByName: donorName,
    performedByRole: 'donor',
    city,
  })

  // Send notification
  await createNotification({
    recipientId: donorId,
    recipientEmail: donorEmail,
    recipientRole: 'donor',
    type: 'appointment_reminder',
    title: 'Appointment Confirmed',
    message: `Your donation appointment at ${hospitalName} is scheduled for ${appointmentDate} at ${appointmentTime}`,
    data: { appointmentId: result.insertedId.toString(), hospitalName, appointmentDate, appointmentTime },
    read: false,
    priority: 'high',
    city,
  })

  return { ...appointment, id: result.insertedId.toString() }
}

export async function confirmAppointmentCompletion(
  appointmentId: string,
  city: string
): Promise<void> {
  const dbName = getDbNameForCity(city)
  const db = await getDb(dbName)

  const appointment = await db.collection('appointments').findOne({ _id: new ObjectId(appointmentId) })
  if (!appointment) throw new Error('Appointment not found')

  await db.collection('appointments').updateOne(
    { _id: new ObjectId(appointmentId) },
    {
      $set: {
        status: 'completed',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }
  )

  await createAuditLog({
    action: 'appointment_completed',
    entityType: 'appointment',
    entityId: appointmentId,
    performedBy: appointment.hospitalId,
    performedByName: appointment.hospitalName,
    performedByRole: 'hospital',
    city,
  })
}

// ===== BLOOD REQUEST FULFILLMENT =====
export async function createBloodRequest(
  requesterId: string,
  requesterEmail: string,
  requesterName: string,
  requesterType: 'receiver' | 'hospital',
  bloodGroup: string,
  units: number,
  urgency: 'emergency' | 'urgent' | 'normal',
  city: string,
  hospitalName?: string,
  reason?: string,
  requesterPhone?: string
): Promise<BloodRequest> {
  const dbName = getDbNameForCity(city)
  const db = await getDb(dbName)

  const now = new Date().toISOString()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h expiry

  const request: BloodRequest = {
    requesterId,
    requesterEmail,
    requesterName,
    requesterType,
    bloodGroup,
    units,
    urgency,
    city,
    hospitalName,
    reason,
    requesterPhone,
    status: 'open',
    expiresAt,
    createdAt: now,
    updatedAt: now,
  }

  const result = await db.collection('blood_requests').insertOne(request)

  // Notify all eligible donors
  const compatibleBloodGroups = getCompatibleDonorBloodGroups(bloodGroup)
  const donors = await db.collection('users').find({
    role: 'donor',
    bloodGroup: compatibleBloodGroups.length ? { $in: compatibleBloodGroups } : bloodGroup,
    city,
    availability: true,
  }).toArray()

  for (const donor of donors) {
    await createNotification({
      recipientId: donor._id.toString(),
      recipientEmail: donor.email,
      recipientRole: 'donor',
      type: 'blood_request',
      title: `${bloodGroup} Blood Needed - ${urgency.toUpperCase()}`,
      message: `${requesterName} needs ${units} units of ${bloodGroup} blood ${urgency === 'emergency' ? 'URGENTLY' : 'in ' + city}`,
      data: { requestId: result.insertedId.toString(), requesterId, requesterName, requesterEmail, requesterPhone, bloodGroup, units, urgency, city, hospitalName },
      read: false,
      priority: urgency === 'emergency' ? 'high' : 'medium',
      actionUrl: `/notifications/${requesterId}`,
      actionLabel: 'View Receiver',
      city,
    })
  }

  await createAuditLog({
    action: 'blood_request_created',
    entityType: 'request',
    entityId: result.insertedId.toString(),
    performedBy: requesterEmail,
    performedByName: requesterName,
    performedByRole: requesterType,
    city,
  })

  return { ...request, id: result.insertedId.toString() }
}

export async function donorAcceptsRequest(
  requestId: string,
  donorId: string,
  donorEmail: string,
  donorName: string,
  city: string
): Promise<BloodRequest> {
  const dbName = getDbNameForCity(city)
  const db = await getDb(dbName)

  const request = await db.collection('blood_requests').findOne({ _id: new ObjectId(requestId) })
  if (!request) throw new Error('Request not found')
  if (request.status !== 'open') throw new Error('Request already accepted or expired')

  // Get donor info
  const donor = await db.collection('users').findOne({ _id: new ObjectId(donorId) })
  if (!donor) throw new Error('Donor not found')

  // Check eligibility
  const eligibility = await checkDonorEligibility(donorId, city)
  if (!eligibility.eligible) {
    throw new Error(`Donor not eligible: ${eligibility.reasons.join(', ')}`)
  }

  const now = new Date().toISOString()
  const existingDonation = await db.collection('donations').findOne({ requestId, donorId })
  const donationId = existingDonation?._id || new ObjectId()

  if (!existingDonation) {
    await db.collection('donations').insertOne({
      _id: donationId,
      requestId,
      donorId,
      donorEmail,
      donorName,
      recipientId: request.requesterId,
      recipientEmail: request.requesterEmail,
      recipientName: request.requesterName,
      bloodGroup: request.bloodGroup,
      units: Number(request.units) || 1,
      city,
      hospitalName: request.hospitalName,
      communicationDate: now,
      status: 'pending',
      donorConfirmed: false,
      recipientConfirmed: false,
      certificateGenerated: false,
      createdAt: now,
      updatedAt: now,
    })
  }

  await db.collection('blood_requests').updateOne(
    { _id: new ObjectId(requestId) },
    {
      $set: {
        status: 'accepted',
        acceptedDonorId: donorId,
        acceptedDonorName: donorName,
        acceptedDonorEmail: donorEmail,
        acceptedDonorPhone: donor.phone,
        donationId: donationId.toString(),
        acceptedAt: now,
        updatedAt: now,
      },
    }
  )

  // Create request acceptance record
  await db.collection('request_acceptances').insertOne({
    requestId,
    donorId,
    donorEmail,
    donorName,
    donorPhone: donor.phone,
    bloodGroup: request.bloodGroup,
    donationId: donationId.toString(),
    status: 'accepted',
    acceptedAt: now,
    createdAt: now,
    updatedAt: now,
  })

  // Notify requester
  await createNotification({
    recipientId: request.requesterId,
    recipientEmail: request.requesterEmail,
    recipientRole: request.requesterType,
    type: 'request_accepted',
    title: 'Donor Found!',
    message: `${donorName} has accepted to donate ${request.bloodGroup} blood for you!`,
    data: { requestId, donationId: donationId.toString(), donorName, donorEmail, donorPhone: donor.phone, donorId },
    read: false,
    priority: 'high',
    actionUrl: `/notifications/${donorId}`,
    actionLabel: 'View Donor',
    city,
  })

  // Notify donor that the receiver has opened a direct contact path.
  await createNotification({
    recipientId: donorId,
    recipientEmail: donorEmail,
    recipientRole: 'donor',
    type: 'request_accepted',
    title: 'Receiver Contacted You',
    message: `${request.requesterName} contacted you for ${request.bloodGroup} blood. Confirm after the donation is completed.`,
    data: {
      requestId,
      donationId: donationId.toString(),
      requesterId: request.requesterId,
      requesterName: request.requesterName,
      requesterEmail: request.requesterEmail,
      requesterPhone: request.requesterPhone,
    },
    read: false,
    priority: 'high',
    actionUrl: `/notifications/${request.requesterId}`,
    actionLabel: 'View Receiver',
    city,
  })

  await createAuditLog({
    action: 'donor_accepted_request',
    entityType: 'request',
    entityId: requestId,
    performedBy: donorEmail,
    performedByName: donorName,
    performedByRole: 'donor',
    city,
  })

  return {
    ...request,
    status: 'accepted',
    acceptedDonorId: donorId,
    acceptedDonorName: donorName,
    acceptedDonorEmail: donorEmail,
    acceptedDonorPhone: donor.phone,
    donationId: donationId.toString(),
    acceptedAt: now,
    updatedAt: now,
  } as BloodRequest
}

// ===== DONATION VERIFICATION =====
export async function submitDonationForVerification(
  donorId: string,
  donorEmail: string,
  donorName: string,
  hospitalId: string,
  hospitalName: string,
  bloodGroup: string,
  units: number,
  submissionProofUrl: string,
  city: string,
  appointmentId?: string
): Promise<DonationFull> {
  const dbName = getDbNameForCity(city)
  const db = await getDb(dbName)

  const now = new Date().toISOString()
  const donation: DonationFull = {
    donorId,
    donorEmail,
    donorName,
    hospitalName,
    hospitalId,
    city,
    appointmentId,
    bloodGroup,
    units,
    status: 'submitted',
    submittedAt: now,
    submissionProofUrl,
    verificationStatus: 'pending',
    certificateGenerated: false,
    createdAt: now,
    updatedAt: now,
  }

  const result = await db.collection('donations').insertOne(donation)

  // Notify hospital
  const hospital = await db.collection('users').findOne({ _id: new ObjectId(hospitalId) })
  if (hospital) {
    await createNotification({
      recipientId: hospitalId,
      recipientEmail: hospital.email,
      recipientRole: 'hospital',
      type: 'donation_verification',
      title: 'New Donation Submitted',
      message: `${donorName} submitted a ${bloodGroup} donation for verification`,
      data: { donationId: result.insertedId.toString(), donorName, bloodGroup },
      read: false,
      priority: 'high',
      city,
    })
  }

  await createAuditLog({
    action: 'donation_submitted',
    entityType: 'donation',
    entityId: result.insertedId.toString(),
    performedBy: donorEmail,
    performedByName: donorName,
    performedByRole: 'donor',
    city,
  })

  return { ...donation, id: result.insertedId.toString() }
}

export async function verifyDonationByHospital(
  donationId: string,
  hospitalStaffEmail: string,
  hospitalStaffName: string,
  hospitalId: string,
  bloodType: string,
  testResults: DonationFull['testResults'],
  city: string
): Promise<DonationFull> {
  const dbName = getDbNameForCity(city)
  const db = await getDb(dbName)

  const donation = await db.collection('donations').findOne({ _id: new ObjectId(donationId) })
  if (!donation) throw new Error('Donation not found')
  if (donation.verificationStatus !== 'pending') throw new Error('Donation already verified or rejected')

  const now = new Date().toISOString()

  // Create blood units for inventory
  const bloodUnitIds: string[] = []
  const collectionDate = new Date().toISOString()
  const expiryDate = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString() // 35 days for RBC

  for (let i = 0; i < donation.units; i++) {
    const unitId = `${donation.donorId}-${Date.now()}-${i}`
    const unitResult = await db.collection('blood_units').insertOne({
      hospitalId,
      hospitalName: donation.hospitalName,
      unitId,
      bloodType: bloodType || donation.bloodGroup,
      collectionDate,
      expiryDate,
      donationId,
      donorName: donation.donorName,
      donorId: donation.donorId,
      status: 'available',
      testResults: testResults || {},
      createdAt: now,
      updatedAt: now,
    })
    bloodUnitIds.push(unitResult.insertedId.toString())
  }

  // Generate certificate for verified donation
  const certificateUrl = await generateCertificateFile({
    donorName: donation.donorName,
    donationId,
    date: now,
  })
  const certificateId = certificateUrl.split('/').pop()?.replace('.pdf', '') || `CERT-${donationId}`

  // Update donation
  await db.collection('donations').updateOne(
    { _id: new ObjectId(donationId) },
    {
      $set: {
        verificationStatus: 'verified',
        verifiedAt: now,
        verifiedBy: hospitalStaffEmail,
        verifiedByName: hospitalStaffName,
        testResults,
        bloodUnitIds,
        status: 'verified',
        certificateGenerated: true,
        certificateUrl,
        certificateId,
        donationDate: donation.donationDate || now,
        updatedAt: now,
      },
    }
  )

  // Update donor stats
  await db.collection('users').updateOne(
    { _id: new ObjectId(donation.donorId) },
    {
      $set: { lastDonationDate: now },
      $inc: { totalDonations: 1, livesImpacted: donation.units },
    }
  )

  // Update hospital inventory
  await updateHospitalInventory(hospitalId, donation.hospitalName, bloodType || donation.bloodGroup, donation.units, city)

  // Notify donor
  await createNotification({
    recipientId: donation.donorId,
    recipientEmail: donation.donorEmail,
    recipientRole: 'donor',
    type: 'donation_verification',
    title: 'Donation Verified ✓',
    message: `Your ${bloodType || donation.bloodGroup} blood donation has been verified and added to the blood bank!`,
    data: { donationId, bloodType: bloodType || donation.bloodGroup, units: donation.units },
    read: false,
    priority: 'high',
    city,
  })

  await createAuditLog({
    action: 'donation_verified',
    entityType: 'donation',
    entityId: donationId,
    performedBy: hospitalStaffEmail,
    performedByName: hospitalStaffName,
    performedByRole: 'hospital',
    changes: { after: { status: 'verified', testResults } },
    city,
  })

  return {
    ...donation,
    verificationStatus: 'verified',
    verifiedAt: now,
    verifiedBy: hospitalStaffEmail,
    testResults,
    bloodUnitIds,
  } as DonationFull
}

// ===== INVENTORY MANAGEMENT =====

export async function updateHospitalInventory(
  hospitalId: string,
  hospitalName: string,
  bloodType: string,
  unitsAdded: number,
  city: string
): Promise<void> {
  const dbName = getDbNameForCity(city)
  const db = await getDb(dbName)

  const existing = await db.collection('hospital_inventory').findOne({ hospitalId })

  if (existing) {
    const currentBlood = existing.bloodTypes[bloodType] || { available: 0, reserved: 0, expired: 0, total: 0 }
    await db.collection('hospital_inventory').updateOne(
      { hospitalId },
      {
        $set: {
          [`bloodTypes.${bloodType}`]: {
            available: (currentBlood.available || 0) + unitsAdded,
            reserved: currentBlood.reserved || 0,
            expired: currentBlood.expired || 0,
            total: (currentBlood.total || 0) + unitsAdded,
          },
          lastUpdated: new Date().toISOString(),
        },
      }
    )
  } else {
    await db.collection('hospital_inventory').insertOne({
      hospitalId,
      hospitalName,
      city,
      bloodTypes: {
        [bloodType]: { available: unitsAdded, reserved: 0, expired: 0, total: unitsAdded },
      },
      lastUpdated: new Date().toISOString(),
    })
  }
}

// ===== NOTIFICATIONS =====
export async function createNotification(data: Omit<RealtimeNotification, 'id' | '_id' | 'createdAt' | 'readAt'>): Promise<RealtimeNotification> {
  const dbName = getDbNameForCity(data.city)
  const db = await getDb(dbName)

  const now = new Date().toISOString()
  const notification: RealtimeNotification = {
    ...data,
    read: false,
    createdAt: now,
  }

  const result = await db.collection('notifications').insertOne(notification)
  return { ...notification, id: result.insertedId.toString() }
}

export async function getUserNotifications(userId: string, userEmail: string, city: string, limit: number = 20): Promise<RealtimeNotification[]> {
  const dbName = getDbNameForCity(city)
  const db = await getDb(dbName)

  const docs = await db.collection('notifications')
    .find({ recipientEmail: userEmail })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()

  return docs.map(doc => ({
    ...doc,
    id: doc._id.toString(),
    read: doc.read ?? false,
    recipientId: doc.recipientId,
    recipientEmail: doc.recipientEmail,
    recipientRole: doc.recipientRole,
    type: doc.type,
    title: doc.title,
    message: doc.message,
    data: doc.data,
    priority: doc.priority,
    createdAt: doc.createdAt,
    city: doc.city,
    actionUrl: doc.actionUrl,
    actionLabel: doc.actionLabel,
    readAt: doc.readAt,
    expiresAt: doc.expiresAt,
  }))
}

// ===== AUDIT LOGGING =====
export async function createAuditLog(data: Omit<AuditLog, 'id' | '_id' | 'timestamp'>): Promise<void> {
  const dbName = getDbNameForCity(data.city)
  const db = await getDb(dbName)

  await db.collection('audit_logs').insertOne({
    ...data,
    timestamp: new Date().toISOString(),
  })
}
