"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { ChevronUp, ChevronDown } from "lucide-react"

interface WeeklyTotalsBannerProps {
  regularHours: number
  overtimeHours: number
  doubleTimeHours: number
  totalHours: number
  daysWorked?: number // Add days worked prop
}

export function WeeklyTotalsBanner({
  regularHours,
  overtimeHours,
  doubleTimeHours,
  totalHours,
  daysWorked = 0, // Default to 0 if not provided
}: WeeklyTotalsBannerProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  // Add scroll event listener to detect when to show the banner
  useEffect(() => {
    // Show banner immediately for testing
    setIsScrolled(true)

    const handleScroll = () => {
      // Lower the threshold to make it appear sooner
      // Show the banner after scrolling down just a little bit (50px)
      setIsScrolled(window.scrollY > 50)

      // Auto-collapse when scrolling
      if (isExpanded && window.scrollY > 100) {
        setIsExpanded(false)
      }
    }

    // Add the event listener
    window.addEventListener("scroll", handleScroll)

    // Call it once to check initial scroll position
    handleScroll()

    // Cleanup
    return () => window.removeEventListener("scroll", handleScroll)
  }, [isExpanded])

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  // Always render the component, but control visibility with CSS
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[100] pb-safe transition-all duration-300",
        isScrolled ? "translate-y-0" : "translate-y-full",
      )}
    >
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

