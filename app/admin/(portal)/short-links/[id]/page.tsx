"use client"
import { useParams } from "next/navigation"
import ShortLinkDetailPage from "@/app/admin/_components/pages/ShortLinkDetailPage"
export default function Page() {
  const params = useParams<{ id: string }>()
  return <ShortLinkDetailPage id={params.id} />
}
