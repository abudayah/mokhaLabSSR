import { defineBackend } from "@aws-amplify/backend"
import { auth } from "./auth/resource.js"
import { data } from "./data/resource.js"
import { storage } from "./storage/resource.js"
import { PolicyStatement, Effect, AnyPrincipal } from "aws-cdk-lib/aws-iam"

const backend = defineBackend({
  auth,
  data,
  storage,
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
