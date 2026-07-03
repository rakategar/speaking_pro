import { InferenceClient } from "@huggingface/inference";

// Server-only. HF_TOKEN must never reach the client bundle -- these
// helpers are only imported from Route Handlers.
export const hasHfToken = Boolean(process.env.HF_TOKEN);

let client: InferenceClient | null = null;

export function getHfClient(): InferenceClient {
  if (!client) {
    client = new InferenceClient(process.env.HF_TOKEN);
  }
  return client;
}
