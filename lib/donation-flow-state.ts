export function getDonationFlowState(
  status: string,
  donorConfirmed: boolean,
  receiverConfirmed: boolean
) {
  if (status === 'completed') {
    return {
      status: 'completed',
      label: 'Completed',
      canConfirmDonor: false,
      canConfirmReceiver: false,
      canApprove: false,
    }
  }

  if (!donorConfirmed && !receiverConfirmed) {
    return {
      status: 'awaiting-donor-confirmation',
      label: 'Waiting for both confirmations',
      canConfirmDonor: true,
      canConfirmReceiver: true,
      canApprove: false,
    }
  }

  if (!donorConfirmed && receiverConfirmed) {
    return {
      status: 'awaiting-donor-confirmation',
      label: 'Receiver confirmed. Waiting for donor confirmation',
      canConfirmDonor: true,
      canConfirmReceiver: false,
      canApprove: false,
    }
  }

  if ((status === 'submitted' || donorConfirmed) && !receiverConfirmed) {
    return {
      status: 'awaiting-receiver-confirmation',
      label: 'Waiting for receiver confirmation',
      canConfirmDonor: false,
      canConfirmReceiver: true,
      canApprove: false,
    }
  }

  if (donorConfirmed && receiverConfirmed) {
    return {
      status: 'ready-for-admin-approval',
      label: 'Ready for admin approval',
      canConfirmDonor: false,
      canConfirmReceiver: false,
      canApprove: true,
    }
  }

  return {
    status: 'pending',
    label: 'Pending',
    canConfirmDonor: true,
    canConfirmReceiver: false,
    canApprove: false,
  }
}
