export const compatibleDonorBloodGroups: Record<string, string[]> = {
  'O-': ['O-'],
  'O+': ['O+', 'O-'],
  'A-': ['A-', 'O-'],
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
}

export function getCompatibleDonorBloodGroups(recipientBloodGroup?: string) {
  return compatibleDonorBloodGroups[recipientBloodGroup || ''] || []
}

export function canDonateToRecipient(donorBloodGroup?: string, recipientBloodGroup?: string) {
  return getCompatibleDonorBloodGroups(recipientBloodGroup).includes(donorBloodGroup || '')
}

