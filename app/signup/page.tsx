'use client'

import React from "react"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth, type UserRole } from '@/components/auth-provider'
import { Heart } from 'lucide-react'
import { isValidEmail, isValidPakistaniPhone, normalizePakistaniPhone, validateSignupInput } from '@/lib/validation-utils'

export default function SignupPage() {
  const router = useRouter()
  const { signup, isLoading } = useAuth()
  const [step, setStep] = useState(1)
  const [role, setRole] = useState<UserRole | ''>('')
  const [city, setCity] = useState('')
  const [bloodGroup, setBloodGroup] = useState('')
  const [emailSentTo, setEmailSentTo] = useState('')
  const [isSignedUp, setIsSignedUp] = useState(false)
  const [acceptedContactConsent, setAcceptedContactConsent] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  })
  const [error, setError] = useState('')

  const pakistaniCities = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta']
  const bloodGroups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']

  const handleRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole)
    setStep(2)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim() || !formData.email.trim() || !formData.password || !formData.phone.trim()) {
      setError('Please fill in all required fields')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!role) {
      setError('Please select your account type')
      return
    }

    if (!isValidEmail(formData.email)) {
      setError('Please enter a valid email address')
      return
    }

    const normalizedPhone = normalizePakistaniPhone(formData.phone)
    if (!isValidPakistaniPhone(normalizedPhone)) {
      setError('Phone number must be a valid Pakistani number in format +92xxxxxxxxxx')
      return
    }

    if (formData.password.length < 8 || !/(?=.*[A-Z])(?=.*[a-z])(?=.*\d)/.test(formData.password)) {
      setError('Password must be at least 8 characters and include uppercase, lowercase, and a number')
      return
    }

    if ((role === 'donor' || role === 'receiver') && !bloodGroup) {
      setError('Please select your blood group')
      return
    }

    if (!acceptedContactConsent) {
      setError('Please accept the contact-sharing consent before creating your account')
      return
    }

    const validation = validateSignupInput({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      phone: normalizedPhone,
      role,
      city: city || 'Karachi',
      bloodGroup,
    })
    if (!validation.isValid) {
      setError(validation.errors[0])
      return
    }

    try {
      const normalizedEmail = formData.email.trim().toLowerCase()
      const result = await signup({
        name: formData.name.trim(),
        email: normalizedEmail,
        password: formData.password,
        phone: normalizedPhone,
        role: role as Exclude<UserRole, null>,
        city: city || 'Karachi',
        bloodGroup: bloodGroup || undefined,
      })
      if (result?.success) {
        setEmailSentTo(normalizedEmail)
        setIsSignedUp(true)
        setError('')
      } else {
        setError(result?.error || 'Signup failed. Please try again.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed. Please try again.')
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-muted/30 py-12 px-4 flex items-center">
        <div className="mx-auto w-full max-w-md">
          <Card>
            <CardContent className="pt-8">
              {step === 1 ? (
                <div>
                  <div className="mb-8 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white mx-auto mb-4">
                      <Heart className="h-6 w-6" />
                    </div>
                    <h1 className="text-2xl font-bold">Create Account</h1>
                    <p className="text-sm text-muted-foreground mt-2">Choose your role to get started</p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { value: 'donor', label: 'Blood Donor', desc: 'Save lives by donating blood' },
                      { value: 'receiver', label: 'Blood Receiver', desc: 'Request blood when needed' },
                      { value: 'hospital', label: 'Hospital', desc: 'Manage blood inventory' },
                    ].map((option) => {
                      const isContactSharingRole = option.value === 'donor' || option.value === 'receiver'
                      return (
                        <button
                          key={option.value}
                          onClick={() => handleRoleSelect(option.value as UserRole)}
                          className="w-full p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left"
                        >
                          <div className="font-semibold">{option.label}</div>
                          <div className="text-sm text-muted-foreground">{option.desc}</div>
                          {isContactSharingRole && (
                            <div className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                              Notice: your phone number may be shared with hospitals and blood receivers for urgent coordination.
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-6 text-center">
                    <h1 className="text-2xl font-bold">Complete Your Profile</h1>
                    <p className="text-sm text-muted-foreground mt-2">
                      Signing up as <span className="font-semibold capitalize">{role}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 max-w-sm mx-auto">
                      We will collect your phone number and basic profile details so hospitals, donors, and receivers can contact you securely when needed. For donor and receiver accounts, your phone number may be shared with hospitals and other recipients to coordinate urgent blood support.
                    </p>
                  </div>

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded text-sm text-red-700 dark:text-red-400">
                      {error}
                    </div>
                  )}

                  {isSignedUp ? (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary-700">
                        OTP has been sent to <strong>{emailSentTo}</strong>. Check your inbox and spam folder for the verification code.
                      </div>
                      <Button
                        type="button"
                        className="w-full"
                        onClick={() => router.push(`/register/verify?email=${encodeURIComponent(emailSentTo)}`)}
                      >
                        Continue to Email Verification
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => router.push('/login')}
                      >
                        Back to Login
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <label className="text-sm font-medium block mb-2">Full Name</label>
                          <Input
                            placeholder="Your name"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            required
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium block mb-2">Email</label>
                          <Input
                            type="email"
                            placeholder="your@email.com"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            required
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium block mb-2">Phone (+92)</label>
                          <Input
                            placeholder="+92-300-1234567"
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            required
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium block mb-2">City</label>
                          <Select value={city} onValueChange={setCity}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select city" />
                            </SelectTrigger>
                            <SelectContent>
                              {pakistaniCities.map((c) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {(role === 'donor' || role === 'receiver') && (
                          <div>
                            <label className="text-sm font-medium block mb-2">Blood Group</label>
                            <Select value={bloodGroup} onValueChange={setBloodGroup}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select blood group" />
                              </SelectTrigger>
                              <SelectContent>
                                {bloodGroups.map((bg) => (
                                  <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div>
                          <label className="text-sm font-medium block mb-2">Password</label>
                          <Input
                            type="password"
                            placeholder="Enter password"
                            value={formData.password}
                            onChange={(e) => handleInputChange('password', e.target.value)}
                            required
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium block mb-2">Confirm Password</label>
                          <Input
                            type="password"
                            placeholder="Confirm password"
                            value={formData.confirmPassword}
                            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                            required
                          />
                        </div>

                        <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
                          <Checkbox
                            checked={acceptedContactConsent}
                            onCheckedChange={(checked) => setAcceptedContactConsent(checked === true)}
                            className="mt-0.5"
                          />
                          <span className="leading-relaxed text-muted-foreground">
                            I agree that BloodNet may share my phone number with matched donors, receivers, hospitals, and admins for donation coordination.
                          </span>
                        </label>

                        <div className="flex gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1 bg-transparent"
                            onClick={() => setStep(1)}
                          >
                            Back
                          </Button>
                          <Button type="submit" className="flex-1" disabled={isLoading || !acceptedContactConsent}>
                            {isLoading ? 'Creating...' : 'Create Account'}
                          </Button>
                        </div>
                      </form>

                      <div className="mt-4 text-center text-sm">
                        <p className="text-muted-foreground">
                          Already have an account?{' '}
                          <Link href="/login" className="text-primary hover:underline font-semibold">
                            Sign in
                          </Link>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  )
}
