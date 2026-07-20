'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, MessageCircle, Phone, Mail, Heart } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/components/auth-provider'

export default function NotificationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const { user: authUser } = useAuth()
  const [user, setUser] = useState<any>(null)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [whatsappLink, setWhatsappLink] = useState('')

  useEffect(() => {
    loadUserProfile()
  }, [params.userId, authUser?.city])

  const loadUserProfile = async () => {
    try {
      const city = authUser?.city || 'Karachi'
      const res = await fetch(`/api/users/${params.userId}?city=${encodeURIComponent(city)}`)
      if (!res.ok) throw new Error('Failed to load profile')
      const data = await res.json()
      setUser(data.user)
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load user profile', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast({ title: 'Error', description: 'Please enter a message', variant: 'destructive' })
      return
    }

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: params.userId,
          message: message.trim(),
          city: authUser?.city || 'Karachi',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setWhatsappLink(data.whatsappLink)
      setMessage('')
      toast({ title: 'Message sent!', description: 'Opening WhatsApp...', variant: 'default' })

      // Open WhatsApp after a brief delay
      setTimeout(() => {
        window.open(data.whatsappLink, '_blank')
      }, 500)
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to send message', variant: 'destructive' })
    }
  }

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-muted/30 py-8 px-4">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="pt-8">
                <p className="text-center text-muted-foreground">Loading profile...</p>
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
      <main className="min-h-screen bg-muted/30 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <Button variant="ghost" onClick={() => router.back()} className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          {/* Profile Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900">
                  <Heart className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                {user?.name || 'Unknown User'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Role</label>
                  <p className="font-semibold capitalize">{user?.role || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Blood Group</label>
                  <p className="font-semibold text-lg text-red-600">{user?.bloodGroup || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">City</label>
                  <p className="font-semibold">{user?.city || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Phone</label>
                  <p className="font-semibold">{user?.phone || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-muted-foreground">Email</label>
                  <p className="font-semibold">{user?.email || 'N/A'}</p>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                <a
                  href={`tel:${user?.phone}`}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
                <a
                  href={`mailto:${user?.email}`}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition"
                >
                  <Mail className="w-4 h-4" />
                  Email
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Messaging Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Send Message via WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">Your Message</label>
                <Textarea
                  placeholder="Type your message here... We'll send it via WhatsApp"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Message will be sent to: {user?.name} ({user?.phone})
                </p>
              </div>

              <Button onClick={handleSendMessage} className="w-full gap-2 bg-green-600 hover:bg-green-700">
                <MessageCircle className="w-4 h-4" />
                Send via WhatsApp
              </Button>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  💡 After sending, you'll be redirected to WhatsApp. Once your communication is complete, make sure to push
                  confirmation from the donations section.
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
