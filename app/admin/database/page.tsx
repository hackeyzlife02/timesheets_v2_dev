"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getCurrentUser, isAuthenticated, isAdmin } from "@/lib/auth"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { DbInitializer } from "@/components/db-initializer"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Database, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AddColumnsMigration } from "@/components/add-columns-migration"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { AlertTriangle, RefreshCw } from "lucide-react"

export default function DatabasePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dbStatus, setDbStatus] = useState<any>(null)
  const [checkingDb, setCheckingDb] = useState(false)
  const [isMigrating, setIsMigrating] = useState(false)
  const [migrationResult, setMigrationResult] = useState<any>(null)
  const { toast } = useToast()

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
    setLoading(false)

    // Check database status
    checkDatabaseStatus()
  }, [router])

  const checkDatabaseStatus = async () => {
    try {
      setCheckingDb(true)
      const response = await fetch("/api/db/check")
      const data = await response.json()
      setDbStatus(data)
    } catch (error) {
      console.error("Error checking database status:", error)
      setDbStatus({ success: false, error: "Failed to check database status" })
    } finally {
      setCheckingDb(false)
    }
  }

  const runMigration = async () => {
    setIsMigrating(true)
    setMigrationResult(null)

    try {
      const response = await fetch("/api/db/migrate")
      const data = await response.json()

      setMigrationResult(data)

      if (data.success) {
        toast({
          title: "Migration Successful",
          description: data.message,
          variant: "success",
        })
      } else {
        toast({
          title: "Migration Failed",
          description: data.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error running migration:", error)
      setMigrationResult({
        success: false,
        message: "An error occurred while running the migration",
        error: error instanceof Error ? error.message : String(error),
        logs: ["Error connecting to migration endpoint"],
      })

      toast({
        title: "Migration Failed",
        description: "An error occurred while running the migration",
        variant: "destructive",
      })
    } finally {
      setIsMigrating(false)
    }
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader user={user} />

      <div className="flex flex-1">
        <DashboardNav userRole="admin" />

        <main className="flex-1 p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">Database Management</h1>
              <Button variant="outline" size="sm" onClick={checkDatabaseStatus} disabled={checkingDb}>
                {checkingDb ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh Status
                  </>
                )}
              </Button>
            </div>

            {dbStatus && !dbStatus.success && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Database Error</AlertTitle>
                <AlertDescription>
                  {dbStatus.message || "There was an error connecting to the database."}
                </AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="status">
              <TabsList>
                <TabsTrigger value="status">Database Status</TabsTrigger>
                <TabsTrigger value="migrations">Migrations</TabsTrigger>
                <TabsTrigger value="run-migration">Run Migration</TabsTrigger>
              </TabsList>
              <TabsContent value="status" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Database className="mr-2 h-5 w-5" />
                      Database Status
                    </CardTitle>
                    <CardDescription>Current status of the database connection and tables</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {checkingDb ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
                        <p>Checking database status...</p>
                      </div>
                    ) : dbStatus ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <h3 className="text-sm font-medium">Connection Status</h3>
                            <div
                              className={`flex items-center ${dbStatus.success ? "text-green-600" : "text-red-600"}`}
                            >
                              <div
                                className={`mr-2 h-3 w-3 rounded-full ${
                                  dbStatus.success ? "bg-green-600" : "bg-red-600"
                                }`}
                              ></div>
                              <span>{dbStatus.success ? "Connected" : "Error"}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-sm font-medium">Database Type</h3>
                            <p>{dbStatus.dbType || "Unknown"}</p>
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                          <h3 className="text-sm font-medium">Tables</h3>
                          {dbStatus.tables && dbStatus.tables.length > 0 ? (
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {dbStatus.tables.map((table: string) => (
                                <li key={table} className="flex items-center text-sm bg-muted/50 p-2 rounded-md">
                                  <div className="h-2 w-2 rounded-full bg-green-600 mr-2"></div>
                                  {table}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground">No tables found</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-center py-6 text-muted-foreground">
                        Click "Refresh Status" to check database status
                      </p>
                    )}
                  </CardContent>
                  {dbStatus && !dbStatus.success && (
                    <CardFooter>
                      <Button onClick={checkDatabaseStatus} disabled={checkingDb}>
                        Try Again
                      </Button>
                    </CardFooter>
                  )}
                </Card>

                {dbStatus && dbStatus.success && dbStatus.tables && dbStatus.tables.length === 0 && (
                  <DbInitializer onComplete={checkDatabaseStatus} />
                )}
              </TabsContent>
              <TabsContent value="migrations" className="space-y-4">
                <AddColumnsMigration />
              </TabsContent>
              <TabsContent value="run-migration" className="space-y-4">
                <Card className="w-full max-w-md mx-auto">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Database Migration
                    </CardTitle>
                    <CardDescription>Run database migrations to update schema</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      This will add the "requires_timesheet" field to the users table and set it to false for salaried
                      employees.
                    </p>

                    {migrationResult && (
                      <Alert
                        className={
                          migrationResult.success
                            ? "bg-green-50 border-green-200 text-green-800"
                            : "bg-red-50 border-red-200 text-red-800"
                        }
                      >
                        {migrationResult.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        <AlertTitle>{migrationResult.success ? "Success" : "Error"}</AlertTitle>
                        <AlertDescription>
                          <p>{migrationResult.message}</p>
                          {migrationResult.logs && migrationResult.logs.length > 0 && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-sm font-medium">View Logs</summary>
                              <div className="mt-2 text-xs bg-white/50 p-2 rounded border overflow-auto max-h-40">
                                {migrationResult.logs.map((log: string, index: number) => (
                                  <div key={index} className="py-1">
                                    {log}
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button onClick={runMigration} className="w-full" disabled={isMigrating}>
                      {isMigrating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Running Migration...
                        </>
                      ) : (
                        "Run Migration"
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}

