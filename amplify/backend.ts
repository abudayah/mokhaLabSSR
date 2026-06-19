import { defineBackend } from "@aws-amplify/backend"
import { auth } from "./auth/resource.js"
import { data } from "./data/resource.js"
import { storage } from "./storage/resource.js"
import { contactFunction } from "./functions/contact/resource.js"
import { supportFunction } from "./functions/support/resource.js"
import { PolicyStatement, Effect, AnyPrincipal } from "aws-cdk-lib/aws-iam"
import {
  HttpApi,
  HttpMethod,
  CorsHttpMethod,
} from "aws-cdk-lib/aws-apigatewayv2"
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations"

const backend = defineBackend({
  auth,
  data,
  storage,
  contactFunction,
  supportFunction,
})

// Allow public (unauthenticated) read access to blog-images/* so the
// public blog can serve featured images directly without signed URLs.
const { bucket } = backend.storage.resources

// Disable the S3 "Block Public Access" setting so the bucket policy below
// can take effect. Amplify enables this by default.
const cfnBucket = bucket.node.defaultChild as import("aws-cdk-lib/aws-s3").CfnBucket
cfnBucket.publicAccessBlockConfiguration = {
  blockPublicAcls: false,
  blockPublicPolicy: false,
  ignorePublicAcls: false,
  restrictPublicBuckets: false,
}

bucket.addToResourcePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    principals: [new AnyPrincipal()],
    actions: ["s3:GetObject"],
    resources: [`${bucket.bucketArn}/blog-images/*`],
  })
)

// ── Contact API ───────────────────────────────────────────────────────────────
// Create an HTTP API Gateway that proxies POST /contact to the Lambda function.
const contactStack = backend.createStack("contact-api-stack")

const contactLambda = backend.contactFunction.resources.lambda

// Grant the Lambda permission to send email via SES
contactLambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ["ses:SendEmail", "ses:SendRawEmail"],
    resources: ["*"],
  })
)

const httpApi = new HttpApi(contactStack, "ContactHttpApi", {
  apiName: "mokhalab-contact-api",
  corsPreflight: {
    allowOrigins: ["*"],
    allowMethods: [CorsHttpMethod.POST, CorsHttpMethod.OPTIONS],
    allowHeaders: ["Content-Type"],
  },
})

httpApi.addRoutes({
  path: "/contact",
  methods: [HttpMethod.POST, HttpMethod.OPTIONS],
  integration: new HttpLambdaIntegration("ContactIntegration", contactLambda),
})

// ── Support API ───────────────────────────────────────────────────────────────

const supportStack = backend.createStack("support-api-stack")
const supportLambda = backend.supportFunction.resources.lambda

// Grant SES send permissions
supportLambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ["ses:SendEmail", "ses:SendRawEmail"],
    resources: ["*"],
  })
)

const supportHttpApi = new HttpApi(supportStack, "SupportHttpApi", {
  apiName: "mokhalab-support-api",
  corsPreflight: {
    allowOrigins: ["*"],
    allowMethods: [CorsHttpMethod.POST, CorsHttpMethod.OPTIONS],
    allowHeaders: ["Content-Type"],
  },
})

supportHttpApi.addRoutes({
  path: "/support",
  methods: [HttpMethod.POST, HttpMethod.OPTIONS],
  integration: new HttpLambdaIntegration("SupportIntegration", supportLambda),
})

backend.addOutput({
  custom: {
    contactApiUrl: `${httpApi.apiEndpoint}/contact`,
    supportApiUrl: `${supportHttpApi.apiEndpoint}/support`,
  },
})
