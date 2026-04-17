"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Authenticator } from "@aws-amplify/ui-react"
import { fetchAuthSession } from "aws-amplify/auth"
import "@aws-amplify/ui-react/styles.css"

export default function LoginPage() {
  const router = useRouter()

  // If already signed in, redirect to dashboard
  useEffect(() => {
    fetchAuthSession()
      .then((session) => {
        if (session.tokens) {
          router.replace("/admin")
        }
      })
      .catch(() => {
        // Not signed in — stay on login page
      })
  }, [router])

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#f2f3f3",
      }}
    >
      <Authenticator hideSignUp>
        {() => {
          // Called when Authenticator confirms a signed-in user
          router.replace("/admin")
          return <></>
        }}
      </Authenticator>
    </div>
  )
}
