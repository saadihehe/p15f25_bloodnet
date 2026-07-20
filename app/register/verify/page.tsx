"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Heart, CheckCircle } from "lucide-react"

export default function VerifyPage() {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [hasEmailParam, setHasEmailParam] = useState(false)
  const [email, setEmail] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const emailParam = params.get('email') || ''
    setEmail(emailParam)
    setHasEmailParam(!!emailParam)
  }, [])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsVerifying(true)
    setError('')
    setMessage('')

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: code }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Verification failed')
      } else {
        router.push(`/register/verified?email=${encodeURIComponent(email)}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    if (!email) {
      setError('Email missing for resend')
      return
    }
    setIsVerifying(true)
    setError('')
    setMessage('')
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: '' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to resend code')
      } else {
        setMessage('A new OTP code has been sent to your email.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code')
    } finally {
      setIsVerifying(false)
    }
  }

  if (!hasEmailParam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <div className="w-full max-w-md px-4">
          <Card className="glass soft-shadow border border-primary/10">
            <CardContent className="pt-8">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <CheckCircle className="w-16 h-16 text-amber-500" />
                </div>
                <h2 className="text-2xl font-bold">Missing Verification Email</h2>
                <p className="text-muted-foreground">Please start from the signup page so we can send your OTP to the right email address.</p>
                <Button onClick={() => router.push('/signup')} className="w-full mt-4">
                  Return to Signup
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Heart className="w-6 h-6" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">BloodNet</h1>
          <p className="text-muted-foreground mt-2">Verify Your Email</p>
        </div>

        <Card className="glass soft-shadow border border-primary/10">
          <CardHeader>
            <CardTitle>Email Verification</CardTitle>
            <CardDescription>Enter the code sent to your email address</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  placeholder="000000"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  disabled={isVerifying}
                  className="text-center text-2xl letter-spacing tracking-widest font-mono"
                />
                <p className="text-xs text-muted-foreground text-center">Check your email for the verification code</p>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
              )}
              {message && (
                <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{message}</div>
              )}

              <Button type="submit" className="w-full" disabled={isVerifying || code.length !== 6 || !email}>
                {isVerifying ? "Verifying..." : "Verify Email"}
              </Button>

              <p className="text-sm text-center text-muted-foreground">
                Didn't receive a code?{" "}
                <button type="button" onClick={handleResend} className="text-primary hover:underline font-medium" disabled={isVerifying}>
                  Resend
                </button>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
