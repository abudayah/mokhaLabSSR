"use client"

import { useEffect } from "react"
import { Amplify } from "aws-amplify"
import outputs from "@/amplify_outputs.json"

// Configure Amplify once on the client side
Amplify.configure(outputs, { ssr: true })

export default function AmplifyProvider({ children }: { children: React.ReactNode }) {
  // Re-configure on mount to ensure cookies are available for SSR token passing
  useEffect(() => {
    Amplify.configure(outputs, { ssr: true })
  }, [])

  return <>{children}</>
}
