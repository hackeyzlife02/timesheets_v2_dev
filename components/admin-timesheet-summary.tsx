import { Card, CardContent } from "@/components/ui/card"

interface AdminTimesheetSummaryProps {
  regularHours: number
  overtimeHours: number
  doubleTimeHours: number
  employeeType: string
  weeklySalary?: number
}

export function AdminTimesheetSummary({
  regularHours,
  overtimeHours,
  doubleTimeHours,
  employeeType,
  weeklySalary = 0,
}: AdminTimesheetSummaryProps) {
  const totalHours = regularHours + overtimeHours + doubleTimeHours

  return (
    <Card>
      <CardContent className="p-6">
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

        {employeeType === "salary" && (
          <div className="mt-4 p-4 bg-blue-50 rounded-md">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-blue-800 font-medium">Salaried Employee</p>
                <p className="text-xs text-blue-700">Hours tracked for record-keeping only</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-800 font-medium">Weekly Salary</p>
                <p className="text-xl font-bold text-blue-900">${weeklySalary.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

