"use client"

import { useState, useEffect } from "react"
import type { TimesheetDay } from "@/types"
import { TimeInput } from "./time-input"
import { calculateBreakDuration, shouldDeductBreak } from "@/lib/timesheet-calculations"

interface DailyEntryFormProps {
  day: TimesheetDay
  onChange: (updatedDay: TimesheetDay) => void
  dayIndex: number
}

export function DailyEntryForm({ day, onChange, dayIndex }: DailyEntryFormProps) {
  const [amBreakDuration, setAmBreakDuration] = useState<number>(0)
  const [pmBreakDuration, setPmBreakDuration] = useState<number>(0)
  const [lunchBreakDuration, setLunchBreakDuration] = useState<number>(0)
  const [amBreakDeducted, setAmBreakDeducted] = useState<boolean>(false)
  const [pmBreakDeducted, setPmBreakDeducted] = useState<boolean>(false)

  // Update break durations when times change
  useEffect(() => {
    setAmBreakDuration(calculateBreakDuration(day.amBreakStart, day.amBreakEnd))
    setPmBreakDuration(calculateBreakDuration(day.pmBreakStart, day.pmBreakEnd))
    setLunchBreakDuration(calculateBreakDuration(day.lunchBreakStart, day.lunchBreakEnd))

    setAmBreakDeducted(shouldDeductBreak(day.amBreakStart, day.amBreakEnd))
    setPmBreakDeducted(shouldDeductBreak(day.pmBreakStart, day.pmBreakEnd))
  }, [day])

  const handleTimeChange = (field: keyof TimesheetDay, value: string) => {
    onChange({
      ...day,
      [field]: value,
    })
  }

  return (
    <div className="border rounded-lg p-4 mb-6">
      <h3 className="text-xl font-semibold mb-4">{day.date}</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h4 className="text-lg font-medium mb-2">Work Hours</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <TimeInput value={day.startTime || ""} onChange={(value) => handleTimeChange("startTime", value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <TimeInput value={day.endTime || ""} onChange={(value) => handleTimeChange("endTime", value)} />
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-lg font-medium mb-2">Lunch Break</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <TimeInput
                value={day.lunchBreakStart || ""}
                onChange={(value) => handleTimeChange("lunchBreakStart", value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <TimeInput
                value={day.lunchBreakEnd || ""}
                onChange={(value) => handleTimeChange("lunchBreakEnd", value)}
              />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-600">Duration: {lunchBreakDuration} minutes (Always deducted)</span>
          </div>
        </div>
      </div>

      <hr className="my-4" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-lg font-medium mb-2">AM Break</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <TimeInput value={day.amBreakStart || ""} onChange={(value) => handleTimeChange("amBreakStart", value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <TimeInput value={day.amBreakEnd || ""} onChange={(value) => handleTimeChange("amBreakEnd", value)} />
            </div>
          </div>
          <div className="mt-2 flex items-center">
            <span className="text-sm mr-4">Duration: {amBreakDuration} minutes</span>
            <span
              className={`text-sm px-3 py-1 rounded-full ${amBreakDeducted ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}
            >
              {amBreakDeducted ? "Deducted" : "Not Deducted"}
            </span>
          </div>
          <div className="mt-1">
            <span className="text-sm text-gray-600">
              {amBreakDeducted
                ? "Exceeds 10 minutes - deducted from hours worked"
                : "Within 10 minutes - not deducted from hours worked"}
            </span>
          </div>
        </div>

        <div>
          <h4 className="text-lg font-medium mb-2">PM Break</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <TimeInput value={day.pmBreakStart || ""} onChange={(value) => handleTimeChange("pmBreakStart", value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <TimeInput value={day.pmBreakEnd || ""} onChange={(value) => handleTimeChange("pmBreakEnd", value)} />
            </div>
          </div>
          <div className="mt-2 flex items-center">
            <span className="text-sm mr-4">Duration: {pmBreakDuration} minutes</span>
            <span
              className={`text-sm px-3 py-1 rounded-full ${pmBreakDeducted ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}
            >
              {pmBreakDeducted ? "Deducted" : "Not Deducted"}
            </span>
          </div>
          <div className="mt-1">
            <span className="text-sm text-gray-600">
              {pmBreakDeducted
                ? "Exceeds 10 minutes - deducted from hours worked"
                : "Within 10 minutes - not deducted from hours worked"}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

