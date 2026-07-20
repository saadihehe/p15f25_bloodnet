export type DonationStatus =
  | 'pending'
  | 'submitted'
  | 'confirmed'
  | 'verified'
  | 'rejected'
  | 'receipt_uploaded'
  | 'receipt_verified'
  | 'receiver_confirmed'
  | 'completed'

export interface DonationRecord {
  id: string
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
  communicationDate?: string
  donationDate?: string
  recipientConfirmed?: boolean
  recipientConfirmedDate?: string
  recipientRating?: number
  recipientReview?: string
  hospitalId?: string
  hospitalName?: string
  receiptUrl?: string
  receiptVerificationStatus?: 'pending' | 'verified' | 'rejected'
  verificationStatus?: 'pending' | 'verified' | 'rejected'
  verifiedBy?: string
  verifiedByName?: string
  rejectionReason?: string
  certificateGenerated?: boolean
  certificateUrl?: string
  certificateId?: string
  requestId?: string
  city?: string
  createdAt?: string
}
