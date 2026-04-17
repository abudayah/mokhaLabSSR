"use client"

import { useRouter } from "next/navigation"
import ContentLayout from "@cloudscape-design/components/content-layout"
import Header from "@cloudscape-design/components/header"
import Container from "@cloudscape-design/components/container"
import SpaceBetween from "@cloudscape-design/components/space-between"
import Button from "@cloudscape-design/components/button"
import Box from "@cloudscape-design/components/box"
import { useBlogPostStore } from "@/app/admin/_components/context/useBlogPostStore"

export default function DashboardPage() {
  const { posts } = useBlogPostStore()
  const router = useRouter()

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <ContentLayout header={<Header variant="h1">Dashboard</Header>}>
      <SpaceBetween size="l">
        <Container header={<Header variant="h2">Welcome back</Header>}>
          <SpaceBetween size="s">
            <Box variant="p">Today is {today}.</Box>
            <Box variant="p">
              You have <strong>{posts.length}</strong> blog post{posts.length !== 1 ? "s" : ""} published.
            </Box>
            <Button variant="primary" onClick={() => router.push("/admin/blog/new")}>
              Create new post
            </Button>
          </SpaceBetween>
        </Container>
      </SpaceBetween>
    </ContentLayout>
  )
}
