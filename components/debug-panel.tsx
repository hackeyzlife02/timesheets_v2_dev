"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Bug } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface DebugPanelProps {
  debugData: {
    apiUrl?: string
    requestTime?: string
    responseStatus?: number
    responseTime?: string
    responseData?: any
    error?: any
    parsedData?: any
  }
}

export function DebugPanel({ debugData }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  const togglePanel = () => {
    setIsOpen(!isOpen)
  }

  const formatJson = (data: any) => {
    try {
      return JSON.stringify(data, null, 2)
    } catch (e) {
      return "Error formatting JSON: " + e
    }
  }

  return (
    <Card className="mt-6 border-dashed border-red-300 bg-red-50">
      <CardHeader className="pb-2 cursor-pointer" onClick={togglePanel}>
        <CardTitle className="flex items-center justify-between text-red-700">
          <div className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Debug Information
          </div>
          <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CardTitle>
      </CardHeader>
      {isOpen && (
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold mb-1">API Request:</h3>
              <div className="bg-white p-2 rounded border">
                <p>
                  <strong>URL:</strong> {debugData.apiUrl || "N/A"}
                </p>
                <p>
                  <strong>Request Time:</strong> {debugData.requestTime || "N/A"}
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-1">API Response:</h3>
              <div className="bg-white p-2 rounded border">
                <p>
                  <strong>Status:</strong> {debugData.responseStatus || "N/A"}
                </p>
                <p>
                  <strong>Response Time:</strong> {debugData.responseTime || "N/A"}
                </p>
              </div>
            </div>

            {debugData.error && (
              <div>
                <h3 className="font-semibold mb-1 text-red-700">Error:</h3>
                <pre className="bg-white p-2 rounded border text-red-700 overflow-auto max-h-40">
                  {formatJson(debugData.error)}
                </pre>
              </div>
            )}

            {debugData.responseData && (
              <div>
                <h3 className="font-semibold mb-1">Raw Response Data:</h3>
                <pre className="bg-white p-2 rounded border overflow-auto max-h-60">
                  {formatJson(debugData.responseData)}
                </pre>
              </div>
            )}

            {debugData.parsedData && (
              <div>
                <h3 className="font-semibold mb-1">Parsed Data:</h3>
                <pre className="bg-white p-2 rounded border overflow-auto max-h-60">
                  {formatJson(debugData.parsedData)}
                </pre>
              </div>
            )}

            <div className="pt-2">
              <p className="text-xs text-red-700">Please copy and share this information when reporting issues.</p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

