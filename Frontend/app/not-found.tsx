import { NotFound } from "@/components/common/not-found"
import ErrorBoundary from "@/components/layout/Error/ErrorBoundary"

export default function AppNotFoundPage() {
  return (
    <ErrorBoundary>
      <NotFound />
    </ErrorBoundary>
  )
}
