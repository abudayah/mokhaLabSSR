"use client"

import { useParams } from "next/navigation"
import QrLinkDetailPage from "@/app/admin/_components/pages/QrLinkDetailPage"

export default function Page() {
  const params = useParams<{ id: string }>()
  return <QrLinkDetailPage id={params.id} />
}
