'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Users, Heart, TrendingUp, AlertCircle, BarChart3, Shield, CheckCircle, Clock, Activity, Building2, Zap, Droplet } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface AdminDashboardProps {
  user: any
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const { toast } = useToast()
  const [isClient, setIsClient] = useState(false)
  const [kpis, setKpis] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [pendingDonations, setPendingDonations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [adminMode, setAdminMode] = useState(true)

  const loadAdminData = async () => {
      try {
        const [kpisRes, usersRes, requestsRes, pendingRes] = await Promise.all([
          fetch('/api/admin/kpis?city=Karachi'),
          fetch('/api/users?city=Karachi'),
          fetch('/api/requests?city=Karachi'),
          fetch('/api/admin/donations/pending?city=Karachi'),
        ])

        let fetchedKpis: any = null
        let fetchedUsers: any[] = []
        let fetchedRequests: any[] = []

        if (kpisRes.ok) {
          const kpisData = await kpisRes.json()
          fetchedKpis = kpisData.kpis
        }
        if (usersRes.ok) {
          const usersData = await usersRes.json()
          fetchedUsers = usersData.users || []
        }
        if (requestsRes.ok) {
          const requestsData = await requestsRes.json()
          fetchedRequests = Array.isArray(requestsData) ? requestsData : requestsData.requests || []
        }
        let fetchedPendingDonations: any[] = []
        if (pendingRes.ok) {
          const pendingData = await pendingRes.json()
          fetchedPendingDonations = pendingData.donations || []
        }

        setKpis(fetchedKpis)
        setUsers(fetchedUsers)
        setRequests(fetchedRequests)
        setPendingDonations(fetchedPendingDonations)

        const activityItems = [
          ...fetchedUsers.slice(0, 3).map((entry: any) => ({
            id: `user-${entry.id}`,
            type: entry.role === 'hospital' ? 'Hospital Registered' : entry.role === 'donor' ? 'Donor Registered' : 'Receiver Registered',
            name: entry.name,
            time: 'Recently added',
            icon: entry.role === 'hospital' ? Building2 : Heart,
            color: entry.role === 'hospital' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          })),
          ...fetchedRequests.slice(0, 3).map((entry: any) => ({
            id: `request-${entry.id}`,
            type: 'Blood Request Created',
            name: `${entry.hospital || 'Hospital'} • ${entry.bloodType || entry.bloodGroup || 'Blood'}`,
            time: 'Live request',
            icon: AlertCircle,
            color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
          })),
        ]
        setActivity(activityItems)
    } catch (error) {
      console.error('Failed to load admin dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setIsClient(true)
    loadAdminData()
  }, [])

  const bloodGroups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']

  const requestStatusCounts = requests.reduce(
    (acc, request) => {
      const rawStatus = String(request.status || request.urgency || 'pending').toLowerCase()
      const status = rawStatus.includes('complete') || rawStatus.includes('receiver_confirmed') || rawStatus.includes('fulfilled')
        ? 'Fulfilled'
        : rawStatus.includes('cancel') || rawStatus.includes('rejected')
        ? 'Cancelled'
        : 'Pending'

      acc[status] = (acc[status] ?? 0) + 1
      return acc
    },
    {
      Fulfilled: 0,
      Pending: 0,
      Cancelled: 0,
    } as Record<string, number>,
  )

  const thisMonthKeys = Array.from({ length: 6 }, (_, index) => {
    const date = new Date()
    date.setMonth(date.getMonth() - (5 - index))
    return {
      label: date.toLocaleString('default', { month: 'short' }),
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    }
  })

  const getMonthKey = (dateString: string | number | Date) => {
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return ''
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }

  const monthlyRequestsData = thisMonthKeys.map(({ label, key }) => {
    const monthRequests = requests.filter((request) => getMonthKey(request.createdAt) === key)
    const fulfilled = monthRequests.filter((request) => {
      const status = String(request.status || request.urgency || '').toLowerCase()
      return status.includes('complete') || status.includes('receiver_confirmed') || status.includes('fulfilled')
    }).length

    return {
      month: label,
      requests: monthRequests.length,
      fulfilled,
    }
  })

  const userRegistrationData = thisMonthKeys.map(({ label, key }) => {
    const monthUsers = users.filter((user) => getMonthKey(user.createdAt) === key)
    return {
      month: label,
      donors: monthUsers.filter((user) => user.role === 'donor').length,
      receivers: monthUsers.filter((user) => user.role === 'receiver').length,
      hospitals: monthUsers.filter((user) => user.role === 'hospital').length,
    }
  })

  const bloodGroupData = bloodGroups.map((group) => ({
    name: group,
    value: users.filter((entry) => entry.role === 'donor' && entry.bloodGroup === group).length,
    available: users.filter((entry) => entry.role === 'donor' && entry.bloodGroup === group).length,
  }))

  const totalRequestsThisMonth = monthlyRequestsData.reduce((sum, item) => sum + item.requests, 0)
  const fulfilledRequestsThisMonth = monthlyRequestsData.reduce((sum, item) => sum + item.fulfilled, 0)
  const fulfillmentRate = totalRequestsThisMonth > 0 ? Math.round((fulfilledRequestsThisMonth / totalRequestsThisMonth) * 100) : 0

  const mostRequestedBloodGroup = Object.entries(
    requests.reduce<Record<string, number>>((acc, request) => {
      const group = request.bloodType || request.bloodGroup || 'Unknown'
      acc[group] = (acc[group] ?? 0) + 1
      return acc
    }, {}),
  )
    .sort(([, a], [, b]) => b - a)
    .map(([group]) => group)[0] || 'N/A'

  const activeHospitalCount = users.filter((entry) => entry.role === 'hospital').length
  const pendingRequestCount = requestStatusCounts.Pending

  const systemStats = [
    { label: 'Total Users', value: kpis ? String(kpis.totalUsers) : '—', icon: Users, color: 'text-blue-500', trend: kpis ? `${kpis.signupsThisWeek} this week` : 'Loading' },
    { label: 'Active Donors', value: kpis ? String(kpis.eligibleDonors ?? 0) : '—', icon: Heart, color: 'text-red-500', trend: kpis ? `${kpis.notEligibleDonors ?? 0} not eligible` : 'Loading' },
    { label: 'Total Hospitals', value: String(users.filter((entry) => entry.role === 'hospital').length), icon: Building2, color: 'text-emerald-500', trend: 'Live count' },
    { label: 'Completed Donations', value: kpis ? String(kpis.totalCompletedDonations ?? 0) : '—', icon: CheckCircle, color: 'text-green-500', trend: 'Real data' },
  ]

  const kpiMetrics = [
    { label: 'Blood Requests', value: requests.length ? String(requests.length) : '—', icon: Droplet, color: 'bg-red-100 text-red-700', delta: 'Live from database' },
    { label: 'Pending Approvals', value: kpis ? String(kpis.pendingApprovals ?? 0) : '—', icon: AlertCircle, color: 'bg-orange-100 text-orange-700', delta: 'Awaiting review' },
    { label: 'Fulfilled Requests', value: kpis ? String(kpis.totalCompletedDonations ?? 0) : '—', icon: CheckCircle, color: 'bg-green-100 text-green-700', delta: 'Completed donations' },
    { label: 'Successful Matches', value: kpis ? String(kpis.totalCompletedDonations ?? 0) : '—', icon: Heart, color: 'bg-pink-100 text-pink-700', delta: 'Verified donations' },
  ]

  const requestStatusData = [
    { name: 'Fulfilled', value: requestStatusCounts.Fulfilled, color: '#10b981' },
    { name: 'Pending', value: requestStatusCounts.Pending, color: '#f59e0b' },
    { name: 'Cancelled', value: requestStatusCounts.Cancelled, color: '#ef4444' },
  ]

  const insights = [
    { title: 'Most Requested Blood Group', value: mostRequestedBloodGroup, icon: Droplet, color: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/30' },
    { title: 'Recent Signups', value: users.length ? `${users.length}` : '0', icon: TrendingUp, color: 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900/30' },
    { title: 'Pending Requests', value: String(pendingRequestCount), icon: AlertCircle, color: 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900/30' },
    { title: 'Active Hospitals', value: String(activeHospitalCount), icon: Zap, color: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/30' },
  ]

  const recentActivity = activity.length > 0 ? activity : [
    { id: 'empty', type: 'No activity yet', name: 'Signups and requests will appear here', time: 'Awaiting data', icon: Activity, color: 'bg-muted text-muted-foreground' },
  ]

  const recentUsers = users.slice(0, 6).map((entry) => ({
    id: entry.id,
    name: entry.name,
    type: entry.role === 'hospital' ? 'Hospital' : entry.role === 'donor' ? 'Donor' : entry.role === 'receiver' ? 'Receiver' : 'Admin',
    joined: entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : '—',
    status: entry.isVerified ? 'Verified' : 'Active',
  }))

  const handleApproveDonation = async (donationId: string) => {
    try {
      console.log('🔵 Approving donation:', donationId)
      const res = await fetch(`/api/admin/donations/${donationId}/approve?city=Karachi`, { method: 'PATCH' })
      console.log('🔵 Response status:', res.status)
      const payload = await res.json()
      console.log('🔵 Response payload:', payload)
      if (!res.ok || !payload.success) {
        throw new Error(payload.error || payload.message || 'Approval failed')
      }
      toast({ title: '✓ Donation Approved!', description: 'Certificate generated and sent to donor.', variant: 'default' })
      // Refresh the donations list
      await loadAdminData()
    } catch (error) {
      console.error('❌ Approval error:', error)
      toast({ title: 'Approval failed', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  const pendingRequests = [
    { id: 1, type: 'Pending Approvals', count: kpis?.pendingApprovals ?? 0, urgent: true },
    { id: 2, type: 'Verified Donors', count: kpis?.eligibleDonors ?? 0, urgent: false },
    { id: 3, type: 'Hospitals Registered', count: users.filter((entry) => entry.role === 'hospital').length, urgent: false },
  ]

  // If not in admin mode, show donor dashboard instead
  if (!adminMode) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Donor Mode Active</h2>
          <Button onClick={() => setAdminMode(true)} variant="outline">
            Back to Admin
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">You're viewing as a donor. Switch back to admin to approve donations.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header with Mode Toggle */}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Admin Dashboard</h2>
        <Button onClick={() => setAdminMode(false)} variant="outline">
          View as Donor
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {systemStats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="border-l-4 border-l-primary">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                    <p className="text-3xl font-bold mt-2 text-foreground">{stat.value}</p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-semibold">{stat.trend}</p>
                  </div>
                  <div className={`p-3 rounded-lg bg-opacity-10 ${stat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiMetrics.map((metric) => {
          const Icon = metric.icon
          return (
            <Card key={metric.label}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${metric.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground font-medium">{metric.label}</p>
                    <p className="text-2xl font-bold mt-2 text-foreground">{metric.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{metric.delta}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Main Content Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Pending Donation Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingDonations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending donation approvals.</p>
          ) : (
            <div className="space-y-4">
              {pendingDonations.map((donation) => (
                <div key={donation.id} className="flex items-center justify-between rounded-lg border-2 border-orange-200 p-4 bg-orange-50 dark:bg-orange-950/20">
                  <div className="flex-1">
                    <p className="font-bold text-lg">{donation.donorName || 'Donor'} → {donation.recipientName || 'Receiver'}</p>
                    <p className="text-sm text-muted-foreground mt-1">🩸 {donation.bloodGroup} • {donation.units} unit(s)</p>
                    <p className="text-xs text-muted-foreground">Hospital: {donation.hospitalName || 'Direct donation'}</p>
                    <p className="text-xs text-muted-foreground">ID: {donation.id}</p>
                  </div>
                  <Button 
                    size="lg"
                    onClick={() => void handleApproveDonation(donation.id)}
                    className="ml-4 bg-green-600 hover:bg-green-700 text-white"
                  >
                    ✓ Approve
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Blood Group Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Blood Group Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {isClient && (
                <div className="w-full overflow-hidden">
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={bloodGroupData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={90}
                        innerRadius={40}
                        paddingAngle={2}
                        fill="#ef4444"
                        dataKey="value"
                      >
                      {bloodGroupData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#10b981', '#06b6d4', '#0ea5e9'][index % 8]} />
                      ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                )}
              </CardContent>
            </Card>

            {/* Monthly Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Monthly Blood Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {isClient && (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyRequestsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="requests" stroke="#ef4444" strokeWidth={2} name="Total Requests" />
                    <Line type="monotone" dataKey="fulfilled" stroke="#10b981" strokeWidth={2} name="Fulfilled" />
                  </LineChart>
                </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Insights Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {insights.map((insight) => {
              const Icon = insight.icon
              return (
                <Card key={insight.title} className={`border ${insight.color}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-current opacity-10">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground font-medium">{insight.title}</p>
                        <p className="text-2xl font-bold mt-1 text-foreground">{insight.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Recent Activity Feed */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent System Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((activity) => {
                  const Icon = activity.icon
                  return (
                    <div key={activity.id} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                      <div className={`p-2 rounded-lg ${activity.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-foreground">{activity.type}</p>
                        <p className="text-xs text-muted-foreground">{activity.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Pending Actions
              </h3>
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{request.type}</p>
                      <p className="text-sm text-muted-foreground">{request.count} items pending</p>
                    </div>
                    <Button
                      size="sm"
                      variant={request.urgent ? 'default' : 'outline'}
                      className={request.urgent ? 'bg-red-600 hover:bg-red-700' : ''}
                    >
                      Review
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                System Health
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Server Status</span>
                    <span className="text-sm text-green-600 dark:text-green-400 font-semibold">Online</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Database</span>
                    <span className="text-sm text-green-600 dark:text-green-400 font-semibold">Optimal</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '95%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">API Response</span>
                    <span className="text-sm text-green-600 dark:text-green-400 font-semibold">Fast</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          {/* User Registration Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly User Registrations</CardTitle>
            </CardHeader>
            <CardContent>
              {isClient && (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={userRegistrationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="donors" fill="#ef4444" name="Donors" />
                  <Bar dataKey="receivers" fill="#f59e0b" name="Receivers" />
                  <Bar dataKey="hospitals" fill="#3b82f6" name="Hospitals" />
                </BarChart>
              </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-bold mb-4">Recent Users</h3>
              <div className="space-y-2 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 font-semibold">Name</th>
                      <th className="text-left py-2 px-2 font-semibold">Type</th>
                      <th className="text-left py-2 px-2 font-semibold">Joined</th>
                      <th className="text-left py-2 px-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map((user) => (
                      <tr key={user.id} className="border-b border-border hover:bg-muted/50">
                        <td className="py-3 px-2 font-medium">{user.name}</td>
                        <td className="py-3 px-2">
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded">
                            {user.type}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">{user.joined}</td>
                        <td className="py-3 px-2">
                          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                            {user.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-6">
          {/* Request Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Request Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {isClient && (
              <div className="w-full overflow-hidden">
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={requestStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={90}
                      innerRadius={40}
                      paddingAngle={2}
                      fill="#ef4444"
                      dataKey="value"
                    >
                      {requestStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              )}
            </CardContent>
          </Card>

          {/* Request Analytics */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-bold mb-4">Blood Request Metrics</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 border border-border rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Requests This Month</p>
                  <p className="text-2xl font-bold">245</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">↑ 12% increase from last month</p>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <p className="text-sm text-muted-foreground">Average Fulfillment Time</p>
                  <p className="text-2xl font-bold">2.3 hours</p>
                  <p className="text-xs text-muted-foreground mt-1">From request to first donor contact</p>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <p className="text-sm text-muted-foreground">Fulfillment Rate</p>
                  <p className="text-2xl font-bold">94%</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">Requests successfully fulfilled</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                System Reports
              </h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start h-auto py-3 bg-transparent">
                  <div className="text-left">
                    <p className="font-semibold">Monthly Activity Report</p>
                    <p className="text-xs text-muted-foreground">Generated: January 2025</p>
                  </div>
                </Button>
                <Button variant="outline" className="w-full justify-start h-auto py-3 bg-transparent">
                  <div className="text-left">
                    <p className="font-semibold">User Statistics</p>
                    <p className="text-xs text-muted-foreground">Donors, Receivers, Hospitals breakdown</p>
                  </div>
                </Button>
                <Button variant="outline" className="w-full justify-start h-auto py-3 bg-transparent">
                  <div className="text-left">
                    <p className="font-semibold">Blood Request Analytics</p>
                    <p className="text-xs text-muted-foreground">Request trends and fulfillment data</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
