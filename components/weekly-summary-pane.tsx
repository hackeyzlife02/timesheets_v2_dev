"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2, DollarSign } from "lucide-react"

interface WeeklySummaryPaneProps {
  timesheet: any
  onSummaryUpdate: (updatedSummary: any) => void
  onExpensesUpdate: (updatedExpenses: any[]) => void
  isReadOnly?: boolean
}

export function WeeklySummaryPane({
  timesheet,
  onSummaryUpdate,
  onExpensesUpdate,
  isReadOnly = false,
}: WeeklySummaryPaneProps) {
  const [summary, setSummary] = useState({
    sfHours: 0,
    outOfTownHours: 0,
    sickHours: 0,
    holidayHours: 0,
    vacationHours: 0,
    totalRegularHours: 0,
    totalOvertimeHours: 0,
    totalDoubleTimeHours: 0,
    adminNotes: "",
  })

  const [expenses, setExpenses] = useState<any[]>([])

  // Calculate summary from days data
  useEffect(() => {
    if (!timesheet || !timesheet.days) return

    let sfHours = 0
    let outOfTownHours = 0
    let sickHours = 0
    let holidayHours = 0
    let vacationHours = 0

    // Get existing values from timesheet if available
    const existingSummary = {
      sfHours: timesheet.sfHours || 0,
      outOfTownHours: timesheet.outOfTownHours || 0,
      sickHours: timesheet.sickHours || 0,
      holidayHours: timesheet.holidayHours || 0,
      vacationHours: timesheet.vacationHours || 0,
      adminNotes: timesheet.adminNotes || "",
    }

    // Calculate totals from days
    Object.values(timesheet.days).forEach((day: any) => {
      const regularHours = Number.parseFloat(day.totalRegularHours) || 0
      const overtimeHours = Number.parseFloat(day.totalOvertimeHours) || 0
      const doubleTimeHours = Number.parseFloat(day.totalDoubleTimeHours) || 0
      const totalDayHours = regularHours + overtimeHours + doubleTimeHours

      // If we have location data, use it
      if (day.location) {
        if (day.location === "sf") {
          sfHours += totalDayHours
        } else if (day.location === "out_of_town") {
          outOfTownHours += totalDayHours
        }
      } else {
        // Default to SF if no location specified
        sfHours += totalDayHours
      }

      // Calculate time off hours
      if (day.timeOffType === "sick") {
        sickHours += totalDayHours
      } else if (day.timeOffType === "holiday") {
        holidayHours += totalDayHours
      } else if (day.timeOffType === "vacation") {
        vacationHours += totalDayHours
      }
    })

    // If we have calculated values, use them, otherwise use existing values
    setSummary({
      sfHours: sfHours > 0 ? sfHours : existingSummary.sfHours,
      outOfTownHours: outOfTownHours > 0 ? outOfTownHours : existingSummary.outOfTownHours,
      sickHours: sickHours > 0 ? sickHours : existingSummary.sickHours,
      holidayHours: holidayHours > 0 ? holidayHours : existingSummary.holidayHours,
      vacationHours: vacationHours > 0 ? vacationHours : existingSummary.vacationHours,
      totalRegularHours: Number.parseFloat(timesheet.totalRegularHours) || 0,
      totalOvertimeHours: Number.parseFloat(timesheet.totalOvertimeHours) || 0,
      totalDoubleTimeHours: Number.parseFloat(timesheet.totalDoubleTimeHours) || 0,
      adminNotes: existingSummary.adminNotes,
    })

    // Set expenses
    setExpenses(timesheet.expenses || [])
  }, [timesheet])

  const handleSummaryChange = (field: string, value: any) => {
    if (isReadOnly) return

    const updatedSummary = {
      ...summary,
      [field]: value,
    }

    setSummary(updatedSummary)
    onSummaryUpdate(updatedSummary)
  }

  const addExpense = () => {
    if (isReadOnly) return

    const newExpense = {
      id: Date.now(),
      description: "",
      amount: 0,
    }

    const updatedExpenses = [...expenses, newExpense]
    setExpenses(updatedExpenses)
    onExpensesUpdate(updatedExpenses)
  }

  const updateExpense = (id: number, field: string, value: any) => {
    if (isReadOnly) return

    const updatedExpenses = expenses.map((expense) => {
      if (expense.id === id) {
        return {
          ...expense,
          [field]: value,
        }
      }
      return expense
    })

    setExpenses(updatedExpenses)
    onExpensesUpdate(updatedExpenses)
  }

  const removeExpense = (id: number) => {
    if (isReadOnly) return

    const updatedExpenses = expenses.filter((expense) => expense.id !== id)
    setExpenses(updatedExpenses)
    onExpensesUpdate(updatedExpenses)
  }

  // Calculate total hours
  const totalHours =
    Number.parseFloat(summary.totalRegularHours.toString()) +
    Number.parseFloat(summary.totalOvertimeHours.toString()) +
    Number.parseFloat(summary.totalDoubleTimeHours.toString())

  // Calculate total expenses
  const totalExpenses = expenses.reduce(
    (total, expense) => total + Number.parseFloat(expense.amount.toString() || "0"),
    0,
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Weekly Hours Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <Label htmlFor="sfHours">San Francisco Hours</Label>
              <Input
                id="sfHours"
                type="number"
                min="0"
                step="0.25"
                value={summary.sfHours}
                onChange={(e) => handleSummaryChange("sfHours", Number.parseFloat(e.target.value) || 0)}
                disabled={isReadOnly}
              />
            </div>
            <div>
              <Label htmlFor="outOfTownHours">Out of Town Hours</Label>
              <Input
                id="outOfTownHours"
                type="number"
                min="0"
                step="0.25"
                value={summary.outOfTownHours}
                onChange={(e) => handleSummaryChange("outOfTownHours", Number.parseFloat(e.target.value) || 0)}
                disabled={isReadOnly}
              />
            </div>
            <div>
              <Label htmlFor="totalHours">Total Hours</Label>
              <Input id="totalHours" type="number" value={totalHours.toFixed(2)} disabled className="bg-muted" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <Label htmlFor="totalRegularHours">Regular Hours</Label>
              <Input
                id="totalRegularHours"
                type="number"
                min="0"
                step="0.25"
                value={summary.totalRegularHours}
                onChange={(e) => handleSummaryChange("totalRegularHours", Number.parseFloat(e.target.value) || 0)}
                disabled={isReadOnly}
              />
            </div>
            <div>
              <Label htmlFor="totalOvertimeHours">Overtime Hours</Label>
              <Input
                id="totalOvertimeHours"
                type="number"
                min="0"
                step="0.25"
                value={summary.totalOvertimeHours}
                onChange={(e) => handleSummaryChange("totalOvertimeHours", Number.parseFloat(e.target.value) || 0)}
                disabled={isReadOnly}
              />
            </div>
            <div>
              <Label htmlFor="totalDoubleTimeHours">Double Time Hours</Label>
              <Input
                id="totalDoubleTimeHours"
                type="number"
                min="0"
                step="0.25"
                value={summary.totalDoubleTimeHours}
                onChange={(e) => handleSummaryChange("totalDoubleTimeHours", Number.parseFloat(e.target.value) || 0)}
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="sickHours">Sick Hours</Label>
              <Input
                id="sickHours"
                type="number"
                min="0"
                step="0.25"
                value={summary.sickHours}
                onChange={(e) => handleSummaryChange("sickHours", Number.parseFloat(e.target.value) || 0)}
                disabled={isReadOnly}
              />
            </div>
            <div>
              <Label htmlFor="holidayHours">Holiday Hours</Label>
              <Input
                id="holidayHours"
                type="number"
                min="0"
                step="0.25"
                value={summary.holidayHours}
                onChange={(e) => handleSummaryChange("holidayHours", Number.parseFloat(e.target.value) || 0)}
                disabled={isReadOnly}
              />
            </div>
            <div>
              <Label htmlFor="vacationHours">Vacation Hours</Label>
              <Input
                id="vacationHours"
                type="number"
                min="0"
                step="0.25"
                value={summary.vacationHours}
                onChange={(e) => handleSummaryChange("vacationHours", Number.parseFloat(e.target.value) || 0)}
                disabled={isReadOnly}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Expenses</CardTitle>
          {!isReadOnly && (
            <Button variant="outline" size="sm" onClick={addExpense}>
              <Plus className="h-4 w-4 mr-1" />
              Add Expense
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">No expenses recorded</div>
          ) : (
            <div className="space-y-4">
              {expenses.map((expense, index) => (
                <div key={expense.id} className="flex items-start gap-3">
                  <div className="flex-1">
                    <Label htmlFor={`expense-desc-${expense.id}`} className="sr-only">
                      Description
                    </Label>
                    <Input
                      id={`expense-desc-${expense.id}`}
                      placeholder="Description"
                      value={expense.description}
                      onChange={(e) => updateExpense(expense.id, "description", e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="w-24">
                    <Label htmlFor={`expense-amount-${expense.id}`} className="sr-only">
                      Amount
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id={`expense-amount-${expense.id}`}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-8"
                        value={expense.amount}
                        onChange={(e) => updateExpense(expense.id, "amount", Number.parseFloat(e.target.value) || 0)}
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>
                  {!isReadOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeExpense(expense.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  )}
                </div>
              ))}

              <Separator className="my-2" />

              <div className="flex justify-between items-center">
                <span className="font-medium">Total Expenses</span>
                <span className="font-bold">${totalExpenses.toFixed(2)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admin Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Add notes about this timesheet (only visible to admins)"
            value={summary.adminNotes}
            onChange={(e) => handleSummaryChange("adminNotes", e.target.value)}
            className="min-h-[100px]"
            disabled={isReadOnly}
          />
        </CardContent>
      </Card>
    </div>
  )
}

