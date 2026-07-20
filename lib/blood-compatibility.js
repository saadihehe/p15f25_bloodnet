export const compatibleDonorBloodGroups = {
  'O-': ['O-'],
  'O+': ['O+', 'O-'],
  'A-': ['A-', 'O-'],
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
}

export function getCompatibleDonorBloodGroups(recipientBloodGroup) {
  return compatibleDonorBloodGroups[recipientBloodGroup || ''] || []
}

export function canDonateToRecipient(donorBloodGroup, recipientBloodGroup) {
  return getCompatibleDonorBloodGroups(recipientBloodGroup).includes(donorBloodGroup || '')
}

