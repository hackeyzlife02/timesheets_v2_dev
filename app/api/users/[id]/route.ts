import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

// GET /api/users/[id] - Get a user by ID
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    console.log(`Fetching user with ID: ${id}`)

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

    // Get user by ID
    let result
    if (isActiveExists) {
      result = await sql`
        SELECT id, username, full_name, email, is_admin, employee_type, weekly_salary, is_active, created_at, updated_at
        FROM users
        WHERE id = ${id}
      `
    } else {
      result = await sql`
        SELECT id, username, full_name, email, is_admin, employee_type, weekly_salary, created_at, updated_at
        FROM users
        WHERE id = ${id}
      `
    }

    console.log("Database response:", result)

    // Handle different response formats
    let user = null

    if (Array.isArray(result)) {
      // If result is directly an array
      if (result.length > 0) {
        user = result[0]
      }
    } else if (result && result.rows && Array.isArray(result.rows)) {
      // If result has a rows property that is an array
      if (result.rows.length > 0) {
        user = result.rows[0]
      }
    } else if (result && typeof result === "object") {
      // Try to find any array property in the result
      const possibleArrays = Object.values(result).filter((val) => Array.isArray(val))
      if (possibleArrays.length > 0 && possibleArrays[0].length > 0) {
        user = possibleArrays[0][0]
      }
    }

    if (!user) {
      console.log(`User with ID ${id} not found`)
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    // If is_active doesn't exist in the database, add it to the response
    if (!isActiveExists) {
      user.is_active = true // Default to true
    }

    console.log(`Found user:`, user)
    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch user: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 },
    )
  }
}

// PUT /api/users/[id] - Update a user
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const { username, password, fullName, email, isAdmin, employeeType, weeklySalary, isActive } = await request.json()

    console.log(`Updating user with ID: ${id}`)

    // Check if username already exists for another user
    let usernameExists = false
    try {
      const checkUsername = await sql`
        SELECT COUNT(*) FROM users WHERE username = ${username} AND id != ${id}
      `

      console.log("Username check result:", checkUsername)

      // Handle different response formats
      if (Array.isArray(checkUsername) && checkUsername.length > 0) {
        usernameExists = Number.parseInt(checkUsername[0].count, 10) > 0
      } else if (checkUsername?.rows && checkUsername.rows.length > 0) {
        usernameExists = Number.parseInt(checkUsername.rows[0].count, 10) > 0
      }

      console.log(`Username exists for another user: ${usernameExists}`)

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

    // Check if email already exists for another user
    let emailExists = false
    try {
      const checkEmail = await sql`
        SELECT COUNT(*) FROM users WHERE email = ${email} AND id != ${id}
      `

      console.log("Email check result:", checkEmail)

      // Handle different response formats
      if (Array.isArray(checkEmail) && checkEmail.length > 0) {
        emailExists = Number.parseInt(checkEmail[0].count, 10) > 0
      } else if (checkEmail?.rows && checkEmail.rows.length > 0) {
        emailExists = Number.parseInt(checkEmail.rows[0].count, 10) > 0
      }

      console.log(`Email exists for another user: ${emailExists}`)

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

    // Update user
    let result
    try {
      if (password) {
        // If password is provided, update it too
        console.log("Updating user with new password")
        if (isActiveExists) {
          result = await sql`
            UPDATE users
            SET username = ${username}, 
                password = ${password}, 
                full_name = ${fullName}, 
                email = ${email}, 
                is_admin = ${isAdmin},
                employee_type = ${employeeType},
                weekly_salary = ${weeklySalary},
                is_active = ${isActive},
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING id, username, full_name, email, is_admin, employee_type, weekly_salary, is_active, created_at, updated_at
          `
        } else {
          result = await sql`
            UPDATE users
            SET username = ${username}, 
                password = ${password}, 
                full_name = ${fullName}, 
                email = ${email}, 
                is_admin = ${isAdmin},
                employee_type = ${employeeType},
                weekly_salary = ${weeklySalary},
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING id, username, full_name, email, is_admin, employee_type, weekly_salary, created_at, updated_at
          `
        }
      } else {
        // If no password provided, don't update it
        console.log("Updating user without changing password")
        if (isActiveExists) {
          result = await sql`
            UPDATE users
            SET username = ${username}, 
                full_name = ${fullName}, 
                email = ${email}, 
                is_admin = ${isAdmin},
                employee_type = ${employeeType},
                weekly_salary = ${weeklySalary},
                is_active = ${isActive},
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING id, username, full_name, email, is_admin, employee_type, weekly_salary, is_active, created_at, updated_at
          `
        } else {
          result = await sql`
            UPDATE users
            SET username = ${username}, 
                full_name = ${fullName}, 
                email = ${email}, 
                is_admin = ${isAdmin},
                employee_type = ${employeeType},
                weekly_salary = ${weeklySalary},
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING id, username, full_name, email, is_admin, employee_type, weekly_salary, created_at, updated_at
          `
        }
      }

      console.log("Update result:", result)
    } catch (error) {
      console.error("Error updating user:", error)
      return NextResponse.json(
        {
          success: false,
          message: "Error updating user: " + (error instanceof Error ? error.message : String(error)),
        },
        { status: 500 },
      )
    }

    // Handle different response formats for the update result
    let updatedUser
    if (Array.isArray(result) && result.length > 0) {
      updatedUser = result[0]
    } else if (result?.rows && result.rows.length > 0) {
      updatedUser = result.rows[0]
    } else if (result && typeof result === "object") {
      // Try to find any array property in the result
      const possibleArrays = Object.values(result).filter((val) => Array.isArray(val))
      if (possibleArrays.length > 0 && possibleArrays[0].length > 0) {
        updatedUser = possibleArrays[0][0]
      }
    }

    if (!updatedUser) {
      console.log(`User with ID ${id} not found or not updated`)
      return NextResponse.json({ success: false, message: "User not found or not updated" }, { status: 404 })
    }

    // If is_active doesn't exist in the database, add it to the response
    if (!isActiveExists) {
      updatedUser.is_active = isActive !== undefined ? isActive : true
    }

    console.log("User updated successfully:", updatedUser)
    return NextResponse.json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update user: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 },
    )
  }
}

// DELETE /api/users/[id] - Delete a user
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    console.log(`Deleting user with ID: ${id}`)

    // Check if user exists
    let userExists = false
    try {
      const checkUser = await sql`
        SELECT COUNT(*) FROM users WHERE id = ${id}
      `

      console.log("User existence check result:", checkUser)

      // Handle different response formats
      if (Array.isArray(checkUser) && checkUser.length > 0) {
        userExists = Number.parseInt(checkUser[0].count, 10) > 0
      } else if (checkUser?.rows && checkUser.rows.length > 0) {
        userExists = Number.parseInt(checkUser.rows[0].count, 10) > 0
      }

      console.log(`User exists: ${userExists}`)

      if (!userExists) {
        return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
      }
    } catch (error) {
      console.error("Error checking if user exists:", error)
      return NextResponse.json(
        {
          success: false,
          message: "Error checking if user exists: " + (error instanceof Error ? error.message : String(error)),
        },
        { status: 500 },
      )
    }

    // Delete user
    try {
      await sql`DELETE FROM users WHERE id = ${id}`
      console.log(`User with ID ${id} deleted successfully`)
    } catch (error) {
      console.error("Error deleting user:", error)
      return NextResponse.json(
        {
          success: false,
          message: "Error deleting user: " + (error instanceof Error ? error.message : String(error)),
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete user: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 },
    )
  }
}

