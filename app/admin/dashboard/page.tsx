"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useAuth } from "@/components/auth-provider"
import AdminDashboard from "@/components/dashboards/admin-dashboard"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lock, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function AdminPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
          <Card className="max-w-md w-full">
            <CardContent className="pt-8 sm:pt-12 pb-8 sm:pb-12 text-center">
              <p className="text-muted-foreground">Loading admin session...</p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </>
    )
  }

  // Check if user is admin
  if (!user) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
          <Card className="max-w-md w-full">
            <CardContent className="pt-8 sm:pt-12 pb-8 sm:pb-12 text-center">
              <Lock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h2 className="text-xl sm:text-2xl font-bold mb-2">Sign In Required</h2>
              <p className="text-muted-foreground mb-6">
                Please log in to access the admin dashboard.
              </p>
              <Link href="/login">
                <Button className="w-full">Go to Login</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </>
    )
  }

  // Check if user has admin role
  if (user.role !== 'admin') {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
          <Card className="border-2 border-red-200 bg-red-50 dark:bg-red-950/20 max-w-md w-full">
            <CardContent className="pt-8 sm:pt-12 pb-8 sm:pb-12">
              <div className="text-center mb-6">
                <Lock className="w-12 h-12 text-red-600 mx-auto mb-4" />
                <h2 className="text-xl sm:text-2xl font-bold text-red-900 dark:text-red-100 mb-2">Access Denied</h2>
                <p className="text-sm sm:text-base text-red-800 dark:text-red-200 mb-6">
                  You do not have permission to access the admin dashboard. This area is restricted to administrators only.
                </p>
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={() => router.push('/dashboard')}>
                <ChevronLeft className="w-4 h-4" />
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </>
    )
  }

  // User is admin - show admin dashboard
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto w-full">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Admin Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">System analytics and management</p>
          </div>
          <AdminDashboard user={user} />
        </div>
      </main>
      <Footer />
    </>
  )
}
