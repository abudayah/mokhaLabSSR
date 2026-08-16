"use client"

import { useRef, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray, Controller, get, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import ContentLayout from "@cloudscape-design/components/content-layout"
import Header from "@cloudscape-design/components/header"
import Form from "@cloudscape-design/components/form"
import FormField from "@cloudscape-design/components/form-field"
import Input from "@cloudscape-design/components/input"
import Textarea from "@cloudscape-design/components/textarea"
import Button from "@cloudscape-design/components/button"
import SpaceBetween from "@cloudscape-design/components/space-between"
import ColumnLayout from "@cloudscape-design/components/column-layout"
import Checkbox from "@cloudscape-design/components/checkbox"
import TokenGroup from "@cloudscape-design/components/token-group"
import Spinner from "@cloudscape-design/components/spinner"
import Alert from "@cloudscape-design/components/alert"
import Container from "@cloudscape-design/components/container"
import Box from "@cloudscape-design/components/box"
import { productSchema, type ProductFormData } from "@/app/admin/_components/schemas/productSchema"
import { useProductStore } from "@/app/admin/_components/context/useProductStore"
import { useNotifications } from "@/app/admin/_components/context/NotificationContext"
import { generateSlug } from "@/app/admin/_components/utils/slugUtils"
import type { ProductDB } from "@/lib/products-db"
import { machines53and54, machines58 } from "@/lib/machines"
import ProductImageUploader from "@/app/admin/_components/ProductImageUploader"

// ---------------------------------------------------------------------------
// toFormData — reverse-maps a ProductDB into ProductFormData defaults
// ---------------------------------------------------------------------------
function toFormData(product: ProductDB): ProductFormData {
  // Reverse-map compatibleMachines back to preset keys
  const compatiblePresets: Array<"53-54mm" | "58mm"> = []
  if (product.compatibleMachines.some((m) => machines53and54.includes(m))) {
    compatiblePresets.push("53-54mm")
  }
  if (product.compatibleMachines.some((m) => machines58.includes(m))) {
    compatiblePresets.push("58mm")
  }

  return {
    name: product.name,
    slug: product.slug,
    tagline: product.tagline,
    description: product.description,
    priceUSD: product.priceUSD,
    priceCAD: product.priceCAD,
    image: product.image,
    images: product.images ?? [],
    amazonUrlUS: product.amazonUrlUS ?? "",
    amazonUrlCA: product.amazonUrlCA ?? "",
    availableUS: product.availableUS,
    availableCA: product.availableCA,
    features: product.features,
    specs: product.specs,
    compatiblePresets,
    relatedIds: product.relatedIds ?? [],
    variantIds: product.variantIds ?? [],
    youtubeId: product.youtubeId ?? undefined,
    rating: product.rating ?? undefined,
    ratingCount: product.ratingCount ?? undefined,
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface ProductFormPageProps {
  productId?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ProductFormPage({ productId }: ProductFormPageProps) {
  const isEditMode = !!productId
  const router = useRouter()

  const { loading, getProductById, getProductBySlug, createProduct, updateProduct } =
    useProductStore()
  const { addNotification } = useNotifications()

  const slugManuallyEdited = useRef<boolean>(false)
  const hasReset = useRef<boolean>(false)

  // Local state for "add" inputs in token group sections
  const [newRelatedIdInput, setNewRelatedIdInput] = useState("")
  const [newVariantIdInput, setNewVariantIdInput] = useState("")

  const {
    control,
    handleSubmit,
    setValue,
    setError,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as Resolver<ProductFormData>,
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      slug: "",
      tagline: "",
      description: "",
      priceUSD: 0,
      priceCAD: 0,
      image: "",
      images: [],
      amazonUrlUS: "",
      amazonUrlCA: "",
      availableUS: true,
      availableCA: true,
      features: [],
      specs: [],
      compatiblePresets: [],
      relatedIds: [],
      variantIds: [],
      youtubeId: undefined,
      rating: undefined,
      ratingCount: undefined,
    },
  })

  // Field arrays — only for object arrays (features, specs)
  const {
    fields: featureFields,
    append: appendFeature,
    remove: removeFeature,
  } = useFieldArray({ control, name: "features" })

  const {
    fields: specFields,
    append: appendSpec,
    remove: removeSpec,
  } = useFieldArray({ control, name: "specs" })

  // String arrays are managed via Controller + watch
  const imagesValue = watch("images") ?? []
  const relatedIdsValue = watch("relatedIds") ?? []
  const variantIdsValue = watch("variantIds") ?? []

  // Edit mode: populate form once the product is available
  useEffect(() => {
    if (!isEditMode || hasReset.current || loading) return
    const product = getProductById(productId!)
    if (!product) return
    reset(toFormData(product))
    slugManuallyEdited.current = true // don't overwrite slug from name in edit mode
    hasReset.current = true
  }, [isEditMode, loading, productId, getProductById, reset])

  // ---------------------------------------------------------------------------
  // Slug auto-generation on Name blur
  // ---------------------------------------------------------------------------
  function handleNameBlur(name: string) {
    if (!isEditMode && !slugManuallyEdited.current) {
      setValue("slug", generateSlug(name), { shouldValidate: true })
    }
  }

  // ---------------------------------------------------------------------------
  // Slug async uniqueness check on Slug blur
  // ---------------------------------------------------------------------------
  function handleSlugBlur(slug: string) {
    if (!slug) return
    const existing = getProductBySlug(slug)
    if (existing && existing.id !== productId) {
      setError("slug", { message: "Slug is already in use" })
    }
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------
  async function onSubmit(data: ProductFormData) {
    try {
      if (isEditMode && productId) {
        await updateProduct(productId, data)
        addNotification({
          type: "success",
          content: `"${data.name}" was updated successfully.`,
          dismissible: true,
        })
      } else {
        await createProduct(data)
        addNotification({
          type: "success",
          content: `"${data.name}" was created successfully.`,
          dismissible: true,
        })
      }
      router.push("/admin/products")
    } catch {
      addNotification({
        type: "error",
        content: `Failed to ${isEditMode ? "update" : "create"} product. Please try again.`,
        dismissible: true,
      })
    }
  }

  // ---------------------------------------------------------------------------
  // Loading / not-found states (edit mode only)
  // ---------------------------------------------------------------------------
  if (isEditMode && loading) {
    return (
      <ContentLayout header={<Header variant="h1">Edit Product</Header>}>
        <Box textAlign="center" padding="xl">
          <Spinner size="large" />
        </Box>
      </ContentLayout>
    )
  }

  if (isEditMode && !loading && !getProductById(productId!)) {
    return (
      <ContentLayout header={<Header variant="h1">Edit Product</Header>}>
        <Alert
          type="error"
          header="Product not found"
          action={
            <Button variant="inline-link" onClick={() => router.push("/admin/products")}>
              Back to Products
            </Button>
          }
        >
          No product with ID &quot;{productId}&quot; was found.
        </Alert>
      </ContentLayout>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <ContentLayout
      header={
        <Header variant="h1">{isEditMode ? "Edit Product" : "Create New Product"}</Header>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Form
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                variant="link"
                formAction="none"
                onClick={() => router.push("/admin/products")}
              >
                Cancel
              </Button>
              <Button variant="primary" formAction="submit" loading={isSubmitting}>
                {isEditMode ? "Save changes" : "Create product"}
              </Button>
            </SpaceBetween>
          }
        >
          <SpaceBetween size="l">
            {/* ----------------------------------------------------------------
                Section 1: Basic Info
            ---------------------------------------------------------------- */}
            <Container header={<Header variant="h2">Basic Info</Header>}>
              <SpaceBetween size="m">
                {/* Name */}
                <FormField label="Name" errorText={get(errors, "name.message")}>
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <Input
                        value={field.value}
                        onChange={(e) => field.onChange(e.detail.value)}
                        onBlur={() => {
                          field.onBlur()
                          handleNameBlur(field.value)
                        }}
                      />
                    )}
                  />
                </FormField>

                {/* Slug */}
                <FormField label="Slug" errorText={get(errors, "slug.message")}>
                  <Controller
                    name="slug"
                    control={control}
                    render={({ field }) => (
                      <Input
                        value={field.value}
                        onChange={(e) => {
                          slugManuallyEdited.current = true
                          field.onChange(e.detail.value)
                        }}
                        onBlur={() => {
                          field.onBlur()
                          handleSlugBlur(field.value)
                        }}
                      />
                    )}
                  />
                </FormField>

                {/* Tagline */}
                <FormField label="Tagline" errorText={get(errors, "tagline.message")}>
                  <Controller
                    name="tagline"
                    control={control}
                    render={({ field }) => (
                      <Input
                        value={field.value}
                        onChange={(e) => field.onChange(e.detail.value)}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                </FormField>

                {/* Description */}
                <FormField label="Description" errorText={get(errors, "description.message")}>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        value={field.value}
                        onChange={(e) => field.onChange(e.detail.value)}
                        onBlur={field.onBlur}
                        rows={5}
                      />
                    )}
                  />
                </FormField>
              </SpaceBetween>
            </Container>

            {/* ----------------------------------------------------------------
                Section 2: Pricing
            ---------------------------------------------------------------- */}
            <Container header={<Header variant="h2">Pricing</Header>}>
              <ColumnLayout columns={2}>
                <FormField label="USD Price" errorText={get(errors, "priceUSD.message")}>
                  <Controller
                    name="priceUSD"
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="number"
                        value={String(field.value ?? 0)}
                        onChange={(e) => field.onChange(parseFloat(e.detail.value) || 0)}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                </FormField>

                <FormField label="CAD Price" errorText={get(errors, "priceCAD.message")}>
                  <Controller
                    name="priceCAD"
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="number"
                        value={String(field.value ?? 0)}
                        onChange={(e) => field.onChange(parseFloat(e.detail.value) || 0)}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                </FormField>
              </ColumnLayout>
            </Container>

            {/* ----------------------------------------------------------------
                Section 3: Images
            ---------------------------------------------------------------- */}
            <Container header={<Header variant="h2">Images</Header>}>
              <FormField errorText={get(errors, "image.message")}>
                <Controller
                  name="image"
                  control={control}
                  render={({ field }) => (
                    <ProductImageUploader
                      images={imagesValue}
                      mainImage={field.value}
                      productId={productId}
                      onChange={(newImages, newMain) => {
                        field.onChange(newMain)
                        setValue("images", newImages)
                      }}
                    />
                  )}
                />
              </FormField>
            </Container>

            {/* ----------------------------------------------------------------
                Section 4: Amazon Links & Availability
            ---------------------------------------------------------------- */}
            <Container header={<Header variant="h2">Amazon Links &amp; Availability</Header>}>
              <SpaceBetween size="m">
                <FormField
                  label={<>Amazon URL (US) <i>- optional</i></>}
                  errorText={get(errors, "amazonUrlUS.message")}
                >
                  <Controller
                    name="amazonUrlUS"
                    control={control}
                    render={({ field }) => (
                      <Input
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.detail.value)}
                        onBlur={field.onBlur}
                        placeholder="https://www.amazon.com/dp/..."
                      />
                    )}
                  />
                </FormField>

                <FormField
                  label={<>Amazon URL (CA) <i>- optional</i></>}
                  errorText={get(errors, "amazonUrlCA.message")}
                >
                  <Controller
                    name="amazonUrlCA"
                    control={control}
                    render={({ field }) => (
                      <Input
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.detail.value)}
                        onBlur={field.onBlur}
                        placeholder="https://www.amazon.ca/dp/..."
                      />
                    )}
                  />
                </FormField>

                <FormField label="Availability">
                  <SpaceBetween size="xs">
                    <Controller
                      name="availableUS"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          checked={!!field.value}
                          onChange={() => field.onChange(!field.value)}
                        >
                          Available in US
                        </Checkbox>
                      )}
                    />
                    <Controller
                      name="availableCA"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          checked={!!field.value}
                          onChange={() => field.onChange(!field.value)}
                        >
                          Available in Canada
                        </Checkbox>
                      )}
                    />
                  </SpaceBetween>
                </FormField>
              </SpaceBetween>
            </Container>

            {/* ----------------------------------------------------------------
                Section 5: Features
            ---------------------------------------------------------------- */}
            <Container header={<Header variant="h2">Features</Header>}>
              <SpaceBetween size="m">
                {typeof get(errors, "features.message") === "string" && (
                  <Box color="text-status-error">{get(errors, "features.message")}</Box>
                )}
                {featureFields.map((field, index) => (
                  <SpaceBetween key={field.id} direction="horizontal" size="xs">
                    <FormField
                      label={index === 0 ? "Title" : ""}
                      errorText={get(errors, `features.${index}.title.message`)}
                    >
                      <Controller
                        name={`features.${index}.title`}
                        control={control}
                        render={({ field: f }) => (
                          <Input
                            value={f.value}
                            onChange={(e) => f.onChange(e.detail.value)}
                            onBlur={f.onBlur}
                            placeholder="Feature title"
                          />
                        )}
                      />
                    </FormField>

                    <FormField
                      label={index === 0 ? "Description" : ""}
                      errorText={get(errors, `features.${index}.description.message`)}
                    >
                      <Controller
                        name={`features.${index}.description`}
                        control={control}
                        render={({ field: f }) => (
                          <Input
                            value={f.value}
                            onChange={(e) => f.onChange(e.detail.value)}
                            onBlur={f.onBlur}
                            placeholder="Feature description"
                          />
                        )}
                      />
                    </FormField>

                    <Box padding={{ top: index === 0 ? "xl" : "xs" }}>
                      <Button
                        formAction="none"
                        variant="icon"
                        iconName="close"
                        ariaLabel="Remove feature"
                        onClick={() => removeFeature(index)}
                      />
                    </Box>
                  </SpaceBetween>
                ))}

                <Button
                  formAction="none"
                  iconName="add-plus"
                  onClick={() => appendFeature({ icon: "zap", title: "", description: "" })}
                >
                  Add feature
                </Button>
              </SpaceBetween>
            </Container>

            {/* ----------------------------------------------------------------
                Section 6: Specs
            ---------------------------------------------------------------- */}
            <Container header={<Header variant="h2">Specs</Header>}>
              <SpaceBetween size="m">
                {typeof get(errors, "specs.message") === "string" && (
                  <Box color="text-status-error">{get(errors, "specs.message")}</Box>
                )}
                {specFields.map((field, index) => (
                  <SpaceBetween key={field.id} direction="horizontal" size="xs">
                    <FormField
                      label={index === 0 ? "Label" : ""}
                      errorText={get(errors, `specs.${index}.label.message`)}
                    >
                      <Controller
                        name={`specs.${index}.label`}
                        control={control}
                        render={({ field: f }) => (
                          <Input
                            value={f.value}
                            onChange={(e) => f.onChange(e.detail.value)}
                            onBlur={f.onBlur}
                            placeholder="Spec label"
                          />
                        )}
                      />
                    </FormField>

                    <FormField
                      label={index === 0 ? "Value" : ""}
                      errorText={get(errors, `specs.${index}.value.message`)}
                    >
                      <Controller
                        name={`specs.${index}.value`}
                        control={control}
                        render={({ field: f }) => (
                          <Input
                            value={f.value}
                            onChange={(e) => f.onChange(e.detail.value)}
                            onBlur={f.onBlur}
                            placeholder="Spec value"
                          />
                        )}
                      />
                    </FormField>

                    <Box padding={{ top: index === 0 ? "xl" : "xs" }}>
                      <Button
                        formAction="none"
                        variant="icon"
                        iconName="close"
                        ariaLabel="Remove spec"
                        onClick={() => removeSpec(index)}
                      />
                    </Box>
                  </SpaceBetween>
                ))}

                <Button
                  formAction="none"
                  iconName="add-plus"
                  onClick={() => appendSpec({ label: "", value: "" })}
                >
                  Add spec
                </Button>
              </SpaceBetween>
            </Container>

            {/* ----------------------------------------------------------------
                Section 7: Compatible Machines
            ---------------------------------------------------------------- */}
            <Container header={<Header variant="h2">Compatible Machines</Header>}>
              <FormField label="Machine Presets">
                <Controller
                  name="compatiblePresets"
                  control={control}
                  render={({ field }) => {
                    const presets = field.value ?? []
                    return (
                      <SpaceBetween size="xs">
                        <Checkbox
                          checked={presets.includes("53-54mm")}
                          onChange={() => {
                            const next = presets.includes("53-54mm")
                              ? presets.filter((p) => p !== "53-54mm")
                              : ([...presets, "53-54mm"] as Array<"53-54mm" | "58mm">)
                            field.onChange(next)
                          }}
                        >
                          53/54mm machines
                        </Checkbox>
                        <Checkbox
                          checked={presets.includes("58mm")}
                          onChange={() => {
                            const next = presets.includes("58mm")
                              ? presets.filter((p) => p !== "58mm")
                              : ([...presets, "58mm"] as Array<"53-54mm" | "58mm">)
                            field.onChange(next)
                          }}
                        >
                          58mm machines
                        </Checkbox>
                      </SpaceBetween>
                    )
                  }}
                />
              </FormField>
            </Container>

            {/* ----------------------------------------------------------------
                Section 8: Related IDs, Variant IDs & Optional Fields
            ---------------------------------------------------------------- */}
            <Container header={<Header variant="h2">Relations &amp; Optional</Header>}>
              <SpaceBetween size="m">
                {/* Related Product IDs — string array */}
                <FormField
                  label={<>Related Product IDs <i>- optional</i></>}
                  errorText={get(errors, "relatedIds.message")}
                >
                  <SpaceBetween size="xs">
                    <SpaceBetween direction="horizontal" size="xs">
                      <Input
                        value={newRelatedIdInput}
                        onChange={(e) => setNewRelatedIdInput(e.detail.value)}
                        placeholder="product-slug-or-id"
                      />
                      <Button
                        formAction="none"
                        onClick={() => {
                          const val = newRelatedIdInput.trim()
                          if (val) {
                            setValue("relatedIds", [...relatedIdsValue, val])
                            setNewRelatedIdInput("")
                          }
                        }}
                      >
                        Add
                      </Button>
                    </SpaceBetween>
                    {relatedIdsValue.length > 0 && (
                      <TokenGroup
                        items={relatedIdsValue.map((id, i) => ({
                          label: id,
                          dismissLabel: `Remove related ID ${i + 1}`,
                        }))}
                        onDismiss={({ detail }) => {
                          const next = relatedIdsValue.filter((_, i) => i !== detail.itemIndex)
                          setValue("relatedIds", next)
                        }}
                      />
                    )}
                  </SpaceBetween>
                </FormField>

                {/* Variant IDs — string array */}
                <FormField
                  label={<>Variant IDs <i>- optional</i></>}
                  errorText={get(errors, "variantIds.message")}
                >
                  <SpaceBetween size="xs">
                    <SpaceBetween direction="horizontal" size="xs">
                      <Input
                        value={newVariantIdInput}
                        onChange={(e) => setNewVariantIdInput(e.detail.value)}
                        placeholder="variant-slug-or-id"
                      />
                      <Button
                        formAction="none"
                        onClick={() => {
                          const val = newVariantIdInput.trim()
                          if (val) {
                            setValue("variantIds", [...variantIdsValue, val])
                            setNewVariantIdInput("")
                          }
                        }}
                      >
                        Add
                      </Button>
                    </SpaceBetween>
                    {variantIdsValue.length > 0 && (
                      <TokenGroup
                        items={variantIdsValue.map((id, i) => ({
                          label: id,
                          dismissLabel: `Remove variant ID ${i + 1}`,
                        }))}
                        onDismiss={({ detail }) => {
                          const next = variantIdsValue.filter((_, i) => i !== detail.itemIndex)
                          setValue("variantIds", next)
                        }}
                      />
                    )}
                  </SpaceBetween>
                </FormField>

                {/* YouTube ID */}
                <FormField
                  label={<>YouTube ID <i>- optional</i></>}
                  errorText={get(errors, "youtubeId.message")}
                  constraintText="The video ID from the YouTube URL (e.g. dQw4w9WgXcQ)"
                >
                  <Controller
                    name="youtubeId"
                    control={control}
                    render={({ field }) => (
                      <Input
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.detail.value || undefined)}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                </FormField>

                {/* Rating & Rating Count */}
                <ColumnLayout columns={2}>
                  <FormField
                    label={<>Rating <i>- optional</i></>}
                    errorText={get(errors, "rating.message")}
                    constraintText="0–5"
                  >
                    <Controller
                      name="rating"
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          value={field.value !== undefined ? String(field.value) : ""}
                          onChange={(e) => {
                            const val = parseFloat(e.detail.value)
                            field.onChange(isNaN(val) ? undefined : val)
                          }}
                          onBlur={field.onBlur}
                        />
                      )}
                    />
                  </FormField>

                  <FormField
                    label={<>Rating Count <i>- optional</i></>}
                    errorText={get(errors, "ratingCount.message")}
                  >
                    <Controller
                      name="ratingCount"
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          value={field.value !== undefined ? String(field.value) : ""}
                          onChange={(e) => {
                            const val = parseInt(e.detail.value, 10)
                            field.onChange(isNaN(val) ? undefined : val)
                          }}
                          onBlur={field.onBlur}
                        />
                      )}
                    />
                  </FormField>
                </ColumnLayout>
              </SpaceBetween>
            </Container>
          </SpaceBetween>
        </Form>
      </form>
    </ContentLayout>
  )
}
