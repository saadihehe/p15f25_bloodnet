'use client'

import React from "react"

import { useState, useEffect } from 'react'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { BloodBadge } from '@/components/blood-badge'
import dynamic from 'next/dynamic'
import { MapPin, Phone, Heart, CheckCircle, Zap, Award, Lock, AlertTriangle, Bell } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { BloodRequestLoadingAnimation } from '@/components/blood-request-loading'
import { BloodRequestSuccessModal } from '@/components/blood-request-success-modal'

const DonorsMap = dynamic(() => import('@/components/donors-map').then(mod => ({ default: mod.DonorsMap })), {
  ssr: false,
  loading: () => <div className="w-full h-96 bg-muted rounded-lg flex items-center justify-center">Loading map...</div>
})

// Donor Recommendation Scoring Function
function calculateDonorScore(
  donor: SelectedDonor,
  urgencyLevel: 'normal' | 'urgent' | 'emergency',
  hospitalLat: number = 24.8607,
  hospitalLng: number = 67.0011
): { donor: SelectedDonor; score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  // 1. Health Score (0-20 points)
  const healthScore = (donor.health / 100) * 20
  score += healthScore
  if (donor.health > 90) reasons.push('Excellent health condition')
  else if (donor.health > 80) reasons.push('Good health condition')

  // 2. Verification Status (0-15 points)
  if (donor.verified) {
    score += 15
    reasons.push('Verified donor')
  } else {
    score += 5
  }

  // 3. Donation History Reliability (0-20 points)
  const donationReliability = Math.min((donor.donations / 20) * 20, 20)
  score += donationReliability
  if (donor.donations > 10) reasons.push(`Highly experienced (${donor.donations} donations)`)
  else if (donor.donations > 5) reasons.push(`Experienced (${donor.donations} donations)`)

  // 4. Distance/Proximity (0-20 points) - Closer is better
  const maxDistance = 15 // km
  const proximityScore = Math.max(0, (1 - donor.distance / maxDistance) * 20)
  score += proximityScore
  if (donor.distance < 2) reasons.push('Very close location')
  else if (donor.distance < 5) reasons.push('Nearby location')

  // 5. Urgency-based bonus (0-15 points)
  const daysSinceLastDonation = extractDaysFromLastDonation(donor.lastDonation)
  if (urgencyLevel === 'emergency') {
    // For emergency, prefer donors with quick recovery (usually 56+ days)
    if (daysSinceLastDonation > 56) {
      score += 15
      reasons.push('Available for emergency')
    } else {
      score += 5
    }
  } else if (urgencyLevel === 'urgent') {
    if (daysSinceLastDonation > 30) {
      score += 10
      reasons.push('Ready for urgent request')
    } else {
      score += 3
    }
  } else {
    // Normal - less strict
    if (daysSinceLastDonation > 14) {
      score += 10
      reasons.push('Ready for donation')
    }
  }

  // 6. Availability bonus (0-10 points)
  if (donor.available) {
    score += 10
    reasons.push('Currently available')
  }

  return { donor, score: Math.round(score * 10) / 10, reasons }
}

function extractDaysFromLastDonation(lastDonation: string): number {
  const match = lastDonation.match(/(\d+)\s+(day|month|year)/)
  if (!match) return 90
  const [, num, unit] = match
  const days = parseInt(num)
  if (unit.includes('month')) return days * 30
  if (unit.includes('year')) return days * 365
  return days
}

type Stage = 1 | 2 | 3

interface RequestData {
  patientName: string
  bloodGroup: string
  city: string
  hospitalName: string
  hospitalAddress: string
  urgencyLevel: 'normal' | 'urgent' | 'emergency'
  requiredByDate: string
  unitsRequired: string
  additionalNotes: string
  contactNumber: string
}

interface SelectedDonor {
  id: string
  name: string
  bloodGroup: string
  distance: number
  lastDonation: string
  health: number
  phone: string
  city: string
  available: boolean
  lat: number
  lng: number
  email: string
  age: number
  donations: number
  verified: boolean
}

