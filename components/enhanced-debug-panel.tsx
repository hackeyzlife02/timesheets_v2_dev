"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp, Copy, AlertCircle, CheckCircle, Clock, Database, Server, Code } from "lucide-react"

interface DebugData {
  apiUrl?: string
  requestTime?: string
  responseStatus?: number
  responseTime?: string
  responseData?: any
  parsedData?: any
  error?: {
    message?: string
    status?: number
    statusText?: string
    body?: string
    stack?: string
  }
}

interface EnhancedDebugPanelProps {
  debugData: DebugData
  selectedWeekStartDate?: string | Date
  submissionStats?: any
  employeeStats?: any
  isVisible?: boolean
}

export function EnhancedDebugPanel({
  debugData,
  selectedWeekStartDate,
  submissionStats,
  employeeStats,
  isVisible = true,
}: EnhancedDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("request")
  const [backendLogs, setBackendLogs] = useState({
    dateRange: "",
    schema: "",
    query: "",
    results: "",
    errors: "",
  })

  if (!isVisible) return null

  // Format the selected week start date
  const formattedDate = selectedWeekStartDate
    ? typeof selectedWeekStartDate === "string"
      ? selectedWeekStartDate
      : selectedWeekStartDate.toISOString().split("T")[0]
    : "Not set"

  // Determine status color
  const getStatusColor = (status?: number) => {
    if (!status) return "bg-gray-500"
    if (status >= 200 && status < 300) return "bg-green-500"
    if (status >= 400 && status < 500) return "bg-amber-500"
    return "bg-red-500"
  }

  // Format JSON for display
  const formatJson = (data: any) => {
    try {
      return JSON.stringify(data, null, 2)
    } catch (e) {
      return String(data)
    }
  }

  // Copy all debug info to clipboard
  const copyAllDebugInfo = () => {
    const allInfo = {
      debugData,
      selectedWeekStartDate: formattedDate,
      submissionStats,
      employeeStats,
      backendLogs,
    }
    navigator.clipboard.writeText(JSON.stringify(allInfo, null, 2))
  }

  // Database connection test
  const testDatabaseConnection = async () => {
    try {
      const response = await fetch("/api/admin/db-test")
      const data = await response.json()
      alert(`Database connection test: ${data.success ? "Success" : "Failed"}\n${data.message || ""}`)
    } catch (error) {
      alert(`Error testing database connection: ${error}`)
    }
  }

  return (
    <Card className="mt-8 border-2 border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-amber-800 dark:text-amber-300">Fetch Debug Information</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" /> Hide Details
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" /> Show Details
              </>
            )}
          </Button>
        </div>
        <CardDescription className="text-amber-700 dark:text-amber-400">
          Diagnostic information to help troubleshoot data fetching issues
        </CardDescription>
      </CardHeader>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <CardContent>
            <div className="flex justify-end mb-2">
              <Button variant="outline" size="sm" onClick={copyAllDebugInfo}>
                <Copy className="h-4 w-4 mr-1" /> Copy All Debug Info
              </Button>
              <Button variant="outline" size="sm" className="ml-2" onClick={testDatabaseConnection}>
                <Database className="h-4 w-4 mr-1" /> Test DB Connection
              </Button>
            </div>

            <Tabs defaultValue="request" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="request">
                  <Server className="h-4 w-4 mr-1" /> Request
                </TabsTrigger>
                <TabsTrigger value="response">
                  <CheckCircle className="h-4 w-4 mr-1" /> Response
                </TabsTrigger>
                <TabsTrigger value="state">
                  <Code className="h-4 w-4 mr-1" /> Frontend State
                </TabsTrigger>
                <TabsTrigger value="error">
                  <AlertCircle className="h-4 w-4 mr-1" /> Errors
                </TabsTrigger>
                <TabsTrigger value="backend">
                  <Database className="h-4 w-4 mr-1" /> Backend Logs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="request" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm text-amber-800 dark:text-amber-300">Request URL</h3>
                    <pre className="bg-white dark:bg-gray-800 p-2 rounded text-xs overflow-auto max-h-20">
                      {debugData.apiUrl || "No URL available"}
                    </pre>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm text-amber-800 dark:text-amber-300">Request Time</h3>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-amber-600" />
                      <span className="text-sm">{debugData.requestTime || "Not available"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-amber-800 dark:text-amber-300">
                    Selected Week Start Date (Frontend)
                  </h3>
                  <div className="bg-white dark:bg-gray-800 p-2 rounded">
                    <p className="text-sm">{formattedDate}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      This is the date used to filter timesheets in the API request
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-amber-800 dark:text-amber-300">Debugging Tips</h3>
                  <ul className="list-disc list-inside text-xs space-y-1 text-gray-700 dark:text-gray-300">
                    <li>Verify the URL includes the correct weekStartDate parameter</li>
                    <li>Check that the date format is YYYY-MM-DD</li>
                    <li>Be aware of timezone issues - server and client may interpret dates differently</li>
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="response" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm text-amber-800 dark:text-amber-300">Response Status</h3>
                    <div className="flex items-center">
                      <Badge className={`${getStatusColor(debugData.responseStatus)}`}>
                        {debugData.responseStatus || "Unknown"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm text-amber-800 dark:text-amber-300">Response Time</h3>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-amber-600" />
                      <span className="text-sm">{debugData.responseTime || "Not available"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-amber-800 dark:text-amber-300">Raw API Response</h3>
                  <Collapsible className="w-full">
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-between">
                        <span>Toggle Raw Response</span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <pre className="bg-white dark:bg-gray-800 p-2 rounded text-xs overflow-auto max-h-96 mt-2">
                        {formatJson(debugData.responseData) || "No response data available"}
                      </pre>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </TabsContent>

              <TabsContent value="state" className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-amber-800 dark:text-amber-300">
                    Data Set in Frontend State (submissionStats)
                  </h3>
                  <Collapsible className="w-full">
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-between">
                        <span>Toggle Submission Stats</span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <pre className="bg-white dark:bg-gray-800 p-2 rounded text-xs overflow-auto max-h-96 mt-2">
                        {formatJson(submissionStats) || "No submission stats available"}
                      </pre>
                    </CollapsibleContent>
                  </Collapsible>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-amber-800 dark:text-amber-300">
                    Data Set in Frontend State (employeeStats)
                  </h3>
                  <Collapsible className="w-full">
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-between">
                        <span>Toggle Employee Stats</span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <pre className="bg-white dark:bg-gray-800 p-2 rounded text-xs overflow-auto max-h-96 mt-2">
                        {formatJson(employeeStats) || "No employee stats available"}
                      </pre>
                    </CollapsibleContent>
                  </Collapsible>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-amber-800 dark:text-amber-300">Expected Data Structure</h3>
                  <pre className="bg-white dark:bg-gray-800 p-2 rounded text-xs overflow-auto max-h-96">
                    {`{
  "totalEmployees": 10,
  "timesheetsCreated": 5,
  "timesheetsCertified": 3,
  "pendingApproval": 2,
  "totalHours": 320.5,
  "totalSalary": 12500,
  "regularHours": 280,
  "overtimeHours": 35.5,
  "doubleTimeHours": 5,
  "pendingHours": 120,
  "submittedHours": 80.5,
  "approvedHours": 120
}`}
                  </pre>
                </div>
              </TabsContent>

              <TabsContent value="error" className="space-y-4">
                {debugData.error ? (
                  <>
                    <div className="space-y-2">
                      <h3 className="font-medium text-sm text-red-800 dark:text-red-300">Error Message</h3>
                      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 p-2 rounded">
                        <p className="text-sm text-red-800 dark:text-red-300">
                          {debugData.error.message || "Unknown error"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h3 className="font-medium text-sm text-red-800 dark:text-red-300">Status</h3>
                        <p className="text-sm">
                          {debugData.error.status} {debugData.error.statusText}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-medium text-sm text-red-800 dark:text-red-300">Error Response Body</h3>
                      <pre className="bg-white dark:bg-gray-800 p-2 rounded text-xs overflow-auto max-h-40">
                        {debugData.error.body || "No response body available"}
                      </pre>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-medium text-sm text-red-800 dark:text-red-300">Stack Trace</h3>
                      <pre className="bg-white dark:bg-gray-800 p-2 rounded text-xs overflow-auto max-h-40">
                        {debugData.error.stack || "No stack trace available"}
                      </pre>
                    </div>
                  </>
                ) : (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    <p>No errors reported</p>
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-amber-800 dark:text-amber-300">Troubleshooting Tips</h3>
                  <ul className="list-disc list-inside text-xs space-y-1 text-gray-700 dark:text-gray-300">
                    <li>Check database connection string in environment variables</li>
                    <li>Verify database permissions for the connected user</li>
                    <li>Check for network issues between your application and the database</li>
                    <li>Look for syntax errors in SQL queries</li>
                    <li>Verify table and column names match exactly what's in the database</li>
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="backend" className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-amber-800 dark:text-amber-300">
                    Paste Backend Log: Received weekStartDate & Calculated Date Range
                  </h3>
                  <Textarea
                    placeholder="Paste logs showing date parsing and range calculation..."
                    value={backendLogs.dateRange}
                    onChange={(e) => setBackendLogs({ ...backendLogs, dateRange: e.target.value })}
                    className="font-mono text-xs h-20"
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-amber-800 dark:text-amber-300">
                    Paste Backend Log: Database Schema Check Output
                  </h3>
                  <Textarea
                    placeholder="Paste logs showing database schema checks..."
                    value={backendLogs.schema}
                    onChange={(e) => setBackendLogs({ ...backendLogs, schema: e.target.value })}
                    className="font-mono text-xs h-20"
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-amber-800 dark:text-amber-300">
                    Paste Backend Log: SQL Query Executed
                  </h3>
                  <Textarea
                    placeholder="Paste logs showing SQL queries..."
                    value={backendLogs.query}
                    onChange={(e) => setBackendLogs({ ...backendLogs, query: e.target.value })}
                    className="font-mono text-xs h-20"
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-amber-800 dark:text-amber-300">
                    Paste Backend Log: Count/Sum Results from DB Query
                  </h3>
                  <Textarea
                    placeholder="Paste logs showing query results..."
                    value={backendLogs.results}
                    onChange={(e) => setBackendLogs({ ...backendLogs, results: e.target.value })}
                    className="font-mono text-xs h-20"
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-amber-800 dark:text-amber-300">
                    Paste Backend Log: Any Backend Error Messages
                  </h3>
                  <Textarea
                    placeholder="Paste any error messages from backend logs..."
                    value={backendLogs.errors}
                    onChange={(e) => setBackendLogs({ ...backendLogs, errors: e.target.value })}
                    className="font-mono text-xs h-20"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

