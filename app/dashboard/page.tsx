'use client'

import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/components/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import DonorDashboard from '@/components/dashboards/donor-dashboard'
import ReceiverDashboard from '@/components/dashboards/receiver-dashboard'
import HospitalDashboard from '@/components/dashboards/hospital-dashboard'
import { Heart, AlertCircle, ActivitySquare } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const { user, logout, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login')
      } else if (user.role === 'admin') {
        router.push('/admin/dashboard')
      }
    }
  }, [user, router, isLoading])

  // Map new role system to appropriate dashboard
  const getDashboardComponent = () => {
    switch (user?.role) {
      case 'donor':
        return <DonorDashboard user={user} />
      case 'receiver':
        return <ReceiverDashboard user={user} />
      case 'hospital':
        return <HospitalDashboard user={user} />
      default:
        return <DonorDashboard user={user} />
    }
  }

  if (isLoading || !user) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-muted/30 py-8 sm:py-12 px-4 flex items-center">
          <div className="mx-auto w-full max-w-md">
            <Card>
              <CardContent className="pt-6 sm:pt-8 text-center">
                {isLoading ? (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600 mx-auto mb-4 animate-pulse">
                      <Heart className="h-6 w-6" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold mb-2">Loading Dashboard</h1>
                    <p className="text-sm sm:text-base text-muted-foreground mb-6">Please wait...</p>
                  </>
                ) : (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 text-red-600 mx-auto mb-4">
                      <AlertCircle className="h-6 w-6" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold mb-2">Access Denied</h1>
                    <p className="text-sm sm:text-base text-muted-foreground mb-6">Please log in to access the dashboard</p>
                    <Button onClick={() => router.push('/login')} className="w-full">
                      Login
                    </Button>
                  </>
                )}
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
      <main className="min-h-screen bg-muted/30 py-6 sm:py-8 lg:py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl w-full">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 mb-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white flex-shrink-0">
                  <Heart className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Welcome, {user.name}!</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {user.role === 'donor' && 'Donor Dashboard'}
                    {user.role === 'receiver' && 'Receiver Dashboard'}
                    {user.role === 'hospital' && 'Hospital Dashboard'}
                    {user.role === 'admin' && 'Admin Dashboard'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Link href="/donations" className="flex-1 sm:flex-none">
                  <Button variant="outline" className="gap-2 bg-transparent w-full sm:w-auto text-sm">
                    <ActivitySquare className="h-4 w-4" />
                    <span className="hidden sm:inline">Track Donations</span>
                    <span className="sm:hidden">Donations</span>
                  </Button>
                </Link>
                <Button variant="outline" onClick={logout} className="text-sm">
                  Logout
                </Button>
              </div>
            </div>
          </div>

          {/* Role-Based Dashboards */}
          {getDashboardComponent()}
        </div>
      </main>
      <Footer />
    </>
  )
}
