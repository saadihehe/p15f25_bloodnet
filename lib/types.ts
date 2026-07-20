export type AppRole = 'donor' | 'receiver' | 'hospital' | 'admin'
export type EligibilityStatus = 'eligible' | 'not_eligible'

import type { ObjectId } from 'mongodb'

export interface MongoUser {
  _id: ObjectId
  email: string
  name: string
  phone: string
  role: AppRole
  city: string
  bloodGroup?: string
  area?: string
  cnic?: string
  gender?: string
  dateOfBirth?: string
  isVerified?: boolean
  lastDonationDate?: string
  nextEligibleDonationDate?: string
  eligibilityStatus?: EligibilityStatus
  totalDonations?: number
  livesImpacted?: number
  achievements?: string[]
  availability?: boolean
  createdAt?: string
  passwordHash?: string
}

export interface Donor {
  id: string
  name: string
  bloodGroup: string
  city: string
  phone: string
  email: string
  age: number
  lastDonation: string
  health: number
  available: boolean
  lat: number
  lng: number
  donations: number
  verified: boolean
}

export interface AppUser {
  id: string
  name: string
  email: string
  phone: string
  role: AppRole
  bloodGroup?: string
  city: string
  area?: string
  isVerified?: boolean
  eligibilityStatus?: EligibilityStatus
}
