import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizePakistaniPhone, validateSignupInput } from '../lib/validation-utils.js'

test('rejects invalid email and phone formats', () => {
  const result = validateSignupInput({
    name: 'Ali Khan',
    email: 'not-an-email',
    password: 'abc123',
    phone: '12345',
    role: 'donor',
    city: 'Karachi',
    bloodGroup: 'O+',
  })

  assert.equal(result.isValid, false)
  assert.ok(result.errors.some((error) => error.includes('email')))
  assert.ok(result.errors.some((error) => error.includes('Phone number')))
  assert.ok(result.errors.some((error) => error.includes('Password')))
})

test('accepts correctly formatted Pakistani signup details', () => {
  const result = validateSignupInput({
    name: 'Ali Khan',
    email: 'ali@example.com',
    password: 'StrongPass123',
    phone: '+923331234567',
    role: 'donor',
    city: 'Karachi',
    bloodGroup: 'O+',
  })

  assert.equal(result.isValid, true)
  assert.deepEqual(result.errors, [])
})

test('normalizes local and dashed Pakistani phone numbers', () => {
  assert.equal(normalizePakistaniPhone('0333 1234567'), '+923331234567')
  assert.equal(normalizePakistaniPhone('+92-333-1234567'), '+923331234567')
})
