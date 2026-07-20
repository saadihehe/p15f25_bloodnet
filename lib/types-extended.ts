/**
 * Extended types for end-to-end blood donation system
 * Includes: Appointments, Requests, Inventory, Audit logs, Verification
 */

import { ObjectId } from 'mongodb'

/**
 * APPOINTMENT BOOKING SYSTEM
 */
export interface Appointment {
  _id?: ObjectId
  id?: string
  donorId: string
  donorEmail: string
  donorName: string
  hospitalId: string
  hospitalName: string
  hospitalCity: string
  appointmentDate: string // ISO date
  appointmentTime: string // HH:mm format
  status: 'scheduled' | 'confirmed' | 'no_show' | 'completed' | 'cancelled'
  bloodGroup: string
  eligibilityStatus?: 'eligible' | 'not_eligible' | 'pending_check'
  notes?: string
  reminderSent?: boolean
  createdAt: string
  updatedAt: string
  cancelledAt?: string
  cancelledReason?: string
  completedAt?: string
}

/**
 * BLOOD REQUEST WITH FULFILLMENT TRACKING
 */
export interface BloodRequest {
  _id?: ObjectId
  id?: string
  requesterId: string
  requesterEmail: string
  requesterName: string
  requesterType: 'receiver' | 'hospital'
  requesterPhone?: string
  bloodGroup: string
  units: number
  urgency: 'emergency' | 'urgent' | 'normal'
  city: string
  hospitalName?: string
  reason?: string
  status: 'open' | 'accepted' | 'fulfilled' | 'expired' | 'cancelled'
  
  // Fulfillment tracking
  acceptedDonorId?: string
  acceptedDonorName?: string
  acceptedDonorEmail?: string
  acceptedDonorPhone?: string
  donationId?: string
  acceptedAt?: string
  estimatedDeliveryTime?: string
  
  // Completion tracking
  deliveredAt?: string
  deliveryProofUrl?: string
  hospitalConfirmedAt?: string
  hospitalConfirmedBy?: string // Staff name
  
  // Metadata
  expiresAt: string
  createdAt: string
  updatedAt: string
}

/**
 * DONOR ACCEPTANCE OF REQUEST
 */
export interface RequestAcceptance {
  _id?: ObjectId
  id?: string
  requestId: string
  donorId: string
  donorEmail: string
  donorName: string
  bloodGroup: string
  status: 'accepted' | 'rejected' | 'cancelled'
  acceptedAt: string
  rejectionReason?: string
  appointmentCreatedId?: string
  createdAt: string
  updatedAt: string
}

/**
 * INVENTORY - UNIT LEVEL TRACKING
 */
export interface BloodUnit {
  _id?: ObjectId
  id?: string
  hospitalId: string
  hospitalName: string
  unitId: string // Unique barcode/ID from hospital system
  bloodType: string // O+, O-, A+, A-, B+, B-, AB+, AB-
  collectionDate: string // ISO date
  expiryDate: string // ISO date (35 days after collection for RBC)
  donationId?: string // Link to original donation
  donorName?: string
  donorId?: string
  status: 'available' | 'reserved' | 'transfused' | 'expired' | 'discarded'
  reservedFor?: string // Request ID or patient name
  reservedAt?: string
  transfusedAt?: string
  transfusedTo?: string // Patient name
  testResults?: {
    bloodType: boolean
    hiv: boolean
    hepatitisB: boolean
    hepatitisC: boolean
    syphilis: boolean
    rPR: boolean // Rapid Plasma Reagin
  }
  locationInBank?: string // Rack, shelf info
  quality?: 'good' | 'questionable' | 'discarded'
  createdAt: string
  updatedAt: string
}

export interface HospitalInventory {
  _id?: ObjectId
  id?: string
  hospitalId: string
  hospitalName: string
  city: string
  bloodTypes: {
    [key: string]: {
      available: number
      reserved: number
      expired: number
      total: number
    }
  }
  lastUpdated: string
}

/**
 * DONATION WITH FULL VERIFICATION WORKFLOW
 */
export interface DonationFull {
  _id?: ObjectId
  id?: string
  donorId: string
  donorEmail: string
  donorName: string
  hospitalName: string
  hospitalId: string
  city: string
  
