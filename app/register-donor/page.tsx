'use client'

import React from "react"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OCRBloodTestReader } from '@/components/ocr-blood-test-reader'
import { Heart, Upload, Lock } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import Link from 'next/link'
import { isValidPakistaniPhone, normalizePakistaniPhone } from '@/lib/validation-utils'

interface ExtractedBloodData {
  bloodGroup?: string
  hemoglobin?: string
  whiteBloodCells?: string
  platelets?: string
  redBloodCells?: string
  healthStatus?: string
  testDate?: string
}

export default function RegisterDonorPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('manual')
  const [extractedBloodData, setExtractedBloodData] = useState<ExtractedBloodData | null>(null)
  const [formData, setFormData] = useState({
    fullName: '',
    age: '25',
    bloodGroup: '',
    city: '',
    lastDonationDate: '',
    phoneNumber: '',
    healthStatus: 'Healthy',
    hemoglobin: '',
  })

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        fullName: prev.fullName || user.name,
        phoneNumber: prev.phoneNumber || user.phone || '',
        bloodGroup: prev.bloodGroup || user.bloodGroup || '',
        city: prev.city || user.city || 'Karachi',
      }))
    }
  }, [user])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleOCRDataExtracted = (data: ExtractedBloodData) => {
    setExtractedBloodData(data)
    if (data.bloodGroup) {
      handleInputChange('bloodGroup', data.bloodGroup)
    }
    if (data.hemoglobin) {
      handleInputChange('hemoglobin', data.hemoglobin)
    }
    if (data.healthStatus) {
      handleInputChange('healthStatus', data.healthStatus)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.fullName || !formData.bloodGroup || !formData.city || !formData.phoneNumber) {
      setError('Please complete the required donor information before submitting.')
      return
    }

    const normalizedPhone = normalizePakistaniPhone(formData.phoneNumber)
    if (!isValidPakistaniPhone(normalizedPhone)) {
      setError('Phone number must be a valid Pakistani number in format +92xxxxxxxxxx')
      return
    }

    if (!user || user.role !== 'donor') {
      setError('Only donor accounts may register a donor profile.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/donors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.fullName,
          email: user.email,
          phone: normalizedPhone,
          city: formData.city,
          bloodGroup: formData.bloodGroup,
          lastDonationDate: formData.lastDonationDate,
          availability: true,
          userId: user.id,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Donor registration failed')
      }

      setIsSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Donor registration failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const pakistaniCities = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta']
  const bloodGroups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']

  // Check authentication on mount
  useEffect(() => {
    if (!user) {
      // User will see the unauthenticated message below
    }
  }, [user])

  if (!user || user.role !== 'donor') {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gradient-to-b from-muted/20 to-background py-12 px-4">
          <div className="mx-auto max-w-md">
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900">
              <CardContent className="pt-8 space-y-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Lock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-blue-900 dark:text-blue-100 mb-2">
                    {user ? 'Donor registration is for donor accounts only' : 'Authentication Required'}
                  </h1>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                    {user
                      ? 'Please sign in with a donor account, or create a new donor account to register as a blood donor.'
                      : 'Please login or create an account before registering as a donor.'}
                  </p>
                </div>
                <div className="space-y-3 pt-2">
                  {user ? (
                    <Link href="/signup" className="block">
                      <Button variant="outline" className="w-full bg-transparent">Create Donor Account</Button>
                    </Link>
                  ) : (
                    <>
                      <Link href="/login" className="block">
                        <Button className="w-full">Login to Your Account</Button>
                      </Link>
                      <Link href="/signup" className="block">
                        <Button variant="outline" className="w-full bg-transparent">Create New Account</Button>
                      </Link>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  if (isSubmitted) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gradient-to-b from-green-50/50 to-background py-12 px-4">
          <div className="mx-auto max-w-2xl">
            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-50/50 dark:from-green-950/30 dark:to-green-950/10 dark:border-green-900">
              <CardContent className="pt-8 sm:pt-12 space-y-8">
                {/* Success Header */}
                <div className="text-center space-y-4">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 animate-pulse">
                    <Heart className="h-10 w-10 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-bold text-green-900 dark:text-green-100">Registration Successful</h2>
                  <p className="text-base sm:text-lg text-green-800 dark:text-green-200 max-w-xl mx-auto leading-relaxed">
                    Thank you for becoming a BloodNet donor. Your profile is now active and available to help save lives.
                  </p>
                </div>

                {/* Motivational Message */}
                <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-green-200 dark:border-green-900/30 text-center">
                  <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                    One donation can save up to three lives. Thank you for making a difference!
                  </p>
                </div>

                {/* Profile Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-lg bg-white dark:bg-slate-900 p-4 border border-border text-center">
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Name</p>
                    <p className="font-semibold text-sm">{formData.fullName}</p>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-slate-900 p-4 border border-border text-center">
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Blood Type</p>
                    <p className="font-bold text-lg text-primary">{formData.bloodGroup}</p>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-slate-900 p-4 border border-border text-center">
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Location</p>
                    <p className="font-semibold text-sm">{formData.city}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                  <Link href="/dashboard">
                    <Button className="w-full" size="lg">
                      View Dashboard
                    </Button>
                  </Link>
                  <Link href="/register-donor">
                    <Button variant="outline" className="w-full bg-transparent" size="lg">
                      Edit Profile
                    </Button>
                  </Link>
                  <Link href="/request-blood">
                    <Button variant="outline" className="w-full bg-transparent" size="lg">
                      Find Blood Requests
                    </Button>
                  </Link>
                  <Link href="/">
                    <Button variant="ghost" className="w-full" size="lg">
                      Return Home
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-muted/30 py-12 px-4">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Heart className="h-8 w-8 text-red-600" />
              Become a Blood Donor
            </h1>
            <p className="text-lg text-muted-foreground">
              Register as a blood donor and help save lives in your community
            </p>
          </div>

          <Card className="mb-8">
            <CardContent className="pt-8">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                  <TabsTrigger value="ocr" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Upload Blood Test
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="manual">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {error}
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium block mb-2">Your Name</label>
                      <Input
                        placeholder="Enter your full name"
                        value={formData.fullName}
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium block mb-2">Age</label>
                        <Input
                          type="number"
                          min="18"
                          max="65"
                          value={formData.age}
                          onChange={(e) => handleInputChange('age', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-2">Blood Group</label>
                        <Select value={formData.bloodGroup} onValueChange={(v) => handleInputChange('bloodGroup', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select blood group" />
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
                    </div>

                    <div>
                      <label className="text-sm font-medium block mb-2">City</label>
                      <Select value={formData.city} onValueChange={(v) => handleInputChange('city', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your city" />
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
                      <label className="text-sm font-medium block mb-2">Phone Number</label>
                      <Input
                        placeholder="+92-300-1234567"
                        value={formData.phoneNumber}
                        onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium block mb-2">Last Donation Date</label>
                      <Input
                        type="date"
                        value={formData.lastDonationDate}
                        onChange={(e) => handleInputChange('lastDonationDate', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium block mb-2">Hemoglobin Level</label>
                      <Input
                        placeholder="e.g., 14.5 g/dL"
                        value={formData.hemoglobin}
                        onChange={(e) => handleInputChange('hemoglobin', e.target.value)}
                      />
                    </div>

                    <Button type="submit" className="w-full py-6 text-base font-semibold">
                      Register as Donor
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="ocr">
                  <OCRBloodTestReader onDataExtracted={handleOCRDataExtracted} />
                  
                  {extractedBloodData && (
                    <form onSubmit={handleSubmit} className="space-y-6 mt-8 pt-8 border-t">
                      <div>
                        <label className="text-sm font-medium block mb-2">Your Name</label>
                        <Input
                          placeholder="Enter your full name"
                          value={formData.fullName}
                          onChange={(e) => handleInputChange('fullName', e.target.value)}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium block mb-2">Age</label>
                          <Input
                            type="number"
                            min="18"
                            max="65"
                            value={formData.age}
                            onChange={(e) => handleInputChange('age', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium block mb-2">City</label>
                          <Select value={formData.city} onValueChange={(v) => handleInputChange('city', v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your city" />
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
                      </div>

                      <div>
                        <label className="text-sm font-medium block mb-2">Phone Number</label>
                        <Input
                          placeholder="+92-300-1234567"
                          value={formData.phoneNumber}
                          onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                          required
                        />
                      </div>

                      <Button type="submit" className="w-full py-6 text-base font-semibold">
                        Complete Registration
                      </Button>
                    </form>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  )
}