const pakistaniCities = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta']
const bloodGroups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']

export default function RequestBloodPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [stage, setStage] = useState<Stage>(1)
  const [showEmergencyAlert, setShowEmergencyAlert] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successData, setSuccessData] = useState<{ donorName: string; bloodType: string; units: number } | null>(null)
  const [formData, setFormData] = useState<RequestData>({
    patientName: '',
    bloodGroup: '',
    city: 'Karachi',
    hospitalName: '',
    hospitalAddress: '',
    urgencyLevel: 'normal',
    requiredByDate: '',
    unitsRequired: '1',
    additionalNotes: '',
    contactNumber: '',
  })
  const [selectedDonor, setSelectedDonor] = useState<SelectedDonor | null>(null)
  const [filteredDonors, setFilteredDonors] = useState<SelectedDonor[]>([])
  const [hoveredDonor, setHoveredDonor] = useState<SelectedDonor | null>(null)
  const [recommendedDonors, setRecommendedDonors] = useState<Array<{ donor: SelectedDonor; score: number; reasons: string[] }>>([])
  const [requestData, setRequestData] = useState<RequestData>({
    patientName: '',
    bloodGroup: '',
    city: 'Karachi',
    hospitalName: '',
    hospitalAddress: '',
    urgencyLevel: 'normal',
    requiredByDate: '',
    unitsRequired: '1',
    additionalNotes: '',
    contactNumber: '',
  })

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180)
    const dLng = (lng2 - lng1) * (Math.PI / 180)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return parseFloat((R * c).toFixed(1))
  }

  const handleInputChange = (field: keyof RequestData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleStage1Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.bloodGroup || !formData.patientName || !formData.hospitalName) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields', variant: 'destructive' })
      return
    }
    
    setIsLoading(true)
    
    try {
      const res = await fetch(`/api/donors?city=${encodeURIComponent(formData.city)}&bloodGroup=${encodeURIComponent(formData.bloodGroup)}`)
      const data = await res.json()
      const dbDonors = data.donors ?? []

      const cityCoords: Record<string, { lat: number; lng: number }> = {
        Karachi: { lat: 24.8607, lng: 67.0011 },
        Lahore: { lat: 31.5204, lng: 74.3587 },
        Islamabad: { lat: 33.6844, lng: 73.0479 },
      }
      const center = cityCoords[formData.city] ?? cityCoords.Karachi

      const processed: SelectedDonor[] = dbDonors.map((donor: SelectedDonor) => ({
        ...donor,
        distance: calculateDistance(center.lat, center.lng, donor.lat, donor.lng)
      }))
      
      const scored = processed.map(donor => 
        calculateDonorScore(donor, formData.urgencyLevel, center.lat, center.lng)
      )
      
      const topRecommendations = scored
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
      
      processed.sort((a, b) => a.distance - b.distance)
      
      setFilteredDonors(processed)
      setRecommendedDonors(topRecommendations)
      setStage(2)
    } catch (error) {
      console.error('Failed to load donors:', error)
      toast({ title: 'Search failed', description: 'Failed to find donors. Please try again.', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDonorSelect = (donor: SelectedDonor) => {
    setSelectedDonor(donor)
    setStage(3)
  }

  const handleFinalSubmit = async () => {
    if (!selectedDonor) {
      toast({ title: 'No donor selected', description: 'Please select a donor before confirming', variant: 'destructive' })
      return
    }

    try {
      // Send blood request to API
      const response = await fetch('/api/blood-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: formData.patientName,
          bloodGroup: formData.bloodGroup,
          hospitalName: formData.hospitalName,
          hospitalAddress: formData.hospitalAddress,
          urgencyLevel: formData.urgencyLevel,
          unitsRequired: formData.unitsRequired,
          contactNumber: formData.contactNumber,
          selectedDonorId: selectedDonor.id,
          selectedDonorEmail: selectedDonor.email,
          selectedDonorName: selectedDonor.name,
          requesterId: user?.id || 'hospital-request',
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' }))
        console.error('[v0] Request failed:', err)
        toast({ title: 'Request failed', description: err?.error || 'Failed to create request', variant: 'destructive' })
        return
      }

      const data = await response.json()
      console.log('[v0] Blood request created:', data)

      // Show success modal with donor details
      setSuccessData({
        donorName: selectedDonor.name,
        bloodType: formData.bloodGroup,
        units: parseInt(formData.unitsRequired),
      })
      setShowSuccessModal(true)

      // If API returned a notification payload, forward it to notifications service
      if (data?.notification) {
        await fetch('/api/notifications', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add-notification',
            notification: data.notification,
          }),
        }).catch((e) => console.warn('Failed to forward notification:', e))
      }

      toast({ title: 'Request sent', description: `Request sent to ${selectedDonor.name}. All donors have been notified.`, variant: 'default' })
    } catch (error) {
      console.error('[v0] Error submitting blood request:', error)
      toast({ title: 'Request error', description: 'Error sending request. Please try again.', variant: 'destructive' })
      return
    }

    // Reset form
    setStage(1)
    setFormData({
      patientName: '',
      bloodGroup: '',
      city: 'Karachi',
      hospitalName: '',
      hospitalAddress: '',
      urgencyLevel: 'normal',
      requiredByDate: '',
      unitsRequired: '1',
      additionalNotes: '',
      contactNumber: '',
    })
    setSelectedDonor(null)
    setFilteredDonors([])
  }

  const handleEmergencyAlert = () => {
    if (!user) {
      toast({ title: 'Unauthorized', description: 'Please log in as a hospital to send emergency alerts', variant: 'destructive' })
      return
    }
    if (user.role !== 'hospital') {
      toast({ title: 'Permission denied', description: 'Only hospitals can send emergency blood alerts', variant: 'destructive' })
      return
    }
    setShowEmergencyAlert(true)
    setTimeout(() => {
      toast({ title: 'Emergency alert sent', description: `All ${filteredDonors.length} compatible donors have been notified.`, variant: 'default' })
      setShowEmergencyAlert(false)
    }, 1000)
  }

  // Show loading animation
  if (isLoading) {
    return (
      <>
        <Navbar />
        <BloodRequestLoadingAnimation />
        <Footer />
      </>
    )
  }

  // Show success modal
  if (showSuccessModal && successData) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gradient-to-b from-muted/20 to-background py-12 px-4">
          <BloodRequestSuccessModal
            donorName={successData.donorName}
            bloodType={successData.bloodType}
            units={successData.units}
            onClose={() => {
              setShowSuccessModal(false)
              router.push('/dashboard')
            }}
            onRequestAnother={() => {
              setShowSuccessModal(false)
              setStage(1)
              setSelectedDonor(null)
              setFilteredDonors([])
              setRecommendedDonors([])
            }}
          />
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-muted/20 to-background py-6 sm:py-12 px-4">
        <div className="mx-auto max-w-7xl w-full">
          {/* Authentication Alert */}
          {!user && (
            <Card className="mb-6 sm:mb-8 border-2 border-primary/50 bg-gradient-to-r from-primary/10 to-primary/5">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3">
                    <Lock className="h-6 w-6 text-primary flex-shrink-0 mt-0.5 sm:mt-0" />
                    <div>
                      <p className="font-semibold text-base sm:text-lg">Sign in to Request Blood</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">You must be logged in to request blood or access donor contact information</p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Link href="/login" className="flex-1 sm:flex-none">
                      <Button variant="outline" className="bg-transparent w-full sm:w-auto text-sm">Login</Button>
                    </Link>
                    <Link href="/signup" className="flex-1 sm:flex-none">
                      <Button className="w-full sm:w-auto text-sm">Sign Up</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {/* Header */}
          <div className="mb-8 sm:mb-10 text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Request Blood
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Find compatible, verified donors efficiently in your area with AI-powered matching and real-time notifications
            </p>
          </div>

          {/* Stage Indicators - Only show if logged in */}
          {user && (
            <div className="mb-8 sm:mb-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
                {[
                  { number: 1, title: 'Request Details', icon: null },
                  { number: 2, title: 'Find Donors', icon: null },
                  { number: 3, title: 'Contact & Confirm', icon: null },
                ].map((item, idx) => (
                  <div key={item.number} className="flex items-start sm:items-center flex-1 gap-3 sm:gap-0 w-full sm:w-auto">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full font-bold text-base sm:text-lg transition-all transform ${
                          stage >= item.number
                            ? 'bg-primary text-white shadow-lg scale-100'
                            : 'bg-muted-foreground/20 text-muted-foreground scale-90'
                        }`}
                      >
                        {stage > item.number ? (
                          <CheckCircle className="h-6 w-6 sm:h-7 sm:w-7" />
                        ) : (
                          item.number
                        )}
                      </div>
                      <p className={`text-xs sm:text-sm font-medium mt-2 sm:mt-3 text-center transition-colors whitespace-nowrap ${
                        stage >= item.number ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {item.title}
                      </p>
                    </div>

                    {idx < 2 && (
                      <div className="hidden sm:block flex-1 h-1 mb-6 rounded-full transition-all transform origin-left mx-2"
                        style={{
                          backgroundColor: stage > item.number ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.2)',
                          transform: stage > item.number ? 'scaleX(1)' : 'scaleX(0)',
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stage Description */}
          {user && (
            <div className="mb-8 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20 rounded-lg p-4 sm:p-6 text-center">
              <p className="text-xs sm:text-sm font-medium text-foreground leading-relaxed">
                {stage === 1 && '📋 Step 1: Enter blood request details including patient information, urgency level, and required units'}
                {stage === 2 && '🎯 Step 2: Browse AI-recommended donors and all available donors matching your blood type in your area'}
                {stage === 3 && '✅ Step 3: Contact your selected donor and confirm the donation appointment'}
              </p>
            </div>
          )}

          {/* Stage 1: Request Details */}
          {stage === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4" style={{ animationFillMode: 'both' }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                <Card className="lg:col-span-1">
                  <CardContent className="pt-4 sm:pt-6">
                    <h2 className="text-xl sm:text-2xl font-bold mb-6 flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-xs sm:text-sm font-bold flex-shrink-0">1</span>
                      Blood Request Details
                    </h2>
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                      <p className="text-xs sm:text-sm text-red-700 dark:text-red-400 flex items-start gap-2">
                        <Heart className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>Emergency requests will notify all compatible donors in your area immediately.</span>
                      </p>
                    </div>

                    <form onSubmit={handleStage1Submit} className="space-y-5">
                      <div>
                        <label className="text-xs sm:text-sm font-semibold block mb-2 text-foreground">Patient Name <span className="text-primary">*</span></label>
                        <Input
                          placeholder="Enter patient name"
                          value={formData.patientName}
                          onChange={(e) => handleInputChange('patientName', e.target.value)}
                          className="h-10 text-sm"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-xs sm:text-sm font-semibold block mb-2 text-foreground">Blood Type Required <span className="text-primary">*</span></label>
                        <Select value={formData.bloodGroup} onValueChange={(v) => handleInputChange('bloodGroup', v)}>
                          <SelectTrigger className="h-10 text-sm">
                            <SelectValue placeholder="Select blood type" />
                          </SelectTrigger>
                          <SelectContent>
                            {bloodGroups.map((group) => (
                              <SelectItem key={group} value={group}>
                                {group}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-xs sm:text-sm font-semibold block mb-2 text-foreground">City <span className="text-primary">*</span></label>
                        <Select value={formData.city} onValueChange={(v) => handleInputChange('city', v)}>
                          <SelectTrigger className="h-10 text-sm">
                            <SelectValue placeholder="Select city" />
                          </SelectTrigger>
                          <SelectContent>
                            {pakistaniCities.map((city) => (
                              <SelectItem key={city} value={city}>
                                {city}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-xs sm:text-sm font-semibold block mb-2 text-foreground">Hospital Name <span className="text-primary">*</span></label>
                        <Input
                          placeholder="Enter hospital name"
                          value={formData.hospitalName}
                          onChange={(e) => handleInputChange('hospitalName', e.target.value)}
                          className="h-10 text-sm"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-xs sm:text-sm font-semibold block mb-2 text-foreground">Hospital Address</label>
                        <Textarea
                          placeholder="Enter hospital address"
                          value={formData.hospitalAddress}
                          onChange={(e) => handleInputChange('hospitalAddress', e.target.value)}
                          className="text-sm"
                          rows={3}
                        />
                      </div>

                      <div>
                        <label className="text-xs sm:text-sm font-semibold block mb-3 text-foreground">Urgency Level <span className="text-primary">*</span></label>
                        <div className="flex gap-2 flex-wrap">
                          {(['normal', 'urgent', 'emergency'] as const).map((level) => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => handleInputChange('urgencyLevel', level)}
                              className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-lg font-semibold text-xs sm:text-sm transition-all transform hover:scale-105 ${
                                formData.urgencyLevel === level
                                  ? level === 'emergency' ? 'bg-red-600 text-white shadow-lg' : level === 'urgent' ? 'bg-orange-600 text-white shadow-lg' : 'bg-primary text-white shadow-lg'
                                  : 'border-2 border-border hover:border-primary/30 hover:bg-muted/50'
                              }`}
                            >
                              {level === 'normal' ? '🩸 Normal' : level === 'urgent' ? '⚠️ Urgent' : '🚨 Emergency'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs sm:text-sm font-semibold block mb-2 text-foreground">Units Required <span className="text-primary">*</span></label>
                          <Input
                            type="number"
                            min="1"
                            value={formData.unitsRequired}
                            onChange={(e) => handleInputChange('unitsRequired', e.target.value)}
                            className="h-10 text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-xs sm:text-sm font-semibold block mb-2 text-foreground">Date Required</label>
                          <Input
                            type="date"
                            value={formData.requiredByDate}
                            onChange={(e) => handleInputChange('requiredByDate', e.target.value)}
                            className="h-10 text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs sm:text-sm font-semibold block mb-2 text-foreground">Contact Number <span className="text-primary">*</span></label>
                        <Input
                          placeholder="+92-300-1234567"
                          value={formData.contactNumber}
                          onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                          className="h-10 text-sm"
                          required
                        />
                      </div>

                      <Button type="submit" className="w-full py-2.5 sm:py-3 text-sm sm:text-base font-semibold rounded-lg hover:shadow-lg transition-all">
                        🔍 Find Compatible Donors
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4 sm:pt-6">
                    <div className="space-y-6">
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 rounded-lg border border-blue-200/50 dark:border-blue-900/30">
                        <h3 className="font-bold text-sm sm:text-base text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                          🤖 <span>AI Recommendation</span>
                        </h3>
                        <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                          Our intelligent system identifies the most suitable donors in your area based on location, blood type, health scores, and response history.
                        </p>
                      </div>

                      <div className="p-4 border border-border rounded-lg bg-muted/30">
                        <h4 className="font-bold text-sm sm:text-base mb-4 flex items-center gap-2">
                          🩸 <span>All Blood Types</span>
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3">
                          {bloodGroups.map((group) => (
                            <div key={group} className="flex items-center gap-2 p-2 rounded border border-border/50 hover:border-primary/30 transition-colors">
                              <BloodBadge bloodType={group} size="sm" />
                              <span className="text-xs font-medium">{group}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Stage 2: Find Donors with Recommendations */}
          {stage === 2 && user && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4" style={{ animationFillMode: 'both' }}>
              {/* Hospital Emergency Alert Button */}
              {user.role === 'hospital' && (
                <Card className={`border-2 ${showEmergencyAlert ? 'border-red-500 bg-red-50 dark:bg-red-950/30' : 'border-red-300 bg-red-50/50 dark:bg-red-950/20'}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className={`h-6 w-6 ${showEmergencyAlert ? 'text-red-600 animate-pulse' : 'text-red-500'}`} />
                        <div>
                          <p className="font-bold text-lg text-red-900 dark:text-red-100">Emergency Blood Alert</p>
                          <p className="text-sm text-red-800 dark:text-red-200">Alert all available donors in the area immediately</p>
                        </div>
                      </div>
                      <Button
                        onClick={handleEmergencyAlert}
                        disabled={showEmergencyAlert || filteredDonors.length === 0}
                        className="bg-red-600 hover:bg-red-700 text-white gap-2"
                      >
                        <Bell className="h-4 w-4" />
                        Send Alert to {filteredDonors.length} Donors
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              <div className="grid md:grid-cols-2 gap-8">
                <Card>
                  <CardContent className="pt-6">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">2</span>
                      Find Donors
                    </h2>
                    <div className="space-y-6">
                      {/* AI Recommendations Section */}
                      {recommendedDonors.length > 0 && (
                        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-4">
                            <Zap className="h-5 w-5 text-primary" />
                            <h3 className="text-lg font-bold">AI-Recommended Donors</h3>
                          </div>
                          <p className="text-sm text-muted-foreground mb-4">
                            Based on health score, verification, experience, proximity, and urgency level
                          </p>

                          <div className="space-y-3">
                            {recommendedDonors.map((rec, idx) => (
                              <div
                                key={rec.donor.id}
                                onClick={() => {
                                  setSelectedDonor(rec.donor)
                                  setStage(3)
                                }}
                                className="bg-white dark:bg-slate-900 p-3 rounded-lg border-2 border-primary/50 hover:border-primary cursor-pointer transition-all hover:shadow-md hover:-translate-y-1"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <Award className="h-4 w-4 text-primary" />
                                      <h4 className="font-bold text-sm">#{idx + 1} - {rec.donor.name}</h4>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Match Score: {rec.score}%</p>
                                  </div>
                                  <BloodBadge bloodType={rec.donor.bloodGroup} size="md" />
                                </div>

                                <div className="space-y-1 text-xs mb-2">
                                  {rec.reasons.map((reason, i) => (
                                    <p key={i} className="text-muted-foreground flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3 text-green-600" />
                                      {reason}
                                    </p>
                                  ))}
                                </div>

                                <p className="text-xs text-muted-foreground">
                                  {rec.donor.distance}km away • Age {rec.donor.age}
                                </p>
                              </div>
                            ))}
                          </div>

                          <Button className="w-full mt-4 gap-2 bg-primary text-white">
                            <Phone className="h-4 w-4" />
                            Contact Recommended Donor
                          </Button>
                        </div>
                      )}

                      {/* All Donors List */}
                      <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2 mb-4">
                          <Heart className="h-6 w-6 text-primary" />
                          All Compatible Donors ({filteredDonors.length})
                        </h2>

                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {filteredDonors.map((donor) => (
                            <div
                              key={donor.id}
                              onMouseEnter={() => setHoveredDonor(donor)}
                              onMouseLeave={() => setHoveredDonor(null)}
                              onClick={() => {
                                setSelectedDonor(donor)
                                setStage(3)
                              }}
                              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                                hoveredDonor?.id === donor.id
                                  ? 'border-primary bg-primary/5 shadow-md -translate-y-1'
                                  : 'border-border hover:border-primary/50'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h4 className="font-bold text-lg">{donor.name}</h4>
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {donor.distance} km away • {donor.age} years
                                  </p>
                                </div>
                                <BloodBadge bloodType={donor.bloodGroup} size="lg" />
                              </div>

                              <div className="grid grid-cols-3 gap-2 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Health</p>
                                  <p className="font-bold text-primary">{donor.health}%</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Donations</p>
                                  <p className="font-bold">{donor.donations}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Status</p>
                                  <p className="font-semibold text-green-600">Available</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        className="w-full bg-transparent"
                        onClick={() => {
                          setStage(1)
                          setSelectedDonor(null)
                          setRecommendedDonors([])
                        }}
                      >
                        Back
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        Donors Near You
                      </h3>
                      <DonorsMap
                        donors={filteredDonors}
                        selectedDonor={selectedDonor?.id}
                        onDonorHover={(donor) => setHoveredDonor(donor as SelectedDonor)}
                        onDonorSelect={(donor) => {
                          setSelectedDonor(donor as SelectedDonor)
                          setStage(3)
                        }}
                        userLocation={{ lat: 24.8607, lng: 67.0011 }}
                      />
                      <p className="text-xs text-muted-foreground text-center">
                        Hover over markers to see donor info, click to select
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Stage 3: Contact & Confirm */}
          {stage === 3 && selectedDonor && user && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4" style={{ animationFillMode: 'both' }}>
              <div className="grid md:grid-cols-2 gap-8">
                <Card>
                  <CardContent className="pt-6">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">3</span>
                      Contact & Confirm
                    </h2>

                    <h3 className="text-xl font-bold mb-4">Selected Donor</h3>

                    <div className="space-y-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-bold">{selectedDonor.name}</h3>
                          <p className="text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-4 w-4" />
                            {selectedDonor.distance} km away
                          </p>
                        </div>
                        <BloodBadge bloodType={selectedDonor.bloodGroup} size="lg" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 border border-border rounded-lg">
                          <p className="text-sm text-muted-foreground">Health Score</p>
                          <p className="text-2xl font-bold text-primary">{selectedDonor.health}%</p>
                        </div>
                        <div className="p-4 border border-border rounded-lg">
                          <p className="text-sm text-muted-foreground">Last Donation</p>
                          <p className="font-semibold">{selectedDonor.lastDonation}</p>
                        </div>
                      </div>

                      <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                        <p className="text-sm font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
                          <CheckCircle className="h-5 w-5" />
                          This donor is available and ready
                        </p>
                      </div>

                      <div className="border-t border-border pt-6">
                        <h4 className="font-bold mb-3 flex items-center gap-2">
                          <Phone className="h-5 w-5" />
                          Contact Donor
                        </h4>
                        <a
                          href={`tel:${selectedDonor.phone}`}
                          className="block w-full py-3 px-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 text-center transition-all"
                        >
                          Call Now
                        </a>
                        <a
                          href={`https://wa.me/${selectedDonor.phone.replace(/[^0-9]/g, '')}`}
                          className="block w-full py-3 px-4 mt-3 border border-primary text-primary font-semibold rounded-lg hover:bg-primary/10 text-center transition-all"
                        >
                          Send WhatsApp
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <h2 className="text-2xl font-bold mb-6">Your Request</h2>

                    <div className="space-y-4">
                      <div className="p-4 border border-border rounded-lg">
                        <p className="text-sm text-muted-foreground">Patient Name</p>
                        <p className="font-semibold text-lg">{formData.patientName}</p>
                      </div>

                      <div className="p-4 border border-border rounded-lg">
                        <p className="text-sm text-muted-foreground">Blood Type</p>
                        <div className="flex items-center gap-2 mt-1">
                          <BloodBadge bloodType={formData.bloodGroup} size="sm" />
                        </div>
                      </div>

                      <div className="p-4 border border-border rounded-lg">
                        <p className="text-sm text-muted-foreground">Hospital</p>
                        <p className="font-semibold">{formData.hospitalName}</p>
                      </div>

                      <div className="p-4 border border-border rounded-lg">
                        <p className="text-sm text-muted-foreground">Units Required</p>
                        <p className="font-semibold text-lg">{formData.unitsRequired} units</p>
                      </div>

                      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                        <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-2">Next Steps:</p>
                        <ol className="text-sm text-blue-700 dark:text-blue-400 list-decimal list-inside space-y-1">
                          <li>Call the donor now</li>
                          <li>Confirm details</li>
                          <li>Schedule donation</li>
                        </ol>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          onClick={() => setStage(2)}
                          variant="outline"
                          className="flex-1"
                        >
                          Back
                        </Button>
                        <Button
                          onClick={handleFinalSubmit}
                          className="flex-1"
                        >
                          Confirm
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
