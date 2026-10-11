/** Normalize either an OpenAI-compatible API base URL or endpoint URL. */
export function getOpenAICompatibleBaseURL(url: string) {
  return url
    .replace(/\/+$/, "")
    .replace(/\/(?:chat\/completions|models)$/i, "")
}
