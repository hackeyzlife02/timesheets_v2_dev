"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { AlertCircle } from "lucide-react"

interface MissingTimesheetsCardProps {
  count: number
}

export function MissingTimesheetsCard({ count }: MissingTimesheetsCardProps) {
  const router = useRouter()

  if (count === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          Missing Timesheets
        </CardTitle>
        <CardDescription>Employees with missing timesheets</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{count}</div>
        <p className="text-sm text-muted-foreground">
          {count} employee{count !== 1 ? "s" : ""} missing timesheets
        </p>
        <Button
          className="mt-4 w-full bg-red-600 hover:bg-red-700"
          onClick={() => router.push("/admin/missing-timesheets")}
        >
          View Missing Timesheets
        </Button>
      </CardContent>
    </Card>
  )
}

