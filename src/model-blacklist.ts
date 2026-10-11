import fs from "node:fs"
import path from "node:path"
import { configDirPath } from "./config"

const blacklistPath = path.join(configDirPath, "model-blacklist.json")

export function getBlacklistedModelIds(): string[] {
  if (!fs.existsSync(blacklistPath)) return []

  try {
    const value: unknown = JSON.parse(fs.readFileSync(blacklistPath, "utf8"))
    if (!Array.isArray(value)) return []
    return [
      ...new Set(value.filter((id): id is string => typeof id === "string")),
    ]
  } catch {
    return []
  }
}

export function addModelToBlacklist(modelId: string) {
  const modelIds = getBlacklistedModelIds()
  if (modelIds.includes(modelId)) return false

  fs.mkdirSync(configDirPath, { recursive: true, mode: 0o700 })
  fs.writeFileSync(
    blacklistPath,
    `${JSON.stringify([...modelIds, modelId], null, 2)}\n`,
    { mode: 0o600 }
  )
  return true
}

export function resetModelBlacklist() {
  if (!fs.existsSync(blacklistPath)) return 0

  const count = getBlacklistedModelIds().length
  fs.unlinkSync(blacklistPath)
  return count
}
