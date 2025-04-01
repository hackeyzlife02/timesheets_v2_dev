"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, XCircle, Database } from "lucide-react"

export function DbInitializer() {
  const [isInitializing, setIsInitializing] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const initializeDatabase = async () => {
    setIsInitializing(true)
    setResult(null)

    try {
      const response = await fetch("/api/db/init")
      const data = await response.json()

      setResult({
        success: data.success,
        message:
          data.message || (data.success ? "Database initialized successfully!" : "Failed to initialize database"),
      })
    } catch (error) {
      console.error("Error initializing database:", error)
      setResult({
        success: false,
        message: "An error occurred while initializing the database",
      })
    } finally {
      setIsInitializing(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Initialization
        </CardTitle>
        <CardDescription>Set up the database tables and seed initial data</CardDescription>
      </CardHeader>
      <CardContent>
        {result && (
          <Alert className={result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
            {result.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertTitle>{result.success ? "Success" : "Error"}</AlertTitle>
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={initializeDatabase} disabled={isInitializing} className="w-full">
          {isInitializing ? "Initializing..." : "Initialize Database"}
        </Button>
      </CardFooter>
    </Card>
  )
}

