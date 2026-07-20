'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BloodBadge } from '@/components/blood-badge'
import { User, Heart, MapPin, Calendar, TrendingUp, Award, CheckCircle, AlertCircle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { DonationRecord } from '@/lib/donation-types'
import { getDonationFlowState } from '@/lib/donation-flow-state'
import dynamic from 'next/dynamic'

const KarachiBloodRequestMap = dynamic(
  () => import('@/components/karachi-blood-request-map').then((mod) => ({ default: mod.KarachiBloodRequestMap })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-96 bg-muted rounded-lg flex items-center justify-center">
        Loading map...
      </div>
    ),
  }
)

interface DonorDashboardProps {
  user: any
}

function formatStatusLabel(status: DonationRecord['status']) {
  switch (status) {
    case 'pending':
      return 'Awaiting Confirmation'
    case 'receipt_uploaded':
      return 'Receipt Uploaded'
    case 'receipt_verified':
      return 'Verified'
    case 'completed':
      return 'Completed'
    case 'receiver_confirmed':
      return 'Confirmed'
    case 'rejected':
      return 'Rejected'
    default:
      return 'Unknown'
  }
}

export default function DonorDashboard({ user }: DonorDashboardProps) {
  const [donations, setDonations] = useState<DonationRecord[]>([])
  const [bloodRequests, setBloodRequests] = useState<any[]>([])
  const [isLoadingDonations, setIsLoadingDonations] = useState(true)
  const [isLoadingRequests, setIsLoadingRequests] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (!user?.id) return

    async function loadDonations() {
      try {
        const response = await fetch(
          `/api/donations?city=${encodeURIComponent(user.city)}&donorId=${encodeURIComponent(user.id)}`
        )
        if (!response.ok) {
          console.error('Failed to load donor donations')
          return
        }
        const data = await response.json()
        if (Array.isArray(data)) {
          setDonations(data)
        }
      } catch (error) {
        console.error('Failed to load donations:', error)
      } finally {
        setIsLoadingDonations(false)
      }
    }

    loadDonations()
  }, [user])

  useEffect(() => {
    if (!user?.city) return

    async function loadRequests() {
      try {
        const response = await fetch(
          `/api/blood-requests?city=${encodeURIComponent(user.city)}&donorId=${encodeURIComponent(user.id)}&donorEmail=${encodeURIComponent(user.email)}`
        )
        if (!response.ok) {
          console.error('Failed to load blood requests')
          return
        }
        const data = await response.json()
        if (Array.isArray(data.bloodRequests)) {
          setBloodRequests(data.bloodRequests)
        }
      } catch (error) {
        console.error('Failed to load blood requests:', error)
      } finally {
        setIsLoadingRequests(false)
      }
    }

    loadRequests()
  }, [user])

  const totalDonations = donations.length
  const completedDonations = donations.filter((donation) =>
    ['completed', 'receipt_verified'].includes(donation.status)
  ).length
  const livesImpacted = completedDonations * 3

  const badges = [
    {
      name: 'Gold Donor',
      description: '30+ donations',
      icon: Award,
      unlocked: totalDonations >= 30,
    },
    {
      name: 'Lifesaver',
      description: '100+ lives saved',
      icon: Heart,
      unlocked: livesImpacted >= 100,
    },
    {
      name: 'Community Hero',
      description: '5+ referrals',
      icon: CheckCircle,
      unlocked: false,
    },
    {
      name: 'Emergency Responder',
      description: '5+ emergency donations',
      icon: AlertCircle,
      unlocked: donations.filter((d) => d.status === 'completed').length >= 5,
    },
  ]

  const donationHistory = donations
    .slice()
    .sort((a, b) => {
      const aDate = new Date(a.donationDate || a.communicationDate || new Date().toISOString()).getTime()
      const bDate = new Date(b.donationDate || b.communicationDate || new Date().toISOString()).getTime()
      return bDate - aDate
    })
    .slice(0, 5)

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground font-medium">Eligibility Status</p>
                <p className="text-2xl font-bold mt-2 text-green-600">
                  {user?.eligibilityStatus === 'not_eligible' ? 'Waiting' : 'Eligible'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {user?.eligibilityStatus === 'not_eligible'
                    ? 'Please wait until you are eligible again'
                    : 'Can donate now'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total Donations</p>
                <p className="text-3xl font-bold mt-2">{isLoadingDonations ? '—' : totalDonations}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isLoadingDonations
                    ? 'Loading donation data'
                    : `Last 12 months: ${donationHistory.filter((donation) => {
                        const date = new Date(donation.donationDate || donation.communicationDate || new Date().toISOString())
                        const yearAgo = new Date()
                        yearAgo.setFullYear(yearAgo.getFullYear() - 1)
                        return date >= yearAgo
                      }).length}`}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-red-100">
                <Heart className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Lives Impacted</p>
                <p className="text-3xl font-bold mt-2">{isLoadingDonations ? '—' : livesImpacted}</p>
                <p className="text-xs text-muted-foreground mt-1">Est. recipients</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Blood Type</p>
                <p className="text-2xl font-bold mt-2">{user?.bloodGroup || 'N/A'}</p>
                <p className="text-xs text-muted-foreground mt-1">High demand</p>
              </div>
              <BloodBadge bloodType={user?.bloodGroup || 'O+'} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Your Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {badges.map((badge) => {
              const Icon = badge.icon
              return (
                <div
                  key={badge.name}
                  className={`p-4 rounded-lg border-2 text-center ${
                    badge.unlocked
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/30 bg-muted/30 opacity-60'
                  }`}
                >
                  <div
                    className={`p-2 rounded-full w-fit mx-auto mb-2 ${
                      badge.unlocked ? 'bg-primary/20' : 'bg-muted'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${badge.unlocked ? 'text-primary' : 'text-muted-foreground'}`}
                    />
                  </div>
                  <p className="font-semibold text-sm">{badge.name}</p>
                  <p className="text-xs text-muted-foreground">{badge.description}</p>
                  {!badge.unlocked && <p className="text-xs text-muted-foreground mt-1">Locked</p>}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
          <TabsTrigger value="requests">Requests & Tracking</TabsTrigger>
          <TabsTrigger value="history">Donation History</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Requests assigned to you</h3>
                <span className="text-sm text-muted-foreground">Live tracking for donor actions</span>
              </div>
              {isLoadingRequests ? (
                <p className="text-sm text-muted-foreground">Loading requests...</p>
              ) : bloodRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No requests are currently assigned to you.</p>
              ) : (
                <div className="space-y-3">
                  {bloodRequests.map((request) => {
                    const hasDonationTracking = Boolean(request.donationId)
                    const receiverPhone = request.requesterPhone || request.contactNumber || ''
                    return (
                      <div key={request.id} className="rounded-lg border p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-semibold">{request.unitsRequired || request.units} units of {request.bloodGroup}</p>
                            <p className="text-sm text-muted-foreground mt-1">{request.requesterName || 'Receiver'} • {request.hospitalName || request.city}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {hasDonationTracking ? 'Receiver contacted you. Confirm after you donate.' : 'Request assigned to you'}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-block px-3 py-1 rounded text-sm font-semibold ${request.urgencyLevel === 'emergency' ? 'bg-red-100 text-red-700' : request.urgencyLevel === 'urgent' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                              {request.urgencyLevel ? request.urgencyLevel.charAt(0).toUpperCase() + request.urgencyLevel.slice(1) : 'Normal'}
                            </span>
                            <p className="text-xs text-muted-foreground mt-1">{request.createdAt || 'Recently'}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {hasDonationTracking && (
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => {
                              void (async () => {
                                try {
                                  const res = await fetch(`/api/donations/${request.donationId}/donor-confirm`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      donorId: user.id,
                                      donorName: user.name,
                                      city: user.city,
                                    }),
                                  })
                                  const payload = await res.json()
                                  if (!res.ok || !payload.success) throw new Error(payload.error || payload.message || 'Failed to confirm donation')
                                  toast({ title: 'Donation confirmed', description: 'Waiting for receiver confirmation before admin approval.', variant: 'default' })
                                  window.location.reload()
                                } catch (error) {
                                  toast({ title: 'Confirmation failed', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
                                }
                              })()
                            }}>
                              Confirm Donated
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const normalizedPhone = receiverPhone.replace(/[^0-9]/g, '')
                              if (normalizedPhone) {
                                window.open(`https://wa.me/${normalizedPhone}?text=Hi%20${request.requesterName || 'receiver'}%2C%20I%20am%20ready%20to%20help%20with%20the%20blood%20request.`, '_blank')
                                return
                              }
                              toast({ title: 'No phone number', description: 'Receiver phone number is not available for this request.', variant: 'destructive' })
                            }}
                          >
                            Contact Receiver
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-bold mb-4">Blood Requests Near You</h3>
              <KarachiBloodRequestMap requests={bloodRequests} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-green-600" />
                Submit Blood Donation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                After you donate blood at a registered hospital, submit it here. The hospital will verify and you'll receive a digital certificate.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-semibold block mb-2">Select Hospital</label>
                  <select className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm" id="hospital-select">
                    <option value="">-- Select a hospital --</option>
                    <option value="Mamji Hospital">Mamji Hospital</option>
                    <option value="Patal Hospital">Patal Hospital</option>
                    <option value="Indus Hospital">Indus Hospital</option>
                    <option value="Aga Khan University Hospital">Aga Khan University Hospital</option>
                    <option value="Jinnah Postgraduate Medical Centre">Jinnah Postgraduate Medical Centre</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold block mb-2">Date of Donation</label>
                  <input type="date" className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm" id="donation-date" defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
              </div>
              <Button
                onClick={async () => {
                  const hospitalSelect = document.getElementById('hospital-select') as HTMLSelectElement
                  const donationDateInput = document.getElementById('donation-date') as HTMLInputElement
                  const hospital = hospitalSelect?.value
                  const donationDate = donationDateInput?.value

                  if (!hospital) {
                    toast({ title: 'Select hospital', description: 'Please select a hospital', variant: 'destructive' })
                    return
                  }

                  try {
                    const res = await fetch('/api/donations/submission', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        donorId: user.id,
                        donorName: user.name,
                        donorEmail: user.email,
                        bloodGroup: user.bloodGroup,
                        hospitalName: hospital,
                        city: user.city,
                        action: 'submit',
                        donationDate,
                      }),
                    })

                    const data = await res.json()
                    if (res.ok) {
                      toast({ title: 'Donation submitted', description: `Donation submitted! Hospital will verify shortly.`, variant: 'default' })
                      // Refresh donations
                      window.location.reload()
                    } else {
                      toast({ title: 'Submission error', description: `Error: ${data.error}`, variant: 'destructive' })
                    }
                  } catch (err) {
                    toast({ title: 'Submission failed', description: 'Failed to submit donation', variant: 'destructive' })
                  }
                }}
                className="w-full py-2 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
              >
                Submit Donation
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Your Donation History & Certificates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {isLoadingDonations ? (
                  <p className="text-sm text-muted-foreground">Loading donation history...</p>
                ) : donationHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">You have no donation records yet. Submit your first donation above!</p>
                ) : (
                  donationHistory.map((donation) => (
                    <div
                      key={donation.id}
                      className={`flex items-start justify-between p-4 border rounded-lg ${
                        donation.status === 'verified' ? 'border-green-200 bg-green-50 dark:bg-green-950/20' : 'border-border'
                      }`}
                    >
                      <div className="flex-1">
                        <p className="font-semibold flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {new Date(donation.donationDate || donation.communicationDate || donation.createdAt || new Date().toISOString()).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-muted-foreground">{donation.hospitalName || 'Unknown hospital'}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <BloodBadge bloodType={donation.bloodGroup} size="sm" />
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${
                            donation.status === 'verified'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              : donation.status === 'submitted'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                                : 'bg-gray-100 text-gray-700'
                          }`}>
                            {formatStatusLabel(donation.status)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {(() => {
                          const flow = getDonationFlowState(
                            donation.status || 'pending',
                            Boolean(donation.donorConfirmed || donation.status === 'submitted' || donation.status === 'receiver_confirmed' || donation.status === 'completed'),
                            Boolean(donation.recipientConfirmed || donation.status === 'receiver_confirmed' || donation.status === 'completed')
                          )

                          return (
                            <>
                              {flow.canConfirmDonor && (
                                <Button
                                  onClick={() => {
                                    void (async () => {
                                      try {
                                        const res = await fetch(`/api/donations/${donation.id}/donor-confirm`, {
                                          method: 'PATCH',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ donorId: user.id, donorName: user.name, city: user.city }),
                                        })
                                        const payload = await res.json()
                                        if (!res.ok || !payload.success) {
                                          throw new Error(payload.error || 'Failed to confirm donation')
                                        }
                                        toast({ title: 'Donation confirmed', description: 'Waiting for receiver confirmation before admin approval.', variant: 'default' })
                                        window.location.reload()
                                      } catch (err) {
                                        toast({ title: 'Confirmation failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
                                      }
                                    })()
                                  }}
                                  className="px-3 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors flex-shrink-0"
                                >
                                  Confirm Donated
                                </Button>
                              )}
                              {flow.canApprove && (
                                <span className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
                                  Waiting for admin approval
                                </span>
                              )}
                            </>
                          )
                        })()}
                        {donation.status === 'completed' && donation.certificateGenerated && (
                          <Button
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/donations/${donation.id}/certificate/download?city=${encodeURIComponent(user.city)}`)
                                if (!res.ok) throw new Error('Failed to download certificate')
                                const blob = await res.blob()
                                const url = window.URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = `BloodNet_Certificate_${donation.id}.pdf`
                                document.body.appendChild(a)
                                a.click()
                                document.body.removeChild(a)
                                window.URL.revokeObjectURL(url)
                                toast({ title: 'Certificate downloaded!', variant: 'default' })
                              } catch (err) {
                                toast({ title: 'Download failed', description: 'Failed to download certificate', variant: 'destructive' })
                              }
                            }}
                            className="px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
                          >
                            📄 Download Certificate
                          </Button>
                        )}
                        {donation.status === 'receiver_confirmed' && (
                          <Button
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/donations/${donation.id}/push-complete?city=${encodeURIComponent(user.city)}`, {
                                  method: 'POST',
                                })
                                const payload = await res.json()
                                if (!res.ok || !payload.success) {
                                  throw new Error(payload.error || 'Failed to push completion')
                                }
                                toast({ title: 'Donation confirmed!', description: 'Admin notified. Waiting for approval to issue certificate.', variant: 'default' })
                                window.location.reload()
                              } catch (err) {
                                toast({ title: 'Failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
                              }
                            }}
                            className="px-3 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-colors flex-shrink-0"
                          >
                            ✓ Push Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">Name</label>
                  <p className="text-lg font-semibold">{user.name}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Email</label>
                  <p className="text-lg font-semibold">{user.email}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Phone</label>
                  <p className="text-lg font-semibold">{user.phone}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Blood Type</label>
                  <div className="mt-1">
                    <BloodBadge bloodType={user.bloodGroup || 'O+'} size="lg" />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">City</label>
                  <p className="text-lg font-semibold">{user.city}</p>
                </div>
              </div>
              <Link href="/register-donor" className="w-full mt-6">
                <Button variant="outline" className="w-full bg-transparent">
                  Edit Profile
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
