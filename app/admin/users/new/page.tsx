"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { getCurrentUser, isAuthenticated, isAdmin } from "@/lib/auth"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { ArrowLeft } from "lucide-react"

export default function NewUserPage() {
  const router = useRouter()
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
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)

  // Check if user is authenticated and is admin
  if (typeof window !== "undefined" && (!isAuthenticated() || !isAdmin())) {
    router.push(isAuthenticated() ? "/employee/dashboard" : "/login")
    return null
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.username.trim()) {
      newErrors.username = "Username is required"
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters"
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 4) {
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

      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      console.log("API response:", data)

      // Add debug info
      setDebugInfo(JSON.stringify(data, null, 2))

      if (data.success) {
        router.push("/admin/users")
      } else {
        setServerError(data.message || "Failed to create user")
      }
    } catch (error) {
      console.error("Error creating user:", error)
      setServerError(
        "An error occurred while creating the user: " + (error instanceof Error ? error.message : String(error)),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
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
              <h1 className="text-3xl font-bold">Add New User</h1>
            </div>

            {serverError && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded relative">
                <span className="block sm:inline">{serverError}</span>
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
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter password"
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
                    {isSubmitting ? "Creating..." : "Create User"}
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

