"use client"

import { resolveBoundaryError } from "@/lib/errors/http"
import { motion } from "framer-motion"
import { AlertCircle, RefreshCw } from "lucide-react"
import React from "react"

type ErrorBoundaryProps = {
  children: React.ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
  error: unknown
  message?: string
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
 
    // Define a state variable to track whether is an error or not
    this.state = { hasError: false, error: null, message: undefined }
  }
  static getDerivedStateFromError(_error: unknown): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
 
    return { hasError: true, error: _error, message: undefined }
  }
  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    // You can use your own error logging service here
    console.log({ error, errorInfo })

    const resolvedError = resolveBoundaryError(error)
    this.setState({ message: resolvedError.details })
  }
  render() {
    // Check if the error is thrown
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-white text-slate-900 overflow-hidden p-4">
          {/* Background Pattern */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(to right, #10b981 1px, transparent 1px), linear-gradient(to bottom, #10b981 1px, transparent 1px)`,
                backgroundSize: '40px 40px'
              }}
            />
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-100/40 rounded-full blur-[100px]" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-50/60 rounded-full blur-[100px]" />
          </div>

          {/* Content */}
          <div className="relative z-10 max-w-md w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              {/* Icon */}
              <motion.div
                className="flex justify-center mb-8"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="p-4 bg-red-100 rounded-full border border-red-200">
                  <AlertCircle className="w-16 h-16 text-red-600" />
                </div>
              </motion.div>

              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-bold mb-3 text-slate-900">
                Oops, something went wrong!
              </h1>

              {/* Description */}
              <p className="text-slate-600 mb-8 text-lg leading-relaxed">
                We encountered an unexpected error while processing your request.
              </p>

              {/* Error Message */}
              {this.state.message && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="p-4 bg-red-50 border border-red-200 rounded-lg mb-8 backdrop-blur-sm"
                >
                  <p className="text-red-700 text-sm md:text-base font-medium">
                    {this.state.message}
                  </p>
                </motion.div>
              )}

              {/* Retry Button */}
              <motion.button
                onClick={() => this.setState({ hasError: false, error: null, message: undefined })}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-lg mb-6 transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <RefreshCw className="w-5 h-5" />
                Try Again
              </motion.button>

              {/* Help Text */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-slate-500 text-sm space-y-2"
              >
                <p>If the problem persists, please:</p>
                <ul className="space-y-1">
                  <li>• Refresh the page</li>
                  <li>• Clear your browser cache</li>
                  <li>• Contact support if the issue continues</li>
                </ul>
              </motion.div>
            </motion.div>
          </div>
        </div>
      )
    }
 
    // Return children components in case of no error
 
    return this.props.children
  }
}
 
export default ErrorBoundary
