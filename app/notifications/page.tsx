'use client'

import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Heart, Bell, CheckCircle, Clock, Trash2, MessageCircle, ArrowRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth-provider'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

interface Notification {
  id: string
  senderId: string
  senderName: string
  senderEmail: string
  senderRole: string
  message: string
  type: string
  read: boolean
  createdAt: string
  donationId?: string
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    fetchNotifications()
    // Poll for new notifications every 5 seconds
    const interval = setInterval(fetchNotifications, 5000)
    return () => clearInterval(interval)
  }, [user])

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/notifications/get?city=${encodeURIComponent(user?.city || 'Karachi')}`)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}/read?city=${encodeURIComponent(user?.city || 'Karachi')}`, {
        method: 'PATCH',
      })
      if (res.ok) {
        setNotifications(notifications.map((n) => (n.id === notificationId ? { ...n, read: true } : n)))
      }
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const handleDelete = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id))
  }

  const handleViewProfile = (senderId: string) => {
    router.push(`/notifications/${senderId}`)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'connection':
        return <Heart className="w-5 h-5 text-red-600" />
      case 'message':
        return <MessageCircle className="w-5 h-5 text-blue-600" />
      case 'donation_completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      default:
        return <Bell className="w-5 h-5 text-yellow-600" />
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'connection':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Connected</Badge>
      case 'message':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Message</Badge>
      case 'donation_completed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Donation Complete</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">Notification</Badge>
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (!user) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-muted/30 py-8 px-4 flex items-center justify-center">
          <Card className="max-w-md w-full">
            <CardContent className="pt-8 text-center">
              <p className="text-muted-foreground">Please log in to view notifications</p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-muted/30 py-8 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
                <Bell className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              Notifications
            </h1>
            <p className="text-muted-foreground">
              {notifications.filter((n) => !n.read).length} unread notification
              {notifications.filter((n) => !n.read).length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Notifications List */}
          {loading ? (
            <Card>
              <CardContent className="pt-8 text-center">
                <p className="text-muted-foreground">Loading notifications...</p>
              </CardContent>
            </Card>
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className="pt-12 text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-full bg-muted">
                    <Bell className="w-8 h-8 text-muted-foreground" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">No notifications yet</h3>
                <p className="text-muted-foreground">You'll see notifications here when users connect with you or donations are completed.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`transition-all ${!notification.read ? 'border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20' : ''}`}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Icon */}
                        <div className="flex-shrink-0 mt-1">{getTypeIcon(notification.type)}</div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold">{notification.senderName}</p>
                            {getTypeBadge(notification.type)}
                          </div>

                          <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {formatTime(notification.createdAt)}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleViewProfile(notification.senderId)}
                          className="gap-2 bg-blue-600 hover:bg-blue-700"
                        >
                          View Profile
                          <ArrowRight className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(notification.id)}
                          className="text-muted-foreground hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Mark as read indicator */}
                    {!notification.read && (
                      <div className="mt-3 pt-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Mark as Read
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
