import test from 'node:test'
import assert from 'node:assert/strict'
import { getDonationFlowState } from '../lib/donation-flow-state.js'

test('marks donations as awaiting donor confirmation before donor confirms', () => {
  const state = getDonationFlowState('pending', false, false)
  assert.equal(state.status, 'awaiting-donor-confirmation')
  assert.equal(state.canConfirmDonor, true)
  assert.equal(state.canConfirmReceiver, true)
})

test('keeps donor confirmation open when receiver confirms first', () => {
  const state = getDonationFlowState('pending', false, true)
  assert.equal(state.status, 'awaiting-donor-confirmation')
  assert.equal(state.canConfirmDonor, true)
  assert.equal(state.canConfirmReceiver, false)
  assert.equal(state.canApprove, false)
})

test('marks donations ready for admin approval after both parties confirm', () => {
  const state = getDonationFlowState('receiver_confirmed', true, true)
  assert.equal(state.status, 'ready-for-admin-approval')
  assert.equal(state.canConfirmDonor, false)
  assert.equal(state.canConfirmReceiver, false)
  assert.equal(state.canApprove, true)
})
