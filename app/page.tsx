"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Database, Loader2 } from "lucide-react"

export default function Home() {
  const [dbStatus, setDbStatus] = useState<"checking" | "initialized" | "not-initialized">("checking")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if database is initialized
    const checkDatabase = async () => {
      try {
        const response = await fetch("/api/db/check")

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }

        const data = await response.json()
        console.log("Database check response:", data)

        if (data && typeof data.initialized === "boolean") {
          setDbStatus(data.initialized ? "initialized" : "not-initialized")
          if (!data.initialized && data.message) {
            setError(data.message)
          }
        } else {
          console.error("Unexpected response format:", data)
          setDbStatus("not-initialized")
          setError("Received unexpected response format from server")
        }
      } catch (error) {
        console.error("Error checking database status:", error)
        setDbStatus("not-initialized")
        setError(error instanceof Error ? error.message : "Unknown error occurred")
      }
    }

    checkDatabase()
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-primary px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary-foreground">Lutz Timesheets</h1>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="secondary" size="sm">
              Login
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-4xl font-bold tracking-tight">Employee Timesheet Management</h2>
          <p className="text-xl text-muted-foreground">
            A modern web application for tracking and managing employee work hours
          </p>

          {dbStatus === "checking" ? (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Checking database status...</span>
            </div>
          ) : (
            dbStatus === "not-initialized" && (
              <Alert className="bg-yellow-50 border-yellow-200 text-left">
                <Database className="h-4 w-4 text-yellow-600" />
                <AlertTitle>Database Setup Required</AlertTitle>
                <AlertDescription className="flex flex-col gap-2">
                  <p>
                    {error
                      ? `Database needs initialization: ${error}`
                      : "The application database needs to be set up before you can use the timesheet system."}
                  </p>
                  <Link href="/setup">
                    <Button variant="outline" className="mt-2 bg-white">
                      <Database className="mr-2 h-4 w-4" />
                      Go to Setup
                    </Button>
                  </Link>
                </AlertDescription>
              </Alert>
            )
          )}

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 text-left">
            <div className="bg-card rounded-lg p-6 shadow">
              <h3 className="text-xl font-semibold mb-2">Easy Time Tracking</h3>
              <p className="text-muted-foreground">
                Record daily work hours, breaks, and overtime with a user-friendly interface.
              </p>
            </div>
            <div className="bg-card rounded-lg p-6 shadow">
              <h3 className="text-xl font-semibold mb-2">Submission Workflow</h3>
              <p className="text-muted-foreground">
                Submit, review, and certify timesheets with automated calculations and notifications.
              </p>
            </div>
            <div className="bg-card rounded-lg p-6 shadow">
              <h3 className="text-xl font-semibold mb-2">Admin Dashboard</h3>
              <p className="text-muted-foreground">
                Comprehensive tools for managers to review, approve, and generate reports.
              </p>
            </div>
          </div>

          <div className="pt-4">
            <Link href={dbStatus === "not-initialized" ? "/setup" : "/login"}>
              <Button size="lg">{dbStatus === "not-initialized" ? "Set Up Application" : "Get Started"}</Button>
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Lutz Timesheets. All rights reserved.</p>
      </footer>
    </div>
  )
}

