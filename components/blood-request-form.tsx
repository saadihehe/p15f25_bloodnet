"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { isValidPakistaniPhone, normalizePakistaniPhone } from "@/lib/validation-utils"

interface BloodRequestFormProps {
  onSuccess?: (data: any) => void
}

export function BloodRequestForm({ onSuccess }: BloodRequestFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    bloodGroup: "",
    city: "",
    hospital: "",
    urgency: "normal",
    units: "1",
    notes: "",
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
  const urgencyLevels = [
    { value: "routine", label: "Routine (Next 7 days)" },
    { value: "normal", label: "Normal (Within 48 hours)" },
    { value: "urgent", label: "Urgent (Within 24 hours)" },
    { value: "critical", label: "Critical (Immediate)" },
  ]

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) newErrors.name = "Name is required"
    if (!formData.bloodGroup) newErrors.bloodGroup = "Blood group is required"
    if (!formData.city) newErrors.city = "City is required"
    if (!formData.hospital.trim()) newErrors.hospital = "Hospital name is required"
    if (!formData.contact) newErrors.contact = "Contact number is required"
    else if (!isValidPakistaniPhone(normalizePakistaniPhone(formData.contact))) newErrors.contact = "Enter a valid Pakistani phone number"
    if (!formData.units || Number.parseInt(formData.units) < 1) newErrors.units = "Must request at least 1 unit"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsLoading(false)

    onSuccess?.(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Patient Name</Label>
          <Input
            id="name"
            placeholder="John Doe"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={errors.name ? "border-red-500" : ""}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>

        {/* Blood Group */}
        <div className="space-y-2">
          <Label htmlFor="bloodGroup">Blood Type Needed</Label>
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        {/* Hospital */}
        <div className="space-y-2">
          <Label htmlFor="hospital">Hospital / Medical Center</Label>
          <Input
            id="hospital"
            placeholder="Enter hospital name"
            value={formData.hospital}
            onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
            className={errors.hospital ? "border-red-500" : ""}
          />
          {errors.hospital && <p className="text-xs text-red-500">{errors.hospital}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Urgency */}
        <div className="space-y-2">
          <Label htmlFor="urgency">Urgency Level</Label>
          <Select value={formData.urgency} onValueChange={(value) => setFormData({ ...formData, urgency: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select urgency" />
            </SelectTrigger>
            <SelectContent>
              {urgencyLevels.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Units */}
        <div className="space-y-2">
          <Label htmlFor="units">Units Required</Label>
          <Input
            id="units"
            type="number"
            min="1"
            max="20"
            placeholder="1"
            value={formData.units}
            onChange={(e) => setFormData({ ...formData, units: e.target.value })}
            className={errors.units ? "border-red-500" : ""}
          />
          {errors.units && <p className="text-xs text-red-500">{errors.units}</p>}
        </div>
      </div>

      {/* Contact */}
      <div className="space-y-2">
        <Label htmlFor="contact">Contact Number</Label>
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

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Additional Notes (Optional)</Label>
        <Textarea
          id="notes"
          placeholder="Any specific requirements or medical notes..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Submitting Request..." : "Submit Blood Request"}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Your request will be matched with available donors immediately
      </p>
    </form>
  )
}