  // Appointment info
  appointmentId?: string
  appointmentDate?: string
  
  // Blood info
  bloodGroup: string
  units: number
  
  // Submission phase
  status: 'submitted' | 'verified' | 'rejected' | 'used' | 'expired'
  submittedAt: string
  submissionProofUrl?: string // Receipt/barcode from hospital lab
  
  // Verification phase (Hospital)
  verificationStatus: 'pending' | 'verified' | 'rejected'
  verifiedAt?: string
  verifiedBy?: string // Staff email/name
  verificationNotes?: string
  
  // Test results
  testResults?: {
    bloodType: string
    hiv: 'negative' | 'positive' | 'pending'
    hepatitisB: 'negative' | 'positive' | 'pending'
    hepatitisC: 'negative' | 'positive' | 'pending'
    syphilis: 'negative' | 'positive' | 'pending'
  }
  
  // Inventory assignment
  bloodUnitIds?: string[] // Link to BloodUnit records
  
  // Receiver confirmation (if applicable)
  receiverId?: string
  receiverEmail?: string
  receiverName?: string
  receiverConfirmedAt?: string
  receiverConfirmationProofUrl?: string
  
  // Certificate
  certificateGenerated: boolean
  certificateUrl?: string
  certificateGeneratedAt?: string
  
  // Metadata
  createdAt: string
  updatedAt: string
  rejectionReason?: string
  rejectedAt?: string
}

/**
 * AUDIT LOG - Track all critical actions
 */
export interface AuditLog {
  _id?: ObjectId
  id?: string
  action: string // 'donation_verified', 'inventory_updated', 'appointment_confirmed', etc.
  entityType: string // 'donation', 'appointment', 'request', 'inventory'
  entityId: string
  performedBy: string // User email or staff ID
  performedByName: string
  performedByRole: string
  changes?: {
    before?: Record<string, any>
    after?: Record<string, any>
  }
  reason?: string
  ipAddress?: string
  timestamp: string
  city: string
}

/**
 * ELIGIBILITY CHECK RESULT
 */
export interface EligibilityCheckResult {
  donorId: string
  eligible: boolean
  age?: { eligible: boolean; reason?: string }
  lastDonation?: { eligible: boolean; daysSinceLastDonation?: number; reason?: string }
  weight?: { eligible: boolean; reason?: string }
  medicalStatus?: { eligible: boolean; reason?: string }
  reasons: string[]
  checkedAt: string
}

/**
 * REAL-TIME NOTIFICATION
 */
export interface RealtimeNotification {
  _id?: ObjectId
  id?: string
  recipientId: string
  recipientEmail: string
  recipientRole: string
  type: 'blood_request' | 'donation_verification' | 'appointment_reminder' | 'request_accepted' | 'blood_received' | 'eligibility_alert' | 'connection' | 'donation_completed' | 'certificate_ready'
  title: string
  message: string
  data: Record<string, any> // Contextual data (requestId, donorId, etc.)
  read: boolean
  actionUrl?: string
  actionLabel?: string
  priority: 'low' | 'medium' | 'high'
  createdAt: string
  readAt?: string
  expiresAt?: string
  city: string
}

/**
 * EXTENDED USER TYPE WITH ELIGIBILITY & STATS
 */
export interface MongoUserExtended {
  _id?: ObjectId
  email: string
  name: string
  phone: string
  role: 'donor' | 'receiver' | 'hospital' | 'admin'
  city: string
  bloodGroup?: string
  
  // Donor-specific
  dateOfBirth?: string
  weight?: number // kg
  lastDonationDate?: string
  totalDonations: number
  livesImpacted: number
  eligibilityStatus?: 'eligible' | 'not_eligible' | 'pending_check'
  lastEligibilityCheck?: string
  
  // Receiver-specific
  medicalCondition?: string
  
  // Hospital-specific
  hospitalId?: string
  staffRole?: string // 'admin', 'blood_bank', 'receptionist'
  
  // General
  availability?: boolean
  isVerified: boolean
  achievements?: string[]
  preferencesNotifications?: boolean
  createdAt: string
  updatedAt?: string
}
