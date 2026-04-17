"use client"

import { useRouter } from "next/navigation"
import { useForm, get, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CInput, CDatePicker } from "react-hook-form-cloudscape"
import ContentLayout from "@cloudscape-design/components/content-layout"
import Header from "@cloudscape-design/components/header"
import Form from "@cloudscape-design/components/form"
import FormField from "@cloudscape-design/components/form-field"
import Button from "@cloudscape-design/components/button"
import SpaceBetween from "@cloudscape-design/components/space-between"
import Alert from "@cloudscape-design/components/alert"
import Container from "@cloudscape-design/components/container"
import { blogPostSchema } from "@/app/admin/_components/schemas/blogPostSchema"
import type { BlogPostFormData } from "@/app/admin/_components/schemas/blogPostSchema"
import { useBlogPostStore } from "@/app/admin/_components/context/useBlogPostStore"
import { useNotifications } from "@/app/admin/_components/context/NotificationContext"
import RichTextEditor from "@/app/admin/_components/components/RichTextEditor"
import ImageUploader from "@/app/admin/_components/components/ImageUploader"

interface BlogPostFormPageProps {
  /** Present when editing an existing post */
  postId?: string
}

export default function BlogPostFormPage({ postId }: BlogPostFormPageProps) {
  const isEditMode = !!postId

  const { getPostById, createPost, updatePost } = useBlogPostStore()
  const { addNotification } = useNotifications()
  const router = useRouter()

  const existingPost = isEditMode && postId ? getPostById(postId) : undefined

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BlogPostFormData>({
    resolver: zodResolver(blogPostSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues:
      isEditMode && existingPost
        ? {
            title: existingPost.title,
            subtitle: existingPost.subtitle ?? "",
            author: existingPost.author,
            body: existingPost.body,
            featuredImage: existingPost.featuredImage ?? "",
            date: existingPost.date,
          }
        : {
            title: "",
            subtitle: "",
            author: "mokhaLab",
            body: "",
            featuredImage: "",
          },
  })

  if (isEditMode && postId && !existingPost) {
    return (
      <ContentLayout header={<Header variant="h1">Edit Post</Header>}>
        <Alert
          type="error"
          header="Post not found"
          action={
            <Button variant="inline-link" onClick={() => router.push("/admin/blog")}>
              Back to Blog Posts
            </Button>
          }
        >
          No post with ID &quot;{postId}&quot; was found.
        </Alert>
      </ContentLayout>
    )
  }

  async function onSubmit(data: BlogPostFormData) {
    try {
      if (isEditMode && postId) {
        await updatePost(postId, data)
        addNotification({
          type: "success",
          content: `"${data.title}" was updated successfully.`,
          dismissible: true,
        })
      } else {
        await createPost(data)
        addNotification({
          type: "success",
          content: `"${data.title}" was created successfully.`,
          dismissible: true,
        })
      }
      router.push("/admin/blog")
    } catch {
      addNotification({
        type: "error",
        content: `Failed to ${isEditMode ? "update" : "create"} post. Please try again.`,
        dismissible: true,
      })
    }
  }

  return (
    <ContentLayout
      header={<Header variant="h1">{isEditMode ? "Edit Post" : "Create New Post"}</Header>}
    >
      <Container>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Form
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  variant="link"
                  formAction="none"
                  onClick={() => router.push("/admin/blog")}
                >
                  Cancel
                </Button>
                <Button variant="primary" formAction="submit" loading={isSubmitting}>
                  {isEditMode ? "Save changes" : "Create post"}
                </Button>
              </SpaceBetween>
            }
          >
            <SpaceBetween size="l">
              {/* Title */}
              <FormField label="Title" errorText={get(errors, "title.message")}>
                <CInput control={control} name="title" />
              </FormField>

              {/* Subtitle */}
              <FormField
                label={<>Subtitle <i>- optional</i></>}
                errorText={get(errors, "subtitle.message")}
              >
                <CInput control={control} name="subtitle" />
              </FormField>

              {/* Body */}
              <FormField label="Body" errorText={get(errors, "body.message")}>
                <Controller
                  name="body"
                  control={control}
                  render={({ field }) => (
                    <RichTextEditor
                      value={field.value}
                      onChange={field.onChange}
                      error={get(errors, "body.message")}
                    />
                  )}
                />
              </FormField>

              {/* Author */}
              <FormField label="Author" errorText={get(errors, "author.message")}>
                <CInput control={control} name="author" />
              </FormField>

              {/* Featured Image */}
              <FormField
                label={<>Featured Image <i>- optional</i></>}
                constraintText="JPG, PNG, or WebP, max 5 MB"
              >
                <Controller
                  name="featuredImage"
                  control={control}
                  render={({ field }) => (
                    <ImageUploader value={field.value} onChange={field.onChange} />
                  )}
                />
              </FormField>

              {/* Publish Date — edit mode only */}
              {isEditMode && (
                <FormField label="Publish date" errorText={get(errors, "date.message")}>
                  <CDatePicker
                    control={control}
                    name="date"
                    placeholder="YYYY-MM-DD"
                    format="iso"
                  />
                </FormField>
              )}
            </SpaceBetween>
          </Form>
        </form>
      </Container>
    </ContentLayout>
  )
}
