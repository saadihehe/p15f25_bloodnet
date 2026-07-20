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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth, type UserRole } from '@/components/auth-provider'
import { Heart } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('donor')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please enter email and password')
      return
    }

    try {
      await login(email, password, role)
      router.push('/dashboard')
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message.includes('Email not verified')) {
        setError('Please verify your email first. We sent you a verification code.')
        // Optionally redirect to verify page
        setTimeout(() => {
          router.push(`/register/verify?email=${encodeURIComponent(email)}`)
        }, 2000)
      } else {
        setError(message || 'Login failed. Please try again.')
      }
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-muted/30 py-8 sm:py-12 px-4 flex items-center">
        <div className="mx-auto w-full max-w-md">
          <Card>
            <CardContent className="pt-6 sm:pt-8">
              <div className="mb-6 sm:mb-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white mx-auto mb-4">
                  <Heart className="h-6 w-6" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold">BloodNet Login</h1>
                <p className="text-sm text-muted-foreground mt-2">Sign in to your account</p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-2">Role</label>
                  <Select value={role ?? 'donor'} onValueChange={(value) => setRole(value as UserRole)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="donor">Blood Donor</SelectItem>
                      <SelectItem value="receiver">Blood Receiver</SelectItem>
                      <SelectItem value="hospital">Hospital</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">Email</label>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">Password</label>
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              <div className="mt-4 text-center text-sm">
                <p className="text-muted-foreground">
                  Don't have an account?{' '}
                  <Link href="/signup" className="text-primary hover:underline font-semibold">
                    Sign up
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  )
}
