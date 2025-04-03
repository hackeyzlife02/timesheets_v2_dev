"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { TimeInput } from "@/components/time-input"

interface DailyReviewPaneProps {
  days: Record<string, any>
  onDayUpdate: (dayName: string, updatedDay: any) => void
  isReadOnly?: boolean
}

export function DailyReviewPane({ days, onDayUpdate, isReadOnly = false }: DailyReviewPaneProps) {
  // Day names in order
  const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

  // Status options for flagging days
  const statusOptions = [
    { value: "normal", label: "Normal", color: "bg-green-100 text-green-800 border-green-200" },
    { value: "warning", label: "Warning", color: "bg-amber-100 text-amber-800 border-amber-200" },
    { value: "issue", label: "Issue", color: "bg-red-100 text-red-800 border-red-200" },
    { value: "info", label: "Info", color: "bg-blue-100 text-blue-800 border-blue-200" },
  ]

  // Time off types
  const timeOffTypes = [
    { value: "", label: "None" },
    { value: "sick", label: "Sick" },
    { value: "vacation", label: "Vacation" },
    { value: "holiday", label: "Holiday" },
  ]

  // Location options
  const locationOptions = [
    { value: "sf", label: "San Francisco" },
    { value: "out_of_town", label: "Out of Town" },
  ]

  const handleInputChange = (dayName: string, field: string, value: any) => {
    if (isReadOnly) return

    onDayUpdate(dayName, {
      ...days[dayName],
      [field]: value,
    })
  }

  const getStatusColor = (status: string) => {
    const statusOption = statusOptions.find((option) => option.value === status)
    return statusOption ? statusOption.color : "bg-gray-100 text-gray-800 border-gray-200"
  }

  return (
    <div className="space-y-6">
      {dayOrder.map((dayName) => {
        const day = days[dayName] || {}

        return (
          <Card
            key={dayName}
            className={`overflow-hidden ${day.status && day.status !== "normal" ? "border-l-4 " + (day.status === "warning" ? "border-l-amber-500" : day.status === "issue" ? "border-l-red-500" : "border-l-blue-500") : ""}`}
          >
            <CardHeader className="bg-muted/10 py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium capitalize">{dayName}</CardTitle>
                <div className="flex items-center gap-2">
                  {!isReadOnly && (
                    <Select
                      value={day.status || "normal"}
                      onValueChange={(value) => handleInputChange(dayName, "status", value)}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center">
                              <div
                                className={`w-2 h-2 rounded-full mr-2 ${option.value === "normal" ? "bg-green-500" : option.value === "warning" ? "bg-amber-500" : option.value === "issue" ? "bg-red-500" : "bg-blue-500"}`}
                              ></div>
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {day.status && (
                    <Badge variant="outline" className={getStatusColor(day.status)}>
                      {statusOptions.find((option) => option.value === day.status)?.label || "Normal"}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`${dayName}-didNotWork`} className="flex items-center space-x-2 mb-4">
                      <Switch
                        id={`${dayName}-didNotWork`}
                        checked={day.didNotWork || false}
                        onCheckedChange={(checked) => handleInputChange(dayName, "didNotWork", checked)}
                        disabled={isReadOnly}
                      />
                      <span>Did Not Work</span>
                    </Label>

                    {!day.didNotWork && (
                      <>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <Label htmlFor={`${dayName}-timeIn`}>Time In</Label>
                            <TimeInput
                              id={`${dayName}-timeIn`}
                              value={day.timeIn || ""}
                              onChange={(value) => handleInputChange(dayName, "timeIn", value)}
                              disabled={isReadOnly}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`${dayName}-timeOut`}>Time Out</Label>
                            <TimeInput
                              id={`${dayName}-timeOut`}
                              value={day.timeOut || ""}
                              onChange={(value) => handleInputChange(dayName, "timeOut", value)}
                              disabled={isReadOnly}
                            />
                          </div>
                        </div>

                        <div className="mb-4">
                          <Label htmlFor={`${dayName}-location`}>Location</Label>
                          <Select
                            value={day.location || "sf"}
                            onValueChange={(value) => handleInputChange(dayName, "location", value)}
                            disabled={isReadOnly}
                          >
                            <SelectTrigger id={`${dayName}-location`}>
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                            <SelectContent>
                              {locationOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    <div>
                      <Label htmlFor={`${dayName}-timeOffType`}>Time Off Type</Label>
                      <Select
                        value={day.timeOffType || ""}
                        onValueChange={(value) => handleInputChange(dayName, "timeOffType", value)}
                        disabled={isReadOnly}
                      >
                        <SelectTrigger id={`${dayName}-timeOffType`}>
                          <SelectValue placeholder="Select time off type" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOffTypes.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <div className="mb-4">
                      <Label htmlFor={`${dayName}-hours`}>Hours Summary</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div>
                          <Label htmlFor={`${dayName}-regularHours`} className="text-xs">
                            Regular
                          </Label>
                          <Input
                            id={`${dayName}-regularHours`}
                            type="number"
                            min="0"
                            step="0.25"
                            value={day.totalRegularHours || 0}
                            onChange={(e) =>
                              handleInputChange(dayName, "totalRegularHours", Number.parseFloat(e.target.value) || 0)
                            }
                            disabled={isReadOnly}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`${dayName}-overtimeHours`} className="text-xs">
                            Overtime
                          </Label>
                          <Input
                            id={`${dayName}-overtimeHours`}
                            type="number"
                            min="0"
                            step="0.25"
                            value={day.totalOvertimeHours || 0}
                            onChange={(e) =>
                              handleInputChange(dayName, "totalOvertimeHours", Number.parseFloat(e.target.value) || 0)
                            }
                            disabled={isReadOnly}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`${dayName}-doubleTimeHours`} className="text-xs">
                            Double
                          </Label>
                          <Input
                            id={`${dayName}-doubleTimeHours`}
                            type="number"
                            min="0"
                            step="0.25"
                            value={day.totalDoubleTimeHours || 0}
                            onChange={(e) =>
                              handleInputChange(dayName, "totalDoubleTimeHours", Number.parseFloat(e.target.value) || 0)
                            }
                            disabled={isReadOnly}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor={`${dayName}-notes`}>Notes</Label>
                      <Textarea
                        id={`${dayName}-notes`}
                        placeholder="Employee notes or admin comments"
                        value={day.notes || day.reasons || ""}
                        onChange={(e) => handleInputChange(dayName, "notes", e.target.value)}
                        className="h-[100px]"
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

