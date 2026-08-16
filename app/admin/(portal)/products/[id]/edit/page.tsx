"use client"

import { useParams } from "next/navigation"
import ProductFormPage from "@/app/admin/_components/pages/ProductFormPage"

export default function EditProductPage() {
  const params = useParams<{ id: string }>()
  return <ProductFormPage productId={params.id} />
}
