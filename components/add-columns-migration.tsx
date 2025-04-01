"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Database } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function AddColumnsMigration() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const { toast } = useToast()

  const runMigration = async () => {
    try {
      setLoading(true)
      setResult(null)

      const response = await fetch("/api/db/migrate/add-columns")
      const data = await response.json()

      setResult(data)

      if (data.success) {
        toast({
          title: "Migration Successful",
          description: "Required columns have been added to the database",
          variant: "success",
        })
      } else {
        toast({
          title: "Migration Failed",
          description: data.message || "Failed to add columns",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Migration error:", err)
      toast({
        title: "Migration Failed",
        description: "An error occurred while running the migration",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Add Required Columns
        </CardTitle>
        <CardDescription>
          Add missing columns needed for admin approval workflow and user status tracking
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          This migration will add the following columns if they don't exist:
        </p>
        <ul className="list-disc pl-5 text-sm space-y-1 mb-4">
          <li>
            <code>is_active</code> to the users table
          </li>
          <li>
            <code>admin_approved</code> to the timesheets table
          </li>
          <li>
            <code>approval_date</code> to the timesheets table
          </li>
          <li>
            <code>approved_by</code> to the timesheets table
          </li>
        </ul>

        {result && result.success && (
          <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-md">
            <p className="font-medium">Migration Successful</p>
            <p className="text-sm">The following columns were added:</p>
            <ul className="list-disc pl-5 text-xs mt-2">
              {result.details.isActiveAdded && <li>is_active to users table</li>}
              {result.details.adminApprovedAdded && <li>admin_approved to timesheets table</li>}
              {result.details.approvalDateAdded && <li>approval_date to timesheets table</li>}
              {result.details.approvedByAdded && <li>approved_by to timesheets table</li>}
              {!result.details.isActiveAdded &&
                !result.details.adminApprovedAdded &&
                !result.details.approvalDateAdded &&
                !result.details.approvedByAdded && <li>All columns already exist</li>}
            </ul>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={runMigration} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Migration...
            </>
          ) : (
            "Add Required Columns"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

