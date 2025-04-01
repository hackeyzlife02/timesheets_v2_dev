"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface BreakTimeEntryProps {
  dayName: string
  breakType: "meal" | "am" | "pm"
  startTime: string
  endTime: string
  duration: number
  onStartTimeChange: (value: string) => void
  onEndTimeChange: (value: string) => void
  disabled?: boolean
}

export function BreakTimeEntry({
  dayName,
  breakType,
  startTime,
  endTime,
  duration,
  onStartTimeChange,
  onEndTimeChange,
  disabled = false,
}: BreakTimeEntryProps) {
  const breakTitle = {
    meal: "Meal Break",
    am: "AM Break",
    pm: "PM Break",
  }[breakType]

  const idPrefix = `${dayName.toLowerCase()}-${breakType}-break`

  // Determine if this break affects hours worked
  const affectsHoursWorked = breakType === "meal" || (breakType !== "meal" && duration > 10)

  // Get status message
  const getStatusMessage = () => {
    if (breakType === "meal") {
      return "Always deducted from hours worked"
    } else if (duration > 10) {
      return "Exceeds 10 minutes - will be deducted from hours worked"
    } else if (duration > 0) {
      return "Within 10 minutes - not deducted from hours worked"
    }
    return ""
  }

  return (
    <div className="border-t pt-4">
      <h4 className="font-medium mb-2">{breakTitle}</h4>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-start`}>Start Time</Label>
          <Input
            id={`${idPrefix}-start`}
            type="time"
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-end`}>End Time</Label>
          <Input
            id={`${idPrefix}-end`}
            type="time"
            value={endTime}
            onChange={(e) => onEndTimeChange(e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label>Duration</Label>
          <div className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm flex items-center justify-between">
            <span>{duration} minutes</span>
            {duration > 0 && (
              <Badge variant={affectsHoursWorked ? "destructive" : "outline"} className="ml-2 text-xs">
                {breakType !== "meal" && duration <= 10 ? "Not Deducted" : "Deducted"}
              </Badge>
            )}
          </div>
        </div>

        {duration > 0 && (
          <div className="space-y-2 lg:col-span-4">
            <p className="text-xs text-muted-foreground">{getStatusMessage()}</p>
          </div>
        )}
      </div>
    </div>
  )
}

