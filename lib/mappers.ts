import { CITY_COORDS } from './db-config'
import type { AppUser, Donor, MongoUser } from './types'

function calculateAge(dateOfBirth?: string): number {
  if (!dateOfBirth) return 28
  const birth = new Date(dateOfBirth)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

function formatLastDonation(lastDonationDate?: string): string {
  if (!lastDonationDate) return '6 months ago'
  const date = new Date(lastDonationDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 30) return `${diffDays} days ago`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths} months ago`
  const diffYears = Math.floor(diffMonths / 12)
  return `${diffYears} years ago`
}

export function getEligibilityStatus(lastDonationDate?: string): 'eligible' | 'not_eligible' {
  if (!lastDonationDate) return 'eligible'
  const lastDonation = new Date(lastDonationDate)
  const now = new Date()
  const diffDays = (now.getTime() - lastDonation.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays < 90 ? 'not_eligible' : 'eligible'
}

export function mapMongoUserToAppUser(user: MongoUser): AppUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    bloodGroup: user.bloodGroup,
    city: user.city,
    area: user.area,
    isVerified: user.isVerified,
    eligibilityStatus: user.eligibilityStatus ?? getEligibilityStatus(user.lastDonationDate),
  }
}

export function mapMongoUserToDonor(user: MongoUser, index = 0): Donor {
  const coords = CITY_COORDS[user.city] ?? CITY_COORDS.Karachi
  const lat = coords.lat + (index % 5) * 0.002
  const lng = coords.lng + (index % 5) * 0.002

  return {
    id: user._id.toString(),
    name: user.name,
    bloodGroup: user.bloodGroup ?? 'O+',
    city: user.city,
    phone: user.phone,
    email: user.email,
    age: calculateAge(user.dateOfBirth),
    lastDonation: formatLastDonation(user.lastDonationDate),
    health: user.isVerified ? 92 : 85,
    available: user.availability ?? true,
    lat,
    lng,
    donations: user.totalDonations ?? 0,
    verified: user.isVerified ?? false,
  }
}

export function mapKarachiDonorDoc(doc: Record<string, unknown>): Donor {
  return {
    id: String(doc.id ?? doc._id),
    name: String(doc.name),
    bloodGroup: String(doc.bloodGroup),
    city: String(doc.city),
    phone: String(doc.phone),
    email: String(doc.email),
    age: Number(doc.age ?? 28),
    lastDonation: String(doc.lastDonation ?? '3 months ago'),
    health: Number(doc.health ?? 90),
    available: Boolean(doc.available ?? true),
    lat: Number(doc.lat),
    lng: Number(doc.lng),
    donations: Number(doc.donations ?? 0),
    verified: Boolean(doc.verified ?? false),
  }
}
