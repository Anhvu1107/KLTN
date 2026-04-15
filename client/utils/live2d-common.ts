type Live2DExpressionDefinition = {
  Name?: string
  File?: string
}

type Live2DMotionDefinition = Record<string, unknown>

type Live2DGroupDefinition = {
  Target?: string
  Name?: string
  Ids?: string[]
}

export type Live2DModelDefinition = {
  FileReferences?: {
    Expressions?: Live2DExpressionDefinition[]
    Motions?: Record<string, Live2DMotionDefinition[]>
  }
  Groups?: Live2DGroupDefinition[]
}

export const DEFAULT_LIPSYNC_PARAM_IDS = [
  'ParamMouthOpenY',
  'PARAM_MOUTH_OPEN_Y',
  'ParamMouthOpen',
  'PARAM_MOUTH_OPEN',
] as const

export const COMMON_EXPRESSION_BY_MOOD = {
  neutral: 'exp_00',
  smile: 'exp_01',
  serious: 'exp_02',
  soft: 'exp_04',
  curious: 'exp_05',
  delighted: 'exp_06',
} as const

export const COMMON_GESTURE_VARIANTS = {
  greeting: [4, 5],
  nod: [0, 8],
  think: [2, 9],
  happy: [5, 6],
  closing: [0, 5],
  goodbye: [7, 4],
  subtleTalk: [1, 8],
} as const

export type CommonMood = keyof typeof COMMON_EXPRESSION_BY_MOOD
export type CommonGesture = keyof typeof COMMON_GESTURE_VARIANTS

type GesturePlan = {
  group: string
  indexes: number[]
}

export type CommonLive2DBehaviorProfile = {
  availableExpressions: string[]
  lipSyncParamIds: string[]
  idleGroup: string
  idleMotionCount: number
  primaryGestureGroup: string
  primaryGestureMotionCount: number
  expressionByMood: Record<CommonMood, string | null>
  gestureMap: Record<CommonGesture, GesturePlan>
  compatibility: {
    hasLipSync: boolean
    matchedMoods: number
    mappedGestures: number
  }
}

const DEFAULT_IDLE_GROUP = 'Idle'

const MOOD_ALIAS_CANDIDATES: Record<CommonMood, string[]> = {
  neutral: ['exp00', 'normal', 'neutral', 'default', 'base', 'plain', 'standard'],
  smile: ['exp01', 'smile', 'happy', 'joy', 'grin', 'laugh'],
  serious: ['exp02', 'serious', 'angry', 'stern', 'focus', 'focused', 'cool'],
  soft: ['exp04', 'soft', 'gentle', 'calm', 'blushing', 'shy', 'kind'],
  curious: ['exp05', 'curious', 'surprised', 'surprise', 'wonder', 'thinking', 'question'],
  delighted: ['exp06', 'delighted', 'excited', 'happy', 'joy', 'smile', 'sparkle'],
}

const MOOD_FALLBACKS: Record<CommonMood, CommonMood[]> = {
  neutral: [],
  smile: ['neutral'],
  serious: ['neutral'],
  soft: ['neutral', 'smile'],
  curious: ['neutral', 'soft'],
  delighted: ['smile', 'neutral'],
}

const PRIMARY_GESTURE_GROUP_CANDIDATES = [
  '',
  'Tap',
  'Flick',
  'Tap@Head',
  'FlickUp@Head',
  'Tap@Body',
  'Flick@Body',
  'FlickUp',
  'FlickDown',
  'FlickDown@Body',
]

const GESTURE_GROUP_CANDIDATES: Record<CommonGesture, string[]> = {
  greeting: ['Flick', 'FlickUp', 'Tap', '', 'Tap@Head', 'Flick@Body'],
  nod: ['Tap@Head', 'Tap', 'FlickDown', 'FlickDown@Head', '', DEFAULT_IDLE_GROUP],
  think: ['Tap@Head', 'FlickUp@Head', 'FlickUp', 'Tap', '', DEFAULT_IDLE_GROUP],
  happy: ['Flick', 'Tap', 'FlickUp', '', DEFAULT_IDLE_GROUP],
  closing: ['Flick@Body', 'Tap@Body', 'FlickDown@Body', 'Flick', 'Tap', ''],
  goodbye: ['Flick', 'FlickUp', 'Tap', 'Flick@Body', '', DEFAULT_IDLE_GROUP],
  subtleTalk: ['Tap', '', DEFAULT_IDLE_GROUP, 'Flick'],
}

const stripFileExtension = (value = '') =>
  value
    .replace(/\.exp3\.json$/i, '')
    .replace(/\.motion3\.json$/i, '')
    .replace(/\.json$/i, '')

