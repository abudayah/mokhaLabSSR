import BlogPostFormPage from "../../../../_components/pages/BlogPostFormPage"

export const metadata = { title: "Edit Post – mokhaLab Admin" }

interface Props {
  params: { id: string }
}

export default function Page({ params }: Props) {
  return <BlogPostFormPage postId={params.id} />
}
