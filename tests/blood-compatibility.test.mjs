import test from 'node:test'
import assert from 'node:assert/strict'
import { canDonateToRecipient, getCompatibleDonorBloodGroups } from '../lib/blood-compatibility.js'

test('A positive receivers can receive A+, A-, O+, and O-', () => {
  assert.deepEqual(getCompatibleDonorBloodGroups('A+'), ['A+', 'A-', 'O+', 'O-'])
})

test('rejects incompatible blood donor matches', () => {
  assert.equal(canDonateToRecipient('B+', 'A+'), false)
  assert.equal(canDonateToRecipient('O-', 'A+'), true)
})
