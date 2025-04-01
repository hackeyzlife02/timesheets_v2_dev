import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { sendEmail } from "@/lib/email"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const { userIds } = await request.json()

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "Invalid or empty userIds array" }, { status: 400 })
    }

    const results = []

    // Process each user
    for (const userId of userIds) {
      try {
        // Get user details
        const user = await sql`
          SELECT id, name, email 
          FROM users 
          WHERE id = ${userId}
        `

        if (!user || user.length === 0) {
          results.push({ userId, success: false, message: "User not found" })
          continue
        }

        // Send email reminder
        await sendEmail({
          to: user[0].email,
          subject: "Timesheet Reminder",
          text: `Hello ${user[0].name}, this is a reminder to submit your timesheet for this week.`,
          html: `
            <div>
              <h1>Timesheet Reminder</h1>
              <p>Hello ${user[0].name},</p>
              <p>This is a reminder that you have not submitted your timesheet for this week.</p>
              <p>Please log in to the timesheet system and submit your timesheet as soon as possible.</p>
              <p>Thank you,</p>
              <p>The Timesheet Team</p>
            </div>
          `,
        })

        // Log the reminder
        await sql`
          INSERT INTO reminder_logs (user_id, sent_at, message_type)
          VALUES (${userId}, NOW(), 'missing_timesheet')
        `

        results.push({ userId, success: true, message: "Reminder sent successfully" })
      } catch (error) {
        console.error(`Error processing user ${userId}:`, error)
        results.push({
          userId,
          success: false,
          message: `Error: ${error instanceof Error ? error.message : String(error)}`,
        })
      }
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Error sending reminders:", error)
    return NextResponse.json(
      { error: `Error sending reminders: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 },
    )
  }
}

