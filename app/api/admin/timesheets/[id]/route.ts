import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    console.log(`Fetching timesheet with ID: ${id} for admin review`)

    // Check if required columns exist
    const columnsExist = {
      adminApproved: false,
      employeeType: false,
      weeklySalary: false,
      sfHours: false,
      outOfTownHours: false,
      sickHours: false,
      holidayHours: false,
      vacationHours: false,
      adminNotes: false,
      lastUpdatedBy: false,
      location: false,
      timeOffType: false,
      status: false,
      expenses: false,
    }

    try {
      // Check timesheet columns
      const checkTimesheetColumns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'timesheets' 
        AND column_name IN (
          'admin_approved', 'sf_hours', 'out_of_town_hours', 
          'sick_hours', 'holiday_hours', 'vacation_hours', 
          'admin_notes', 'last_updated_by'
        )
      `

      if (checkTimesheetColumns && checkTimesheetColumns.length > 0) {
        for (const row of checkTimesheetColumns) {
          if (row.column_name === "admin_approved") columnsExist.adminApproved = true
          if (row.column_name === "sf_hours") columnsExist.sfHours = true
          if (row.column_name === "out_of_town_hours") columnsExist.outOfTownHours = true
          if (row.column_name === "sick_hours") columnsExist.sickHours = true
          if (row.column_name === "holiday_hours") columnsExist.holidayHours = true
          if (row.column_name === "vacation_hours") columnsExist.vacationHours = true
          if (row.column_name === "admin_notes") columnsExist.adminNotes = true
          if (row.column_name === "last_updated_by") columnsExist.lastUpdatedBy = true
        }
      }

      // Check user columns
      const checkUserColumns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name IN ('employee_type', 'weekly_salary')
      `

      if (checkUserColumns && checkUserColumns.length > 0) {
        for (const row of checkUserColumns) {
          if (row.column_name === "employee_type") columnsExist.employeeType = true
          if (row.column_name === "weekly_salary") columnsExist.weeklySalary = true
        }
      }

      // Check timesheet_days columns
      const checkDaysColumns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'timesheet_days' 
        AND column_name IN ('location', 'time_off_type', 'status')
      `

      if (checkDaysColumns && checkDaysColumns.length > 0) {
        for (const row of checkDaysColumns) {
          if (row.column_name === "location") columnsExist.location = true
          if (row.column_name === "time_off_type") columnsExist.timeOffType = true
          if (row.column_name === "status") columnsExist.status = true
        }
      }

      // Check if expenses table exists
      const checkExpensesTable = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'timesheet_expenses'
        ) as "exists"
      `

      columnsExist.expenses = checkExpensesTable[0]?.exists || false

      console.log("Columns exist:", columnsExist)
    } catch (error) {
      console.error("Error checking for columns:", error)
    }

    // Build the query based on which columns exist
    let timesheetFields = `
      t.id,
      t.user_id as "userId",
      t.week_start_date as "weekStartDate",
      t.status,
      t.certified,
      t.submission_date as "submissionDate",
      t.total_regular_hours as "totalRegularHours",
      t.total_overtime_hours as "totalOvertimeHours",
      t.total_double_time_hours as "totalDoubleTimeHours",
      t.created_at as "createdAt",
      t.updated_at as "updatedAt",
      u.full_name as "employeeName",
      u.email as "employeeEmail"
    `

    if (columnsExist.adminApproved) {
      timesheetFields += `,
        t.admin_approved as "adminApproved",
        t.approval_date as "approvalDate",
        t.approved_by as "approvedBy"
      `
    }

    if (columnsExist.employeeType) {
      timesheetFields += `,
        u.employee_type as "employeeType"
      `
    }

    if (columnsExist.weeklySalary) {
      timesheetFields += `,
        u.weekly_salary as "weeklySalary"
      `
    }

    if (columnsExist.sfHours) {
      timesheetFields += `,
        t.sf_hours as "sfHours"
      `
    }

    if (columnsExist.outOfTownHours) {
      timesheetFields += `,
        t.out_of_town_hours as "outOfTownHours"
      `
    }

    if (columnsExist.sickHours) {
      timesheetFields += `,
        t.sick_hours as "sickHours"
      `
    }

    if (columnsExist.holidayHours) {
      timesheetFields += `,
        t.holiday_hours as "holidayHours"
      `
    }

    if (columnsExist.vacationHours) {
      timesheetFields += `,
        t.vacation_hours as "vacationHours"
      `
    }

    if (columnsExist.adminNotes) {
      timesheetFields += `,
        t.admin_notes as "adminNotes"
      `
    }

    if (columnsExist.lastUpdatedBy) {
      timesheetFields += `,
        t.last_updated_by as "lastUpdatedBy"
      `
    }

    const timesheetQuery = `
      SELECT ${timesheetFields}
      FROM timesheets t
      JOIN users u ON t.user_id = u.id
      WHERE t.id = $1
    `

    const timesheetResult = await sql.unsafe(timesheetQuery, [id])
    console.log("Timesheet query result:", timesheetResult)

    if (!timesheetResult || timesheetResult.length === 0) {
      return NextResponse.json({ success: false, message: "Timesheet not found" }, { status: 404 })
    }

    const timesheet = timesheetResult[0]

    // Get the timesheet days
    let daysFields = `
      id,
      day_name as "dayName",
      did_not_work as "didNotWork",
      time_in as "timeIn",
      time_out as "timeOut",
      meal_break_start as "mealBreakStart",
      meal_break_end as "mealBreakEnd",
      am_break_start as "amBreakStart",
      am_break_end as "amBreakEnd",
      pm_break_start as "pmBreakStart",
      pm_break_end as "pmBreakEnd",
      out_of_town_hours as "outOfTownHours",
      out_of_town_minutes as "outOfTownMinutes",
      reasons,
      total_regular_hours as "totalRegularHours",
      total_overtime_hours as "totalOvertimeHours",
      total_double_time_hours as "totalDoubleTimeHours",
      is_seventh_consecutive_day as "isSeventhConsecutiveDay"
    `

    if (columnsExist.location) {
      daysFields += `,
        location
      `
    }

    if (columnsExist.timeOffType) {
      daysFields += `,
        time_off_type as "timeOffType"
      `
    }

    if (columnsExist.status) {
      daysFields += `,
        status
      `
    }

    const daysQuery = `
      SELECT ${daysFields}
      FROM timesheet_days
      WHERE timesheet_id = $1
    `

    const daysResult = await sql.unsafe(daysQuery, [id])
    console.log("Days query result:", daysResult)

    // Convert days array to object with day names as keys
    const days: { [key: string]: any } = {}

    if (daysResult && daysResult.length > 0) {
      for (const day of daysResult) {
        days[day.dayName] = {
          didNotWork: day.didNotWork,
          timeIn: day.timeIn || "",
          timeOut: day.timeOut || "",
          mealBreakStart: day.mealBreakStart || "",
          mealBreakEnd: day.mealBreakEnd || "",
          amBreakStart: day.amBreakStart || "",
          amBreakEnd: day.amBreakEnd || "",
          pmBreakStart: day.pmBreakStart || "",
          pmBreakEnd: day.pmBreakEnd || "",
          outOfTownHours: day.outOfTownHours || 0,
          outOfTownMinutes: day.outOfTownMinutes || 0,
          reasons: day.reasons || "",
          notes: day.reasons || "",
          totalRegularHours: day.totalRegularHours || 0,
          totalOvertimeHours: day.totalOvertimeHours || 0,
          totalDoubleTimeHours: day.totalDoubleTimeHours || 0,
          isSeventhConsecutiveDay: day.isSeventhConsecutiveDay || false,
          location: day.location || "sf",
          timeOffType: day.timeOffType || "",
          status: day.status || "normal",
        }
      }
    }

    // Get expenses if the table exists
    let expenses: any[] = []
    if (columnsExist.expenses) {
      try {
        const expensesResult = await sql`
          SELECT 
            id,
            description,
            amount,
            created_at as "createdAt"
          FROM timesheet_expenses
          WHERE timesheet_id = ${id}
          ORDER BY created_at
        `

        expenses = expensesResult || []
      } catch (error) {
        console.error("Error fetching expenses:", error)
      }
    }

    // Add default values for missing fields
    const timesheetWithDefaults = {
      ...timesheet,
      adminApproved: timesheet.adminApproved || false,
      approvalDate: timesheet.approvalDate || null,
      approvedBy: timesheet.approvedBy || null,
      employeeType: timesheet.employeeType || "hourly",
      weeklySalary: timesheet.weeklySalary || 0,
      sfHours: timesheet.sfHours || 0,
      outOfTownHours: timesheet.outOfTownHours || 0,
      sickHours: timesheet.sickHours || 0,
      holidayHours: timesheet.holidayHours || 0,
      vacationHours: timesheet.vacationHours || 0,
      adminNotes: timesheet.adminNotes || "",
      lastUpdatedBy: timesheet.lastUpdatedBy || null,
      expenses,
    }

    // Return the timesheet with days
    return NextResponse.json({
      success: true,
      data: {
        ...timesheetWithDefaults,
        days,
      },
    })
  } catch (error) {
    console.error("Error fetching timesheet for admin review:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch timesheet: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 },
    )
  }
}

