import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, AlertCircle, Clock } from "lucide-react"

interface ReviewProgressIndicatorProps {
  totalEmployees: number
  reviewed: number
  needsReview: number
  pending: number
}

export function ReviewProgressIndicator({
  totalEmployees,
  reviewed,
  needsReview,
  pending,
}: ReviewProgressIndicatorProps) {
  // Calculate percentages
  const reviewedPercentage = totalEmployees > 0 ? Math.round((reviewed / totalEmployees) * 100) : 0
  const needsReviewPercentage = totalEmployees > 0 ? Math.round((needsReview / totalEmployees) * 100) : 0
  const pendingPercentage = totalEmployees > 0 ? Math.round((pending / totalEmployees) * 100) : 0

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="text-lg font-medium">
              {reviewed + needsReview + pending} of {totalEmployees} timesheets
            </div>
            <div className="text-sm text-muted-foreground">
              ({reviewedPercentage + needsReviewPercentage + pendingPercentage}% complete)
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">{reviewed} Approved</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span className="text-sm">{needsReview} Needs Review</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm">{pending} Pending</span>
            </div>
          </div>
        </div>

        <Progress value={reviewedPercentage + needsReviewPercentage + pendingPercentage} className="h-2" />
      </CardContent>
    </Card>
  )
}

