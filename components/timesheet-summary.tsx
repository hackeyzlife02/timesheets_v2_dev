import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface TimesheetSummaryProps {
  regularHours: number
  overtimeHours: number
  doubleTimeHours: number
  totalHours: number
}

export function TimesheetSummary({ regularHours, overtimeHours, doubleTimeHours, totalHours }: TimesheetSummaryProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Hours Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Regular Hours</p>
            <p className="text-2xl font-bold">{regularHours.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Overtime (1.5x)</p>
            <p className="text-2xl font-bold text-amber-600">{overtimeHours.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Double Time (2x)</p>
            <p className="text-2xl font-bold text-red-600">{doubleTimeHours.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Hours</p>
            <p className="text-2xl font-bold">{totalHours.toFixed(2)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

