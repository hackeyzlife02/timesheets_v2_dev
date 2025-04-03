"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { getStartOfWeek } from "@/lib/date-utils"

interface WeekSelectorProps {
  currentWeek: Date
  onWeekChange: (date: Date) => void
}

export function WeekSelector({ currentWeek, onWeekChange }: WeekSelectorProps) {
  const goToPreviousWeek = () => {
    const prevWeek = new Date(currentWeek)
    prevWeek.setDate(prevWeek.getDate() - 7)
    onWeekChange(prevWeek)
  }

  const goToNextWeek = () => {
    const nextWeek = new Date(currentWeek)
    nextWeek.setDate(nextWeek.getDate() + 7)
    onWeekChange(nextWeek)
  }

  const goToCurrentWeek = () => {
    onWeekChange(getStartOfWeek())
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Previous Week</span>
      </Button>

      <Button variant="outline" onClick={goToCurrentWeek}>
        <Calendar className="h-4 w-4 mr-2" />
        Current Week
      </Button>

      <Button variant="outline" size="icon" onClick={goToNextWeek}>
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Next Week</span>
      </Button>
    </div>
  )
}

