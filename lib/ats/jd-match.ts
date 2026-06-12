// Deterministic JD ↔ resume keyword matching. No LLM on this path — fast, free,
// offline. Tokenizes the JD, normalizes via the skills dictionary, scores by
// weighted coverage, and surfaces the gap (JD terms absent from the resume).

import type { JdMatch, JdMatchedTerm, JdMissingTerm } from '@/types/ats'
import { getAliasIndex } from './skills-dictionary'

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Count occurrences of a dictionary term (canonical or any alias) in text.
function countTerm(textLower: string, canonical: string, aliases: string[]): number {
  let count = 0
  const unique = Array.from(new Set(aliases))
  for (const alias of unique) {
    const re = new RegExp(`(^|[^a-z0-9+#])${escapeRe(alias)}([^a-z0-9+#]|$)`, 'gi')
    const matches = textLower.match(re)
    if (matches) count += matches.length
  }
  return count
}

// Build canonical -> aliases map (including the canonical itself).
function canonicalAliasMap(): Map<string, string[]> {
  const index = getAliasIndex()
  const map = new Map<string, string[]>()
  for (const [alias, canonical] of index.entries()) {
    const list = map.get(canonical) ?? []
    list.push(alias)
    map.set(canonical, list)
  }
  return map
}

export function matchJd(resumeText: string, jdText: string): JdMatch {
  const resumeLower = resumeText.toLowerCase()
  const jdLower = jdText.toLowerCase()
  const aliasMap = canonicalAliasMap()

  const matched: JdMatchedTerm[] = []
  const missing: JdMissingTerm[] = []
  let totalWeight = 0
  let matchedWeight = 0

  for (const [canonical, aliases] of aliasMap.entries()) {
    const jdCount = countTerm(jdLower, canonical, aliases)
    if (jdCount === 0) continue

    // Weight by sqrt of JD frequency so one heavily-repeated term doesn't dominate.
    const weight = Math.sqrt(jdCount)
    totalWeight += weight

    const resumeCount = countTerm(resumeLower, canonical, aliases)
    if (resumeCount > 0) {
      matchedWeight += weight
      matched.push({ term: canonical, jdCount, resumeCount })
    } else {
      missing.push({ term: canonical, jdCount })
    }
  }

  matched.sort((a, b) => b.jdCount - a.jdCount || a.term.localeCompare(b.term))
  missing.sort((a, b) => b.jdCount - a.jdCount || a.term.localeCompare(b.term))

  const score = totalWeight === 0 ? 0 : Math.round((100 * matchedWeight) / totalWeight)

  return { score, matched, missing }
}
