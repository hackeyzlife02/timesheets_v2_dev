import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    console.log("Starting migration to add missing columns...")

    // Check if is_active column exists in users table
    const isActiveExists = await checkColumnExists("users", "is_active")
    if (!isActiveExists) {
      console.log("Adding is_active column to users table...")
      await sql`ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;`
      console.log("is_active column added successfully")
    } else {
      console.log("is_active column already exists")
    }

    // Check if admin_approved column exists in timesheets table
    const adminApprovedExists = await checkColumnExists("timesheets", "admin_approved")
    if (!adminApprovedExists) {
      console.log("Adding admin_approved column to timesheets table...")
      await sql`ALTER TABLE timesheets ADD COLUMN admin_approved BOOLEAN NOT NULL DEFAULT FALSE;`
      console.log("admin_approved column added successfully")
    } else {
      console.log("admin_approved column already exists")
    }

    // Check if approval_date column exists in timesheets table
    const approvalDateExists = await checkColumnExists("timesheets", "approval_date")
    if (!approvalDateExists) {
      console.log("Adding approval_date column to timesheets table...")
      await sql`ALTER TABLE timesheets ADD COLUMN approval_date TIMESTAMP;`
      console.log("approval_date column added successfully")
    } else {
      console.log("approval_date column already exists")
    }

    // Check if approved_by column exists in timesheets table
    const approvedByExists = await checkColumnExists("timesheets", "approved_by")
    if (!approvedByExists) {
      console.log("Adding approved_by column to timesheets table...")
      await sql`ALTER TABLE timesheets ADD COLUMN approved_by INTEGER REFERENCES users(id);`
      console.log("approved_by column added successfully")
    } else {
      console.log("approved_by column already exists")
    }

    return NextResponse.json({
      success: true,
      message: "Migration completed successfully",
      details: {
        isActiveAdded: !isActiveExists,
        adminApprovedAdded: !adminApprovedExists,
        approvalDateAdded: !approvalDateExists,
        approvedByAdded: !approvedByExists,
      },
    })
  } catch (error) {
    console.error("Error during migration:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Migration failed: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 },
    )
  }
}

async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = ${tableName}
        AND column_name = ${columnName}
      ) as exists;
    `

    if (result && result.rows && result.rows.length > 0) {
      return result.rows[0].exists === true
    }
    return false
  } catch (error) {
    console.error(`Error checking if column ${columnName} exists in table ${tableName}:`, error)
    return false
  }
}

