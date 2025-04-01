"use client"

import { useState } from "react"
import { ChevronUp, ChevronDown } from "lucide-react"

interface WeeklyTotalsBannerProps {
  regularHours: number
  overtimeHours: number
  doubleTimeHours: number
  totalHours: number
  daysWorked?: number // Add days worked prop
}

export function WeeklyTotalsBannerSimple({
  regularHours,
  overtimeHours,
  doubleTimeHours,
  totalHours,
  daysWorked = 0, // Default to 0 if not provided
}: WeeklyTotalsBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] pb-safe">
      <div className="bg-background/95 backdrop-blur-sm border-t border-border shadow-md">
        {/* Add Weekly Summary text */}
        <div className="px-4 pt-1 pb-0">
          <p className="text-xs text-muted-foreground font-medium">Weekly Summary</p>
        </div>

        {/* Collapsed view - compact summary */}
        <div className="flex items-center justify-between px-4 h-12 cursor-pointer" onClick={toggleExpanded}>
          <div className="flex items-center space-x-4">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Days Worked</span>
              <span className="text-sm font-medium">{daysWorked}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Regular</span>
              <span className="text-sm font-medium">{regularHours.toFixed(2)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">OT (1.5x)</span>
              <span className="text-sm font-medium text-amber-600">{overtimeHours.toFixed(2)}</span>
            </div>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        {/* Expanded view - detailed breakdown */}
        {isExpanded && (
          <div className="px-4 py-2 border-t border-border/50 animate-in slide-in-from-bottom duration-200">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Total Hours</div>
                <div className="font-semibold">{totalHours.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Double Time</div>
                <div className="font-semibold text-red-600">{doubleTimeHours.toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

