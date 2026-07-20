'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'

export default function VerifiedPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const params = new URLSearchParams(window.location.search)
    setEmail(params.get('email') || '')
  }, [])

  if (!mounted) return null

  useEffect(() => {
    setMounted(true)
    const params = new URLSearchParams(window.location.search)
    setEmail(params.get('email') || '')
  }, [])

  if (!mounted) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5">
      <div className="w-full max-w-md px-4">
        <Card className="glass soft-shadow border border-primary/10">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <CardTitle>Account Verified</CardTitle>
            <CardDescription>Your email has been confirmed and your BloodNet account is ready.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {email && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                <p>Your account <strong>{email}</strong> is now verified.</p>
              </div>
            )}
            <Button className="w-full" onClick={() => router.push('/login')}>
              Proceed to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
