export function validateSignupInput(input) {
  const errors = []

  if (!input.name || input.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long')
  }

  if (!isValidEmail(input.email)) {
    errors.push('Please enter a valid email address')
  }

  if (!input.password || input.password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  } else if (!/(?=.*[A-Z])(?=.*[a-z])(?=.*\d)/.test(input.password)) {
    errors.push('Password must include uppercase, lowercase, and a number')
  }

  if (!isValidPakistaniPhone(input.phone)) {
    errors.push('Phone number must be a valid Pakistani number in format +92xxxxxxxxxx')
  }

  if (!input.role || !['donor', 'receiver', 'hospital'].includes(input.role)) {
    errors.push('Please select a valid account role')
  }

  if (!input.city || input.city.trim().length < 2) {
    errors.push('Please select a city')
  }

  if ((input.role === 'donor' || input.role === 'receiver') && (!input.bloodGroup || !VALID_BLOOD_GROUPS.includes(input.bloodGroup))) {
    errors.push('Please select your blood group')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export const VALID_BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']

export function isValidEmail(email) {
  return Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()))
}

export function normalizePakistaniPhone(phone) {
  const raw = String(phone || '').trim()
  const digits = raw.replace(/\D/g, '')

  if (digits.length === 12 && digits.startsWith('92')) {
    return `+${digits}`
  }

  if (digits.length === 11 && digits.startsWith('0')) {
    return `+92${digits.slice(1)}`
  }

  if (digits.length === 10) {
    return `+92${digits}`
  }

  return raw.replace(/\s+/g, '')
}

export function isValidPakistaniPhone(phone) {
  return /^\+92[0-9]{10}$/.test(normalizePakistaniPhone(phone))
}
