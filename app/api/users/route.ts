import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

// GET /api/users - Get all users
export async function GET() {
  try {
    console.log("Fetching all users...")

    // Check if is_active column exists
    let isActiveExists = false
    try {
      const checkColumn = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'is_active'
        );
      `

      isActiveExists =
        checkColumn && checkColumn.rows && checkColumn.rows.length > 0 && checkColumn.rows[0].exists === true
      console.log(`is_active column exists: ${isActiveExists}`)
    } catch (error) {
      console.error("Error checking for is_active column:", error)
      isActiveExists = false
    }

    // Get all users
    let result
    if (isActiveExists) {
      result = await sql`
        SELECT id, username, full_name, email, is_admin, employee_type, weekly_salary, is_active, created_at, updated_at
        FROM users
        ORDER BY id
      `
    } else {
      result = await sql`
        SELECT id, username, full_name, email, is_admin, employee_type, weekly_salary, created_at, updated_at
        FROM users
        ORDER BY id
      `
    }

    console.log("Database response:", result)

    // Handle different response formats
    let users = []

    if (Array.isArray(result)) {
      // If result is directly an array
      users = result
    } else if (result && result.rows && Array.isArray(result.rows)) {
      // If result has a rows property that is an array
      users = result.rows
    } else if (result && typeof result === "object") {
      // Try to find any array property in the result
      const possibleArrays = Object.values(result).filter((val) => Array.isArray(val))
      if (possibleArrays.length > 0) {
        users = possibleArrays[0]
      }
    }

    // If is_active doesn't exist in the database, add it to the response
    if (!isActiveExists) {
      users = users.map((user) => ({
        ...user,
        is_active: true, // Default to true
      }))
    }

    console.log(`Found ${users.length} users`)

    return NextResponse.json({ success: true, data: users })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch users: " + (error instanceof Error ? error.message : String(error)),
        data: [],
      },
      { status: 500 },
    )
  }
}

// POST /api/users - Create a new user
export async function POST(request: Request) {
  try {
    const { username, password, fullName, email, isAdmin, employeeType, weeklySalary, isActive } = await request.json()

    console.log(`Creating new user: ${username}, ${fullName}, ${email}, isAdmin: ${isAdmin}, isActive: ${isActive}`)

    // Check if username already exists - with robust error handling
    let usernameExists = false
    try {
      const checkUsername = await sql`
        SELECT COUNT(*) FROM users WHERE username = ${username}
      `

      console.log("Username check result:", checkUsername)

      // Handle different response formats
      if (Array.isArray(checkUsername) && checkUsername.length > 0) {
        usernameExists = Number.parseInt(checkUsername[0].count, 10) > 0
      } else if (checkUsername?.rows && checkUsername.rows.length > 0) {
        usernameExists = Number.parseInt(checkUsername.rows[0].count, 10) > 0
      }

      console.log(`Username exists: ${usernameExists}`)

      if (usernameExists) {
        return NextResponse.json({ success: false, message: "Username already exists" }, { status: 400 })
      }
    } catch (error) {
      console.error("Error checking username:", error)
      return NextResponse.json(
        {
          success: false,
          message: "Error checking username: " + (error instanceof Error ? error.message : String(error)),
        },
        { status: 500 },
      )
    }

    // Check if email already exists - with robust error handling
    let emailExists = false
    try {
      const checkEmail = await sql`
        SELECT COUNT(*) FROM users WHERE email = ${email}
      `

      console.log("Email check result:", checkEmail)

      // Handle different response formats
      if (Array.isArray(checkEmail) && checkEmail.length > 0) {
        emailExists = Number.parseInt(checkEmail[0].count, 10) > 0
      } else if (checkEmail?.rows && checkEmail.rows.length > 0) {
        emailExists = Number.parseInt(checkEmail.rows[0].count, 10) > 0
      }

      console.log(`Email exists: ${emailExists}`)

      if (emailExists) {
        return NextResponse.json({ success: false, message: "Email already exists" }, { status: 400 })
      }
    } catch (error) {
      console.error("Error checking email:", error)
      return NextResponse.json(
        {
          success: false,
          message: "Error checking email: " + (error instanceof Error ? error.message : String(error)),
        },
        { status: 500 },
      )
    }

    // Check if is_active column exists
    let isActiveExists = false
    try {
      const checkColumn = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'is_active'
        );
      `

      isActiveExists =
        checkColumn && checkColumn.rows && checkColumn.rows.length > 0 && checkColumn.rows[0].exists === true
      console.log(`is_active column exists: ${isActiveExists}`)
    } catch (error) {
      console.error("Error checking for is_active column:", error)
      isActiveExists = false
    }

    // Insert new user
    console.log("Inserting new user...")
    let result

    if (isActiveExists) {
      result = await sql`
        INSERT INTO users (username, password, full_name, email, is_admin, employee_type, weekly_salary, is_active)
        VALUES (${username}, ${password}, ${fullName}, ${email}, ${isAdmin}, ${employeeType}, ${weeklySalary}, ${isActive})
        RETURNING id, username, full_name, email, is_admin, employee_type, weekly_salary, is_active, created_at, updated_at
      `
    } else {
      result = await sql`
        INSERT INTO users (username, password, full_name, email, is_admin, employee_type, weekly_salary)
        VALUES (${username}, ${password}, ${fullName}, ${email}, ${isAdmin}, ${employeeType}, ${weeklySalary})
        RETURNING id, username, full_name, email, is_admin, employee_type, weekly_salary, created_at, updated_at
      `
    }

    console.log("Insert result:", result)

    // Handle different response formats for the insert result
    let newUser
    if (Array.isArray(result) && result.length > 0) {
      newUser = result[0]
    } else if (result?.rows && result.rows.length > 0) {
      newUser = result.rows[0]
    }

    if (!newUser) {
      throw new Error("Failed to retrieve the newly created user")
    }

    // If is_active doesn't exist in the database, add it to the response
    if (!isActiveExists) {
      newUser.is_active = isActive !== undefined ? isActive : true
    }

    console.log("User created successfully:", newUser)

    return NextResponse.json({
      success: true,
      message: "User created successfully",
      data: newUser,
    })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create user: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 },
    )
  }
}