const getFileBaseName = (value = '') => {
  const normalized = value.replace(/\\/g, '/')
  const parts = normalized.split('/')
  return parts[parts.length - 1] || normalized
}

const normalizeKey = (value = '') =>
  stripFileExtension(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')

const unique = <T,>(items: T[]) => Array.from(new Set(items))

const exactIncludes = (candidate: string, tokens: string[]) => tokens.includes(candidate)

const fuzzyIncludes = (candidate: string, tokens: string[]) =>
  tokens.some(token => token.includes(candidate) || candidate.includes(token))

const toExpressionTokens = (expression: Live2DExpressionDefinition) =>
  unique(
    [expression.Name, getFileBaseName(expression.File)]
      .filter((value): value is string => Boolean(value))
      .map(normalizeKey)
      .filter(Boolean),
  )

const findMatchingExpression = (
  expressions: Array<{ name: string; tokens: string[] }>,
  candidates: string[],
) => {
  const normalizedCandidates = candidates.map(normalizeKey).filter(Boolean)

  for (const candidate of normalizedCandidates) {
    const exact = expressions.find(expression => exactIncludes(candidate, expression.tokens))
    if (exact) return exact.name
  }

  for (const candidate of normalizedCandidates) {
    const fuzzy = expressions.find(expression => fuzzyIncludes(candidate, expression.tokens))
    if (fuzzy) return fuzzy.name
  }

  return null
}

const findMatchingGroupName = (availableGroups: string[], candidates: string[]) => {
  for (const candidate of candidates) {
    if (availableGroups.includes(candidate)) {
      return candidate
    }
  }

  const normalizedAvailable = availableGroups.map(group => ({ raw: group, normalized: normalizeKey(group) }))
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeKey(candidate)
    if (!normalizedCandidate) continue
    const match = normalizedAvailable.find(group => group.normalized === normalizedCandidate)
    if (match) return match.raw
  }

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeKey(candidate)
    if (!normalizedCandidate) continue
    const fuzzy = normalizedAvailable.find(group =>
      group.normalized.includes(normalizedCandidate) || normalizedCandidate.includes(group.normalized),
    )
    if (fuzzy) return fuzzy.raw
  }

  return null
}

const buildIndexPool = (count: number, preferredIndexes: readonly number[] = []) => {
  if (count <= 0) return []

  if (!preferredIndexes.length) {
    return Array.from({ length: count }, (_value, index) => index)
  }

  return unique(
    preferredIndexes
      .map(index => ((index % count) + count) % count)
      .filter(index => index < count),
  )
}

const resolveMoodExpressions = (
  expressions: Array<{ name: string; tokens: string[] }>,
): Record<CommonMood, string | null> => {
  const resolved = {} as Record<CommonMood, string | null>

  ;(Object.keys(COMMON_EXPRESSION_BY_MOOD) as CommonMood[]).forEach((mood) => {
    const defaultName = COMMON_EXPRESSION_BY_MOOD[mood]
    const directMatch = findMatchingExpression(expressions, [defaultName])
    if (directMatch) {
      resolved[mood] = directMatch
      return
    }

    const aliasMatch = findMatchingExpression(expressions, MOOD_ALIAS_CANDIDATES[mood])
    if (aliasMatch) {
      resolved[mood] = aliasMatch
      return
    }

    for (const fallbackMood of MOOD_FALLBACKS[mood]) {
      if (resolved[fallbackMood]) {
        resolved[mood] = resolved[fallbackMood]
        return
      }

      const fallbackMatch = findMatchingExpression(expressions, [
        COMMON_EXPRESSION_BY_MOOD[fallbackMood],
        ...MOOD_ALIAS_CANDIDATES[fallbackMood],
      ])
      if (fallbackMatch) {
        resolved[mood] = fallbackMatch
        return
      }
    }

    resolved[mood] = null
  })

  return resolved
}

const resolveIdleGroup = (availableGroups: string[]) =>
  findMatchingGroupName(availableGroups, [DEFAULT_IDLE_GROUP, 'idle'])
  ?? (availableGroups.includes('') ? '' : availableGroups[0] || '')

const resolvePrimaryGestureGroup = (availableGroups: string[], idleGroup: string) => {
  const group = findMatchingGroupName(
    availableGroups.filter(candidate => candidate !== idleGroup || candidate === ''),
    PRIMARY_GESTURE_GROUP_CANDIDATES,
  )

  if (group !== null) return group

  const nonIdle = availableGroups.find(candidate => candidate !== idleGroup)
  return nonIdle || idleGroup
}

