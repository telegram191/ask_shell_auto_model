import process from "node:process"
import type { Config } from "./config"
import { CliError } from "./error"
import { getOllamaModels } from "./ollama"
import { getOpenAICompatibleBaseURL } from "./openai-compatible"

export type ModelInfo = {
  id: string
  realId?: string
  openaiCompatible?: boolean
}

export const MODEL_MAP: {
  [prefix: string]: ModelInfo[]
} = {
  gpt: [
    {
      id: "gpt-3.5-turbo",
    },
    {
      id: "gpt-4-turbo",
    },
    {
      id: "gpt-4o",
    },
    {
      id: "gpt-4o-mini",
    },
  ],
  openai: [
    {
      id: "openai-o1",
    },
    {
      id: "openai-o1-mini",
    },
    {
      id: "openai-o1-preview",
    },
    {
      id: "openai-o3-mini",
    },
  ],
  claude: [
    {
      id: "claude-3-haiku",
      realId: "claude-3-haiku-20240307",
    },
    {
      id: "claude-3-sonnet",
      realId: "claude-3-sonnet-20240229",
    },
    {
      id: "claude-3-opus",
      realId: "claude-3-opus-20240229",
    },
    {
      id: "claude-3.5-haiku",
      realId: "claude-3-5-haiku-latest",
    },
    {
      id: "claude-3.5-sonnet",
      realId: "claude-3-5-sonnet-latest",
    },
  ],
  gemini: [
    {
      id: "gemini-2.0-flash",
      realId: "gemini-2.0-flash-exp",
    },
    {
      id: "gemini-2.0-flash-thinking",
      realId: "gemini-2.0-flash-thinking-exp",
    },
    {
      id: "gemini-1.5-pro",
      realId: "gemini-1.5-pro-latest",
    },
    {
      id: "gemini-1.5-flash",
      realId: "gemini-1.5-flash-latest",
    },
    {
      id: "gemini-pro",
    },
  ],
  groq: [
    {
      id: "groq-llama-3.3-70b",
      realId: "groq-llama-3.3-70b-versatile",
    },
    {
      id: "groq-llama-3.1-8b",
      realId: "groq-llama-3.1-8b-instant",
    },
    {
      id: "groq-llama3",
      realId: "groq-llama3-70b-8192",
    },
    {
      id: "groq-llama3-8b",
      realId: "groq-llama3-8b-8192",
    },
    {
      id: "groq-llama3-70b",
      realId: "groq-llama3-70b-8192",
    },
    {
      id: "groq-mixtral-8x7b",
      realId: "groq-mixtral-8x7b-32768",
    },
    {
      id: "groq-gemma",
      realId: "groq-gemma-7b-it",
    },
    {
      id: "groq-gemma-7b",
      realId: "groq-gemma-7b-it",
    },
  ],
  copilot: [
    {
      id: "copilot-gpt-4",
      realId: "gpt-4",
    },
    {
      id: "copilot-gpt-4o",
      realId: "gpt-4o",
    },
    {
      id: "copilot-o1-mini",
      realId: "o1-mini",
    },
    {
      id: "copilot-o1-preview",
      realId: "o1-preview",
    },
    {
      id: "copilot-o3-mini",
      realId: "o3-mini",
    },
    {
      id: "copilot-claude-3.5-sonnet",
      realId: "claude-3.5-sonnet",
    },
  ],
}

export const MODELS = Object.values(MODEL_MAP).flat()

export const MODEL_PREFIXES = Object.keys(MODEL_MAP)

export async function getAllModels(
  includeOllama?: boolean | "required",
  config?: Config
) {
  const customOpenAIModels = await getOpenAICompatibleModels(config)
  const customModelIds = new Set(customOpenAIModels.map((model) => model.id))
  let models = [
    ...customOpenAIModels,
    ...MODELS.filter((model) => !customModelIds.has(model.id)),
  ]

  if (includeOllama) {
    const ollamaModels = await getOllamaModels()
    if (ollamaModels.length === 0 && includeOllama === "required") {
      throw new CliError("no Ollama models available")
    }
    models = [...models, ...ollamaModels]
  }

  return models
}

async function getOpenAICompatibleModels(config?: Config): Promise<ModelInfo[]> {
  const configuredURL = config?.openai_api_url || process.env.OPENAI_API_URL
  if (!configuredURL) return []
  const baseURL = getOpenAICompatibleBaseURL(configuredURL)

  const apiKey = config?.openai_api_key || process.env.OPENAI_API_KEY
  const headers = new Headers()
  if (apiKey) headers.set("Authorization", `Bearer ${apiKey}`)

  let response: Response
  try {
    response = await fetch(`${baseURL.replace(/\/+$/, "")}/models`, { headers })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new CliError(`failed to fetch models from openai_api_url: ${message}`)
  }

  if (!response.ok) {
    throw new CliError(
      `failed to fetch models from openai_api_url: HTTP ${response.status}`
    )
  }

  let result: { data?: Array<{ id?: unknown }> }
  try {
    result = (await response.json()) as { data?: Array<{ id?: unknown }> }
  } catch {
    throw new CliError("openai_api_url returned invalid JSON from /models")
  }

  if (!Array.isArray(result.data)) {
    throw new CliError("openai_api_url /models response must contain a data array")
  }

  const modelIds = new Set(
    result.data
      .map((model) => model.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
  )

  return [...modelIds].map((id) => ({ id, openaiCompatible: true }))
}

export function getCheapModelId(modelId: string) {
  if (modelId.startsWith("gpt-")) return "gpt-4o-mini"

  if (modelId.startsWith("claude-")) return "claude-3-haiku-20240307"

  if (modelId.startsWith("gemini-")) return "gemini-pro"

  if (modelId.startsWith("groq-")) return "groq-llama3-8b-8192"

  if (modelId.startsWith("copilot-")) return "copilot-gpt-4o"

  if (modelId.startsWith("openai-")) return "gpt-4o-mini"

  return modelId
}

export function toProviderModelId(modelId: string) {
  if (modelId.startsWith("groq-")) {
    return modelId.replace("groq-", "")
  }
  return modelId
}
