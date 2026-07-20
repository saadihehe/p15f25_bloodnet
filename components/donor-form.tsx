"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { isValidPakistaniPhone, normalizePakistaniPhone } from "@/lib/validation-utils"

interface DonorFormProps {
  onSuccess?: () => void
}

export function DonorForm({ onSuccess }: DonorFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    bloodGroup: "",
    city: "",
    lastDonationDate: "",
    contact: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  const bloodGroups = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"]
  const cities = [
    "New York",
    "Los Angeles",
    "Chicago",
    "Houston",
    "Phoenix",
    "Philadelphia",
    "San Antonio",
    "San Diego",
  ]

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) newErrors.name = "Name is required"
    if (!formData.age || Number.parseInt(formData.age) < 18) newErrors.age = "Must be at least 18 years old"
    if (!formData.bloodGroup) newErrors.bloodGroup = "Blood group is required"
    if (!formData.city) newErrors.city = "City is required"
    if (!formData.contact) newErrors.contact = "Contact number is required"
    else if (!isValidPakistaniPhone(normalizePakistaniPhone(formData.contact))) newErrors.contact = "Enter a valid Pakistani phone number"
    if (!formData.lastDonationDate) newErrors.lastDonationDate = "Last donation date is required"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsLoading(false)

    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            placeholder="John Doe"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={errors.name ? "border-red-500" : ""}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>

        {/* Age */}
        <div className="space-y-2">
          <Label htmlFor="age">Age</Label>
          <Input
            id="age"
            type="number"
            placeholder="25"
            value={formData.age}
            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
            className={errors.age ? "border-red-500" : ""}
          />
          {errors.age && <p className="text-xs text-red-500">{errors.age}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Blood Group */}
        <div className="space-y-2">
          <Label htmlFor="bloodGroup">Blood Group</Label>
          <Select
            value={formData.bloodGroup}
            onValueChange={(value) => setFormData({ ...formData, bloodGroup: value })}
          >
            <SelectTrigger className={errors.bloodGroup ? "border-red-500" : ""}>
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
          {errors.bloodGroup && <p className="text-xs text-red-500">{errors.bloodGroup}</p>}
        </div>

        {/* City */}
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Select value={formData.city} onValueChange={(value) => setFormData({ ...formData, city: value })}>
            <SelectTrigger className={errors.city ? "border-red-500" : ""}>
              <SelectValue placeholder="Select city" />
            </SelectTrigger>
            <SelectContent>
              {cities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.city && <p className="text-xs text-red-500">{errors.city}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Last Donation Date */}
        <div className="space-y-2">
          <Label htmlFor="lastDonationDate">Last Donation Date</Label>
          <Input
            id="lastDonationDate"
            type="date"
            value={formData.lastDonationDate}
            onChange={(e) => setFormData({ ...formData, lastDonationDate: e.target.value })}
            className={errors.lastDonationDate ? "border-red-500" : ""}
          />
          {errors.lastDonationDate && <p className="text-xs text-red-500">{errors.lastDonationDate}</p>}
        </div>

        {/* Contact */}
        <div className="space-y-2">
          <Label htmlFor="contact">Phone Number</Label>
          <Input
            id="contact"
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={formData.contact}
            onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
            className={errors.contact ? "border-red-500" : ""}
          />
          {errors.contact && <p className="text-xs text-red-500">{errors.contact}</p>}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Registering..." : "Complete Registration"}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        By registering, you agree to our Terms of Service and Privacy Policy
      </p>
    </form>
  )
}
