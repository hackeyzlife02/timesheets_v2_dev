"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { getCurrentUser, isAuthenticated, isAdmin } from "@/lib/auth"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react"

interface User {
  id: number
  username: string
  full_name: string
  email: string
  is_admin: boolean
  employee_type?: string
  is_active?: boolean
  created_at: string
  updated_at: string
}

export default function UsersPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is authenticated and is admin
    if (!isAuthenticated()) {
      router.push("/login")
      return
    }

    if (!isAdmin()) {
      router.push("/employee/dashboard")
      return
    }

    // Get current user
    const currentUser = getCurrentUser()
    setUser(currentUser)

    // Fetch users
    fetchUsers()
  }, [router])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      setDebugInfo(null)

      console.log("Fetching users...")
      const response = await fetch("/api/users")

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()
      console.log("API response:", data)

      // Add debug info
      setDebugInfo(JSON.stringify(data, null, 2))

      if (data.success) {
        // Ensure we always have an array
        if (Array.isArray(data.data)) {
          setUsers(data.data)
          console.log(`Loaded ${data.data.length} users`)
        } else {
          console.error("data.data is not an array:", data.data)
          setUsers([])
          setError("Received invalid data format from server")
        }
      } else {
        setError(data.message || "Failed to fetch users")
        setUsers([])
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      setError("An error occurred while fetching users: " + (error instanceof Error ? error.message : String(error)))
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteUserId) return

    try {
      const response = await fetch(`/api/users/${deleteUserId}`, {
        method: "DELETE",
      })
      const data = await response.json()

      if (data.success) {
        // Remove user from list
        setUsers(users.filter((u) => u.id !== deleteUserId))
        setError(null)
      } else {
        setError(data.message || "Failed to delete user")
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      setError("An error occurred while deleting the user")
    } finally {
      setDeleteDialogOpen(false)
      setDeleteUserId(null)
    }
  }

  const confirmDelete = (id: number) => {
    setDeleteUserId(id)
    setDeleteDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading users...</span>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader user={user} />

      <div className="flex flex-1">
        <DashboardNav userRole="admin" />

        <main className="flex-1 p-6">
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h1 className="text-3xl font-bold">User Management</h1>
              <div className="flex gap-2">
                <Button variant="outline" onClick={fetchUsers}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button onClick={() => router.push("/admin/users/new")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add New User
                </Button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded relative">
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            {debugInfo && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded relative">
                <details>
                  <summary className="cursor-pointer">Debug Information</summary>
                  <pre className="mt-2 text-xs overflow-auto max-h-40">{debugInfo}</pre>
                </details>
              </div>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>All Users</CardTitle>
              </CardHeader>
              <CardContent>
                {!users || users.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>No users found. Add your first user by clicking the "Add New User" button.</p>
                    <Button variant="outline" className="mt-4" onClick={fetchUsers}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh Users List
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Full Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.id}</TableCell>
                          <TableCell>{user.username}</TableCell>
                          <TableCell>{user.full_name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            {user.is_admin ? (
                              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Admin</Badge>
                            ) : (
                              <Badge variant="outline">Employee</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.employee_type === "salary" ? (
                              <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">Salary</Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Hourly</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.is_active ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Active</Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/admin/users/${user.id}/edit`)}
                              >
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => confirmDelete(user.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user and all associated timesheets.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

