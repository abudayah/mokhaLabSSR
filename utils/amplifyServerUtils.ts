import { createServerRunner } from "@aws-amplify/adapter-nextjs"
import outputs from "@/amplify_outputs.json"

/**
 * Creates an isolated server-side Amplify context for each request.
 * Use `runWithAmplifyServerContext` in Server Components, Route Handlers,
 * and middleware to call Amplify server APIs.
 *
 * @see https://docs.amplify.aws/nextjs/build-a-backend/server-side-rendering/
 */
export const { runWithAmplifyServerContext } = createServerRunner({
  config: outputs,
})
