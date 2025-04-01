"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Database, ArrowRight, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react"

export default function SetupPage() {
  const router = useRouter()
  const [isInitializing, setIsInitializing] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [dbStatus, setDbStatus] = useState<"checking" | "initialized" | "not-initialized">("checking")
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [errorDetails, setErrorDetails] = useState<string | null>(null)
  const [detailedLog, setDetailedLog] = useState<string[]>([])
  const [dbCheckDetails, setDbCheckDetails] = useState<any>(null)

  // Check database status on page load
  useEffect(() => {
    checkDatabaseStatus()
  }, [])

  const checkDatabaseStatus = async () => {
    setIsChecking(true)
    setDbStatus("checking")
    setDetailedLog(["Checking database status..."])

    try {
      const response = await fetch("/api/db/check")
      const data = await response.json()

      console.log("Database check response:", data)
      setDbCheckDetails(data)

      // Add detailed log from response
      setDetailedLog((prev) => [
        ...prev,
        `Tables found: ${data.existingTables?.join(", ") || "none"}`,
        `User count: ${data.userCount || 0}`,
        `Admin user exists: ${data.adminExists ? "Yes" : "No"}`,
        `All required tables exist: ${data.allTablesExist ? "Yes" : "No"}`,
      ])

      // Force initialized to true if we have the tables and at least one user
      const isInitialized = data.allTablesExist && data.userCount > 0

      if (isInitialized) {
        setDbStatus("initialized")
        setResult({
          success: true,
          message: data.message || "Database is already initialized and ready to use.",
        })
        setDetailedLog((prev) => [...prev, "Database is initialized and ready to use"])
      } else {
        setDbStatus("not-initialized")
        setResult(null)
        setDetailedLog((prev) => [...prev, "Database needs initialization"])
      }
    } catch (error) {
      console.error("Error checking database status:", error)
      setDbStatus("not-initialized")
      setErrorDetails(error instanceof Error ? error.message : String(error))
      setDetailedLog((prev) => [
        ...prev,
        `Error checking database: ${error instanceof Error ? error.message : String(error)}`,
      ])
    } finally {
      setIsChecking(false)
    }
  }

  const initializeDatabase = async () => {
    setIsInitializing(true)
    setResult(null)
    setErrorDetails(null)
    setDetailedLog(["Starting database initialization..."])

    try {
      const response = await fetch("/api/db/init")

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()

      // Add detailed log from response if available
      if (data.logs && Array.isArray(data.logs)) {
        setDetailedLog((prev) => [...prev, ...data.logs])
      }

      if (data.success) {
        setDbStatus("initialized")
        setResult({
          success: true,
          message: data.message || "Database initialized successfully!",
        })
        setDetailedLog((prev) => [...prev, "Database initialization completed successfully"])
      } else {
        setResult({
          success: false,
          message: data.message || "Failed to initialize database",
        })
        setDetailedLog((prev) => [...prev, `Error: ${data.message || "Unknown error"}`])

        // Store detailed error information if available
        if (data.error) {
          const errorText = typeof data.error === "object" ? JSON.stringify(data.error, null, 2) : String(data.error)
          console.error("Error details:", errorText)
          setErrorDetails(errorText)
          setDetailedLog((prev) => [...prev, `Error details: ${errorText}`])
        }
      }
    } catch (error) {
      console.error("Error initializing database:", error)
      setResult({
        success: false,
        message: "An error occurred while initializing the database",
      })
      setErrorDetails(error instanceof Error ? error.message : String(error))
      setDetailedLog((prev) => [...prev, `Exception: ${error instanceof Error ? error.message : String(error)}`])
    } finally {
      setIsInitializing(false)
      setDetailedLog((prev) => [...prev, "Initialization process completed"])
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Lutz Timesheets Setup</CardTitle>
            <CardDescription>Database initialization status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isChecking ? (
              <div className="flex items-center justify-center py-6">
                <RefreshCw className="h-6 w-6 animate-spin text-primary mr-2" />
                <p>Checking database status...</p>
              </div>
            ) : dbStatus === "initialized" ? (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <AlertTitle>Database Ready</AlertTitle>
                <AlertDescription>
                  {result?.message || "The database is already initialized and ready to use."}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="rounded-md bg-blue-50 p-4 text-blue-800">
                  <div className="flex">
                    <Database className="h-5 w-5 text-blue-500" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">Database Initialization Required</h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>
                          The application database needs to be set up before you can use the timesheet system. Click the
                          button below to initialize the database with the required tables.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {dbCheckDetails && dbCheckDetails.existingTables && dbCheckDetails.existingTables.length > 0 && (
                  <Alert className="bg-yellow-50 border-yellow-200">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <AlertTitle>Partial Database Detected</AlertTitle>
                    <AlertDescription>
                      <p>Some database tables already exist but the setup is incomplete.</p>
                      <ul className="list-disc pl-5 mt-2 text-sm">
                        <li>Tables found: {dbCheckDetails.existingTables.join(", ")}</li>
                        <li>Users found: {dbCheckDetails.userCount || 0}</li>
                        <li>Admin user: {dbCheckDetails.adminExists ? "Found" : "Not found"}</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {result && !result.success && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      {result.message}
                      {errorDetails && (
                        <div className="mt-2 text-xs overflow-auto max-h-32 p-2 bg-red-100 rounded">
                          <pre>{errorDetails}</pre>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {detailedLog.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Initialization Log:</h4>
                    <div className="text-xs bg-gray-50 p-2 rounded border overflow-auto max-h-40">
                      {detailedLog.map((log, index) => (
                        <div key={index} className="py-1 border-b border-gray-100 last:border-0">
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            {dbStatus === "initialized" ? (
              <Button className="w-full" onClick={() => router.push("/login")}>
                Continue to Login
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button onClick={initializeDatabase} disabled={isInitializing} className="w-full">
                  {isInitializing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Initializing...
                    </>
                  ) : (
                    "Initialize Database"
                  )}
                </Button>
                <Button variant="outline" className="w-full" onClick={checkDatabaseStatus} disabled={isChecking}>
                  {isChecking ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    "Refresh Database Status"
                  )}
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => router.push("/login")}>
                  Skip and Try Login Anyway
                </Button>
              </>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