const resolveGesturePlan = (
  gesture: CommonGesture,
  motionDefinitions: Record<string, Live2DMotionDefinition[]>,
  availableGroups: string[],
  primaryGestureGroup: string,
  idleGroup: string,
) => {
  const groupCandidates = GESTURE_GROUP_CANDIDATES[gesture]
  const preferredGroup = findMatchingGroupName(availableGroups, groupCandidates)
  const primaryCount = motionDefinitions[primaryGestureGroup]?.length || 0
  const idleCount = motionDefinitions[idleGroup]?.length || 0

  const fallbackGroup = preferredGroup !== null
    ? preferredGroup
    : primaryCount > 0
      ? primaryGestureGroup
      : idleCount > 0
        ? idleGroup
        : availableGroups[0] || ''

  const motionCount = motionDefinitions[fallbackGroup]?.length || 0
  const preferredIndexes = fallbackGroup === primaryGestureGroup
    ? COMMON_GESTURE_VARIANTS[gesture]
    : []

  return {
    group: fallbackGroup,
    indexes: buildIndexPool(motionCount, preferredIndexes),
  }
}

const createEmptyBehaviorProfile = (): CommonLive2DBehaviorProfile => ({
  availableExpressions: [],
  lipSyncParamIds: [...DEFAULT_LIPSYNC_PARAM_IDS],
  idleGroup: DEFAULT_IDLE_GROUP,
  idleMotionCount: 0,
  primaryGestureGroup: '',
  primaryGestureMotionCount: 0,
  expressionByMood: {
    neutral: null,
    smile: null,
    serious: null,
    soft: null,
    curious: null,
    delighted: null,
  },
  gestureMap: {
    greeting: { group: '', indexes: [] },
    nod: { group: '', indexes: [] },
    think: { group: '', indexes: [] },
    happy: { group: '', indexes: [] },
    closing: { group: '', indexes: [] },
    goodbye: { group: '', indexes: [] },
    subtleTalk: { group: '', indexes: [] },
  },
  compatibility: {
    hasLipSync: false,
    matchedMoods: 0,
    mappedGestures: 0,
  },
})

export const buildCommonLive2DBehaviorProfile = ({
  modelDefinition,
  runtimeMotionDefinitions,
}: {
  modelDefinition?: Live2DModelDefinition | null
  runtimeMotionDefinitions?: Record<string, Live2DMotionDefinition[]>
} = {}) => {
  const baseProfile = createEmptyBehaviorProfile()
  const motionDefinitions = runtimeMotionDefinitions || modelDefinition?.FileReferences?.Motions || {}
  const availableGroups = Object.keys(motionDefinitions)
  const expressions = (modelDefinition?.FileReferences?.Expressions || []).map(expression => ({
    name: expression.Name || getFileBaseName(expression.File),
    tokens: toExpressionTokens(expression),
  }))

  const lipSyncGroup = (modelDefinition?.Groups || []).find(group =>
    normalizeKey(group.Target) === 'parameter' && normalizeKey(group.Name) === 'lipsync',
  )

  const idleGroup = resolveIdleGroup(availableGroups)
  const primaryGestureGroup = resolvePrimaryGestureGroup(availableGroups, idleGroup)
  const expressionByMood = resolveMoodExpressions(expressions)

  baseProfile.availableExpressions = expressions.map(expression => expression.name)
  baseProfile.lipSyncParamIds = unique(
    [...(lipSyncGroup?.Ids || []), ...DEFAULT_LIPSYNC_PARAM_IDS].filter(Boolean),
  )
  baseProfile.idleGroup = idleGroup
  baseProfile.idleMotionCount = motionDefinitions[idleGroup]?.length || 0
  baseProfile.primaryGestureGroup = primaryGestureGroup
  baseProfile.primaryGestureMotionCount = motionDefinitions[primaryGestureGroup]?.length || 0
  baseProfile.expressionByMood = expressionByMood

  ;(Object.keys(COMMON_GESTURE_VARIANTS) as CommonGesture[]).forEach((gesture) => {
    baseProfile.gestureMap[gesture] = resolveGesturePlan(
      gesture,
      motionDefinitions,
      availableGroups,
      primaryGestureGroup,
      idleGroup,
    )
  })

  baseProfile.compatibility = {
    hasLipSync: Boolean(lipSyncGroup?.Ids?.length),
    matchedMoods: Object.values(expressionByMood).filter(Boolean).length,
    mappedGestures: (Object.values(baseProfile.gestureMap) as GesturePlan[]).filter(plan => plan.indexes.length > 0).length,
  }

  return baseProfile
}

export const loadLive2DModelDefinition = async (modelUrl: string) => {
  if (!modelUrl) return null

  return await fetch(modelUrl, { cache: 'no-store' })
    .then(async (response) => {
      if (!response.ok) {
        return null
      }
      return await response.json() as Live2DModelDefinition
    })
    .catch(() => null)
}
