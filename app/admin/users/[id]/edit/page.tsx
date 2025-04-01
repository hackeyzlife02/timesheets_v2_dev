"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { getCurrentUser, isAuthenticated, isAdmin } from "@/lib/auth"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react"

export default function EditUserPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

  const [user, setUser] = useState<any>(getCurrentUser())
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    isAdmin: false,
    employeeType: "hourly",
    weeklySalary: "0.00",
    isActive: true, // New field for active status
  })
  const [originalData, setOriginalData] = useState<any>(null)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [serverError, setServerError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)

  // Check if user is authenticated and is admin
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login")
      return
    }

    if (!isAdmin()) {
      router.push("/employee/dashboard")
      return
    }

    // Fetch user data
    fetchUser()
  }, [router, userId])

  const fetchUser = async () => {
    try {
      setIsLoading(true)
      setServerError(null)
      setDebugInfo(null)

      console.log(`Fetching user with ID: ${userId}`)
      const response = await fetch(`/api/users/${userId}`)

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()
      console.log("API response:", data)

      // Add debug info
      setDebugInfo(JSON.stringify(data, null, 2))

      if (data.success && data.data) {
        const userData = data.data
        setFormData({
          username: userData.username || "",
          password: "", // Don't populate password
          fullName: userData.full_name || "",
          email: userData.email || "",
          isAdmin: userData.is_admin || false,
          employeeType: userData.employee_type || "hourly",
          weeklySalary: userData.weekly_salary?.toString() || "0.00",
          isActive: userData.is_active !== undefined ? userData.is_active : true, // Default to true if not present
        })
        setOriginalData(userData)
      } else {
        setServerError(data.message || "Failed to fetch user")
      }
    } catch (error) {
      console.error("Error fetching user:", error)
      setServerError(
        "An error occurred while fetching the user: " + (error instanceof Error ? error.message : String(error)),
      )
    } finally {
      setIsLoading(false)
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.username.trim()) {
      newErrors.username = "Username is required"
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters"
    }

    // Password is optional when editing
    if (formData.password.trim() && formData.password.length < 4) {
      newErrors.password = "Password must be at least 4 characters"
    }

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid"
    }

    if (formData.employeeType === "salary") {
      const salary = Number.parseFloat(formData.weeklySalary)
      if (isNaN(salary) || salary <= 0) {
        newErrors.weeklySalary = "Weekly salary must be a positive number"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setServerError(null)
    setDebugInfo(null)

    try {
      console.log("Submitting form data:", formData)

      // Only include password if it was changed
      const dataToSubmit = {
        ...formData,
        password: formData.password.trim() ? formData.password : undefined,
      }

      const response = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSubmit),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()
      console.log("API response:", data)

      // Add debug info
      setDebugInfo(JSON.stringify(data, null, 2))

      if (data.success) {
        router.push("/admin/users")
      } else {
        setServerError(data.message || "Failed to update user")
      }
    } catch (error) {
      console.error("Error updating user:", error)
      setServerError(
        "An error occurred while updating the user: " + (error instanceof Error ? error.message : String(error)),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <DashboardHeader user={user} />
        <div className="flex flex-1">
          <DashboardNav userRole="admin" />
          <main className="flex-1 p-6 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p>Loading user data...</p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader user={user} />

      <div className="flex flex-1">
        <DashboardNav userRole="admin" />

        <main className="flex-1 p-6">
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push("/admin/users")}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Users
              </Button>
              <h1 className="text-3xl font-bold">Edit User</h1>
            </div>

            {serverError && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded relative">
                <span className="block sm:inline">{serverError}</span>
                <div className="mt-2">
                  <Button variant="outline" size="sm" onClick={fetchUser} className="bg-white">
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Try Again
                  </Button>
                </div>
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
              <form onSubmit={handleSubmit}>
                <CardHeader>
                  <CardTitle>User Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="Enter username"
                    />
                    {errors.username && <p className="text-sm text-red-500">{errors.username}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password (leave blank to keep current)</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter new password"
                    />
                    {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="Enter full name"
                    />
                    {errors.fullName && <p className="text-sm text-red-500">{errors.fullName}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter email"
                    />
                    {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Employee Type</Label>
                    <RadioGroup
                      value={formData.employeeType}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, employeeType: value }))}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="hourly" id="hourly" />
                        <Label htmlFor="hourly">Hourly</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="salary" id="salary" />
                        <Label htmlFor="salary">Salary</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {formData.employeeType === "salary" && (
                    <div className="space-y-2">
                      <Label htmlFor="weeklySalary">Weekly Salary ($)</Label>
                      <Input
                        id="weeklySalary"
                        name="weeklySalary"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.weeklySalary}
                        onChange={handleChange}
                        placeholder="Enter weekly salary"
                      />
                      {errors.weeklySalary && <p className="text-sm text-red-500">{errors.weeklySalary}</p>}
                    </div>
                  )}

                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked === true }))}
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="isAdmin"
                      checked={formData.isAdmin}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isAdmin: checked === true }))}
                    />
                    <Label htmlFor="isAdmin">Administrator</Label>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/admin/users")}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

