import { sql } from "./db"

interface User {
  id: number
  username: string
  fullName: string
  email: string
  isAdmin: boolean
}

interface LoginResult {
  success: boolean
  message?: string
  isAdmin?: boolean
  token?: string
  needsDbInit?: boolean
}

// Mock user database for fallback when database is not initialized
const mockUsers = [
  {
    id: 10,
    username: "ghotarek",
    password: "lutz",
    fullName: "George Hotarek",
    email: "ghotarek@example.com",
    isAdmin: true,
  },
  // Add a few more users for testing
  {
    id: 1,
    username: "dmendoza",
    password: "lutz",
    fullName: "Daniel Mendoza",
    email: "dmendoza@example.com",
    isAdmin: false,
  },
]

// Login function that uses the database with fallback to mock data
export async function loginUser(username: string, password: string): Promise<LoginResult> {
  try {
    console.log(`Attempting login for user: ${username}`)

    // Query the database for the user
    const result = await sql`
      SELECT id, username, full_name, email, is_admin 
      FROM users 
      WHERE username = ${username} AND password = ${password}
    `

    console.log("Login query result:", result)

    // Handle different response formats
    // The result might be an array directly or an object with a rows property
    let users: any[] = []

    if (Array.isArray(result)) {
      // If result is directly an array
      users = result
    } else if (result && result.rows && Array.isArray(result.rows)) {
      // If result has a rows property that is an array
      users = result.rows
    } else {
      console.log("Unexpected database response format:", result)
      // Try to extract users if possible
      if (result && typeof result === "object") {
        // If it's some other object structure, try to find an array property
        const possibleArrayProps = Object.values(result).filter(Array.isArray)
        if (possibleArrayProps.length > 0) {
          users = possibleArrayProps[0]
        }
      }
    }

    // Now check if we found any matching users
    if (users.length === 0) {
      console.log("No matching user found")
      return {
        success: false,
        message: "Invalid username or password",
      }
    }

    const user = users[0]
    console.log("User found:", user)

    // Store user in localStorage (in a real app, we'd use secure cookies and JWT)
    if (typeof window !== "undefined") {
      const userData = {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        isAdmin: user.is_admin,
      }

      console.log("Storing user data in localStorage:", userData)
      localStorage.setItem("currentUser", JSON.stringify(userData))

      // Also set an auth token
      localStorage.setItem("authToken", "mock-jwt-token")
    }

    return {
      success: true,
      isAdmin: user.is_admin,
      token: "mock-jwt-token",
    }
  } catch (error) {
    console.error("Login error:", error)

    // Check if the error is because the table doesn't exist
    const errorMessage = error instanceof Error ? error.message : String(error)
    const isTableNotExistError = errorMessage.includes("relation") && errorMessage.includes("does not exist")

    if (isTableNotExistError) {
      // Try to use mock data as fallback for admin user
      const mockUser = mockUsers.find((u) => u.username === username && u.password === password)

      if (mockUser) {
        // Allow login with mock data to initialize the database
        if (typeof window !== "undefined") {
          const userData = {
            id: mockUser.id,
            username: mockUser.username,
            fullName: mockUser.fullName,
            email: mockUser.email,
            isAdmin: mockUser.isAdmin,
          }

          console.log("Storing mock user data in localStorage:", userData)
          localStorage.setItem("currentUser", JSON.stringify(userData))

          // Also set an auth token
          localStorage.setItem("authToken", "mock-jwt-token")
        }

        return {
          success: true,
          isAdmin: mockUser.isAdmin,
          token: "mock-jwt-token",
          needsDbInit: mockUser.isAdmin, // Only show DB init message for admin users
          message: mockUser.isAdmin
            ? "Database needs initialization. Please go to the Database Admin page."
            : undefined,
        }
      }

      return {
        success: false,
        message: "Database not initialized. Please contact an administrator.",
        needsDbInit: true,
      }
    }

    return {
      success: false,
      message: "An error occurred during login. Please try again.",
    }
  }
}

// Get current user from localStorage
export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null

  try {
    const userJson = localStorage.getItem("currentUser")
    if (!userJson) {
      console.log("No user found in localStorage")
      return null
    }

    const user = JSON.parse(userJson) as User
    console.log("Retrieved user from localStorage:", user)
    return user
  } catch (e) {
    console.error("Error parsing user from localStorage:", e)
    return null
  }
}

// Logout user
export function logoutUser(): void {
  if (typeof window === "undefined") return
  console.log("Logging out user")
  localStorage.removeItem("currentUser")
  localStorage.removeItem("authToken")
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false

  const hasToken = localStorage.getItem("authToken") !== null
  const hasUser = localStorage.getItem("currentUser") !== null

  console.log(`isAuthenticated check: hasToken=${hasToken}, hasUser=${hasUser}`)
  return hasToken && hasUser
}

// Check if user is admin
export function isAdmin(): boolean {
  const user = getCurrentUser()
  const isUserAdmin = user !== null && user.isAdmin === true
  console.log(`isAdmin check: ${isUserAdmin}`)
  return isUserAdmin
}

