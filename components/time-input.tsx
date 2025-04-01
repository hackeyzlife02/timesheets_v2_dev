"use client"

import type React from "react"

import { useState, useEffect } from "react"

interface TimeInputProps {
  value: string
  onChange: (value: string) => void
}

export function TimeInput({ value, onChange }: TimeInputProps) {
  const [hours, setHours] = useState<string>("")
  const [minutes, setMinutes] = useState<string>("")
  const [period, setPeriod] = useState<"AM" | "PM">("AM")

  // Parse the input value when it changes
  useEffect(() => {
    if (!value) {
      setHours("")
      setMinutes("")
      setPeriod("AM")
      return
    }

    try {
      // Parse the time string (format: HH:MM:SS or HH:MM)
      const timeParts = value.split(":")
      let hourValue = Number.parseInt(timeParts[0], 10)
      const minuteValue = Number.parseInt(timeParts[1], 10)

      // Determine AM/PM
      let periodValue: "AM" | "PM" = "AM"
      if (hourValue >= 12) {
        periodValue = "PM"
        if (hourValue > 12) {
          hourValue -= 12
        }
      }
      if (hourValue === 0) {
        hourValue = 12
      }

      setHours(hourValue.toString())
      setMinutes(minuteValue.toString().padStart(2, "0"))
      setPeriod(periodValue)
    } catch (error) {
      console.error("Error parsing time:", error)
    }
  }, [value])

  // Update the parent component when any part changes
  const updateTime = (newHours: string, newMinutes: string, newPeriod: "AM" | "PM") => {
    if (!newHours || !newMinutes) return

    let hourValue = Number.parseInt(newHours, 10)

    // Convert to 24-hour format
    if (newPeriod === "PM" && hourValue < 12) {
      hourValue += 12
    } else if (newPeriod === "AM" && hourValue === 12) {
      hourValue = 0
    }

    // Format as HH:MM:00 (with seconds always set to 00)
    const formattedTime = `${hourValue.toString().padStart(2, "0")}:${newMinutes.padStart(2, "0")}:00`
    onChange(formattedTime)
  }

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHours = e.target.value
    if (newHours === "" || (Number.parseInt(newHours, 10) >= 1 && Number.parseInt(newHours, 10) <= 12)) {
      setHours(newHours)
      if (newHours && minutes) {
        updateTime(newHours, minutes, period)
      }
    }
  }

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMinutes = e.target.value
    if (newMinutes === "" || (Number.parseInt(newMinutes, 10) >= 0 && Number.parseInt(newMinutes, 10) <= 59)) {
      setMinutes(newMinutes)
      if (hours && newMinutes) {
        updateTime(hours, newMinutes, period)
      }
    }
  }

  const handlePeriodChange = (newPeriod: "AM" | "PM") => {
    setPeriod(newPeriod)
    if (hours && minutes) {
      updateTime(hours, minutes, newPeriod)
    }
  }

  return (
    <div className="flex items-center space-x-1">
      <input
        type="text"
        value={hours}
        onChange={handleHoursChange}
        placeholder="HH"
        className="w-12 p-2 border rounded text-center"
        maxLength={2}
      />
      <span>:</span>
      <input
        type="text"
        value={minutes}
        onChange={handleMinutesChange}
        placeholder="MM"
        className="w-12 p-2 border rounded text-center"
        maxLength={2}
      />
      <div className="flex ml-2">
        <button
          type="button"
          onClick={() => handlePeriodChange("AM")}
          className={`px-2 py-1 text-sm ${period === "AM" ? "bg-blue-500 text-white" : "bg-gray-200"} rounded-l`}
        >
          AM
        </button>
        <button
          type="button"
          onClick={() => handlePeriodChange("PM")}
          className={`px-2 py-1 text-sm ${period === "PM" ? "bg-blue-500 text-white" : "bg-gray-200"} rounded-r`}
        >
          PM
        </button>
      </div>
    </div>
  )
}

