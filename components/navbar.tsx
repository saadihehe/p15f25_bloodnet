"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { Menu, X, Bell, Heart, LogOut, HelpCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/components/auth-provider"

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const { user, logout } = useAuth()

  useEffect(() => {
    if (!user) {
      setUnreadCount(0)
      return
    }

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch(`/api/notifications?city=${encodeURIComponent(user.city)}&userEmail=${encodeURIComponent(user.email)}`)
        if (!response.ok) return
        const data = await response.json()
        setUnreadCount(data.unreadCount ?? 0)
      } catch (error) {
        console.error('Failed to load notification count:', error)
      }
    }

    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 15000)
    return () => clearInterval(interval)
  }, [user])

  const navItems = user?.role === 'admin'
    ? [{ href: "/admin/dashboard", label: "Dashboard" }]
    : [
        { href: "/", label: "Home" },
        ...(user?.role === 'donor' || !user ? [{ href: "/register-donor", label: "Become a Donor" }] : []),
        ...(user?.role === 'receiver' || user?.role === 'hospital' || !user ? [{ href: "/request-blood", label: "Request Blood" }] : []),
        { href: "/donors", label: "Find Donors" },
        ...(user ? [{ href: "/dashboard", label: "Dashboard" }] : []),
        { href: "/help", label: "Help" },
      ]

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10 relative">
              <Image 
                src="/logo.png" 
                alt="BloodNet Logo" 
                width={32} 
                height={32}
                className="object-contain"
              />
            </div>
            <span className="hidden sm:inline">BloodNet</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors flex items-center gap-1"
              >
                {item.label === "Help" && <HelpCircle className="w-4 h-4" />}
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right Side - Messages, Notifications, Auth, Mobile Menu */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notifications Icon - Only for logged in users */}
            {user && (
              <Link
                href="/notifications"
                className="relative p-2 text-foreground/70 hover:text-foreground transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 bg-red-500 h-5 w-5 flex items-center justify-center p-0 text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </Link>
            )}

            {/* Auth Section */}
            <div className="hidden sm:flex items-center gap-2">
              {user ? (
                <>
                  <span className="text-sm font-medium">{user.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    className="flex items-center gap-2"
                  >
                    <LogOut size={16} />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="outline" size="sm">
                      Login
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button size="sm">
                      Signup
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-foreground hover:bg-accent/20"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-3 py-2 text-sm font-medium text-foreground hover:bg-accent/20 rounded"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            {!user && (
              <>
                <div className="border-t border-border my-2" />
                <Link href="/login" onClick={() => setIsOpen(false)}>
                  <Button variant="outline" className="w-full text-sm bg-transparent">
                    Login
                  </Button>
                </Link>
                <Link href="/signup" onClick={() => setIsOpen(false)}>
                  <Button className="w-full text-sm">
                    Signup
                  </Button>
                </Link>
              </>
            )}
            {user && (
              <>
                <div className="border-t border-border my-2" />
                <button
                  onClick={() => {
                    logout()
                    setIsOpen(false)
                  }}
                  className="w-full px-3 py-2 text-sm font-medium text-foreground hover:bg-accent/20 rounded flex items-center gap-2"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
