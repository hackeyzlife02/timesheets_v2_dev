"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { loginUser, isAuthenticated, isAdmin } from "@/lib/auth"
import { Database } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [dbInitNeeded, setDbInitNeeded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [redirectChecked, setRedirectChecked] = useState(false)

  useEffect(() => {
    // Only check authentication once to prevent redirect loops
    if (redirectChecked) return

    setRedirectChecked(true)

    // If already authenticated, redirect to appropriate dashboard
    if (isAuthenticated()) {
      console.log("User already authenticated, redirecting")
      const redirectPath = isAdmin() ? "/admin/dashboard" : "/employee/dashboard"
      console.log(`Redirecting to: ${redirectPath}`)
      router.push(redirectPath)
    }
  }, [router, redirectChecked])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setDbInitNeeded(false)
    setIsLoading(true)

    try {
      console.log(`Attempting login for: ${username}`)
      const result = await loginUser(username, password)
      console.log("Login result:", result)

      if (result.success) {
        if (result.needsDbInit) {
          setDbInitNeeded(true)
          setError(result.message || "Database needs initialization")
          setIsLoading(false)
        } else {
          console.log(`Login successful, redirecting to ${result.isAdmin ? "admin" : "employee"} dashboard`)
          // Redirect based on user role
          router.push(result.isAdmin ? "/admin/dashboard" : "/employee/dashboard")
        }
      } else {
        setError(result.message || "Login failed. Please check your credentials.")
        setDbInitNeeded(result.needsDbInit || false)
        setIsLoading(false)
      }
    } catch (err) {
      console.error("Login error:", err)
      setError("An error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription>Enter your username and password to access your timesheet</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-50 text-red-800 border-red-200">
                <AlertTitle>{dbInitNeeded ? "Database Not Initialized" : "Error"}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                {dbInitNeeded && (
                  <Button variant="outline" className="mt-2 bg-white" onClick={() => router.push("/admin/database")}>
                    <Database className="mr-2 h-4 w-4" />
                    Initialize Database
                  </Button>
                )}
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

