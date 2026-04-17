type Live2DExpressionDefinition = {
  Name?: string
  File?: string
}

type Live2DMotionDefinition = {
  File?: string
  Sound?: string
  [key: string]: unknown
}

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
  shy: 'exp_07',
  sad: 'exp_08',
  angry: 'exp_09',
  surprised: 'exp_10',
} as const

export const COMMON_GESTURE_VARIANTS = {
  greeting: [4, 5],
  nod: [0, 8],
  think: [2, 9],
  happy: [5, 6],
  introduceProduct: [10, 11, 12, 16],
  recommendProduct: [5, 10, 16, 21],
  closing: [0, 5],
  goodbye: [7, 4],
  subtleTalk: [1, 8],
  surprised: [3, 6],
  shy: [1, 4],
  excited: [5, 7],
  confused: [2, 3],
  angry: [0, 9],
  sad: [1, 3],
  apologize: [0, 1],
  encourage: [5, 6, 10],
  listen: [0, 1],
  deny: [2, 7],
} as const

export type CommonMood = keyof typeof COMMON_EXPRESSION_BY_MOOD
export type CommonGesture = keyof typeof COMMON_GESTURE_VARIANTS

type GestureMotionRef = {
  group: string
  index: number
  score?: number
}

type GesturePlan = {
  group: string
  indexes: number[]
  motions: GestureMotionRef[]
}

export type CommonLive2DBehaviorProfile = {
  availableExpressions: string[]
  lipSyncParamIds: string[]
  idleGroup: string
  idleMotionCount: number
  primaryGestureGroup: string
  primaryGestureMotionCount: number
  primaryGestureMotions: GestureMotionRef[]
  expressionByMood: Record<CommonMood, string | null>
  gestureMap: Record<CommonGesture, GesturePlan>
  compatibility: {
    hasLipSync: boolean
    matchedMoods: number
    mappedGestures: number
  }
}

const DEFAULT_IDLE_GROUP = 'Idle'
const MAX_SEMANTIC_MOTIONS_PER_GESTURE = 4

const MOOD_ALIAS_CANDIDATES: Record<CommonMood, string[]> = {
  neutral: ['exp00', 'normal', 'neutral', 'default', 'base', 'plain', 'standard'],
  smile: ['exp01', 'smile', 'happy', 'joy', 'grin', 'laugh'],
  serious: ['exp02', 'serious', 'angry', 'stern', 'focus', 'focused', 'cool'],
  soft: ['exp04', 'soft', 'gentle', 'calm', 'blushing', 'shy', 'kind'],
  curious: ['exp05', 'curious', 'surprised', 'surprise', 'wonder', 'thinking', 'question'],
  delighted: ['exp06', 'delighted', 'excited', 'happy', 'joy', 'smile', 'sparkle'],
  shy: ['exp07', 'shy', 'blushing', 'embarrassed', 'timid', 'bashful'],
  sad: ['exp08', 'sad', 'cry', 'unhappy', 'melancholy', 'sorry', 'regret'],
  angry: ['exp09', 'angry', 'mad', 'irritated', 'furious', 'upset', 'stern'],
  surprised: ['exp10', 'surprise', 'shocked', 'amazed', 'astonished', 'wow'],
}

const MOOD_FALLBACKS: Record<CommonMood, CommonMood[]> = {
  neutral: [],
  smile: ['neutral'],
  serious: ['neutral'],
  soft: ['neutral', 'smile'],
  curious: ['neutral', 'soft'],
  delighted: ['smile', 'neutral'],
  shy: ['soft', 'neutral'],
  sad: ['soft', 'neutral'],
  angry: ['serious', 'neutral'],
  surprised: ['curious', 'neutral'],
}

const PRIMARY_GESTURE_GROUP_CANDIDATES = [
  '',
  'Greeting',
  'Wave',
  'Hello',
  'Talk',
  'Explain',
  'Recommend',
  'Presentation',
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
  greeting: ['Greeting', 'Hello', 'Wave', 'Flick', 'FlickUp', 'Tap', '', 'Tap@Head', 'Flick@Body'],
  nod: ['Nod', 'Agree', 'Tap@Head', 'Tap', 'FlickDown', 'FlickDown@Head', '', DEFAULT_IDLE_GROUP],
  think: ['Think', 'Thinking', 'Question', 'Tap@Head', 'FlickUp@Head', 'FlickUp', 'Tap', '', DEFAULT_IDLE_GROUP],
  happy: ['Happy', 'Smile', 'Laugh', 'Excited', 'Flick', 'Tap', 'FlickUp', '', DEFAULT_IDLE_GROUP],
  introduceProduct: ['Introduce', 'Presentation', 'Present', 'Recommend', 'Explain', 'Talk', 'Tap@Body', 'Flick@Body', 'Tap', 'Flick', ''],
  recommendProduct: ['Recommend', 'Product', 'Present', 'Explain', 'Talk', 'Tap@Body', 'Flick@Body', 'Flick', 'Tap', ''],
  closing: ['Close', 'Closing', 'Buy', 'Cart', 'Checkout', 'Flick@Body', 'Tap@Body', 'FlickDown@Body', 'Flick', 'Tap', ''],
  goodbye: ['Goodbye', 'Bye', 'Wave', 'Flick', 'FlickUp', 'Tap', 'Flick@Body', '', DEFAULT_IDLE_GROUP],
  subtleTalk: ['Talk', 'Explain', 'Tap', '', DEFAULT_IDLE_GROUP, 'Flick'],
  surprised: ['Surprised', 'Shock', 'Gasp', 'FlickUp', 'FlickUp@Head', 'Flick', 'Tap', ''],
  shy: ['Shy', 'Blush', 'Embarrassed', 'FlickDown', 'FlickDown@Body', 'Tap', DEFAULT_IDLE_GROUP, ''],
  excited: ['Excited', 'Happy', 'Celebrate', 'Flick', 'FlickUp', 'Tap', ''],
  confused: ['Confused', 'Question', 'Think', 'FlickUp@Head', 'Tap@Head', 'Tap', '', DEFAULT_IDLE_GROUP],
  angry: ['Angry', 'Mad', 'Upset', 'Tap@Body', 'Flick@Body', 'Tap', ''],
  sad: ['Sad', 'Cry', 'Sorry', 'FlickDown', 'FlickDown@Body', 'Tap', DEFAULT_IDLE_GROUP, ''],
  apologize: ['Apologize', 'Sorry', 'Bow', 'FlickDown', 'FlickDown@Body', 'Tap', DEFAULT_IDLE_GROUP, ''],
  encourage: ['Encourage', 'Cheer', 'Happy', 'Flick', 'FlickUp', 'Tap', ''],
  listen: ['Listen', 'Attentive', 'Nod', 'Tap@Head', 'Tap', DEFAULT_IDLE_GROUP, ''],
  deny: ['Deny', 'No', 'Refuse', 'Flick', 'FlickDown', 'Tap@Head', 'Tap', ''],
}

const GESTURE_TOKEN_ALIASES: Record<CommonGesture, string[]> = {
  greeting: ['greeting', 'hello', 'hi', 'wave', 'handwave', 'welcome', 'aisatsu', 'chao', 'xinchao', 'chaomung', 'vaytay'],
  nod: ['nod', 'agree', 'yes', 'ok', 'taphead', 'gatdau', 'dongtinh', 'dong', 'tottho', 'dung', 'duocluon'],
  think: ['think', 'thinking', 'question', 'curious', 'wonder', 'hmm', 'flickuphead', 'suynghi', 'nghisuy', 'timhieu', 'xemthu', 'raxem'],
  happy: ['happy', 'smile', 'laugh', 'joy', 'excited', 'delight', 'kime', 'vui', 'cuoi', 'vuive', 'tuyet', 'tot'],
  introduceProduct: ['introduce', 'presentation', 'present', 'product', 'show', 'recommend', 'explain', 'talk', 'guide', 'gioithieu', 'sanpham', 'giaitrinh', 'trinhbay'],
  recommendProduct: ['recommend', 'product', 'suggest', 'choice', 'match', 'present', 'explain', 'talk', 'tuvan', 'goiy', 'decu', 'phuhop', 'dexuat'],
  closing: ['closing', 'close', 'cart', 'checkout', 'buy', 'order', 'tapbody', 'flickbody', 'chotdon', 'muangay', 'datmua', 'thanhtoan'],
  goodbye: ['goodbye', 'bye', 'wave', 'handwave', 'farewell', 'tammiet', 'hengan', 'tambiet', 'chaonhe'],
  subtleTalk: ['talk', 'speak', 'explain', 'idle', 'normal', 'noichuyen', 'troichuyen', 'binhthuong'],
  surprised: ['surprise', 'surprised', 'shock', 'amazed', 'wow', 'gasp', 'bingo', 'ngacnhien', 'ngoo', 'kinh', 'oi', 'troi', 'a'],
  shy: ['shy', 'blush', 'embarrassed', 'timid', 'bashful', 'macho', 'enguong', 'ngainam', 'ngượng', 'macho'],
  excited: ['excited', 'hype', 'celebrate', 'yay', 'awesome', 'haohung', 'phankhoai', 'suong', 'qua', 'manhnhat'],
  confused: ['confused', 'huh', 'what', 'lost', 'baffled', 'boiro', 'roir', 'khonghieu', 'sao', 'gi'],
  angry: ['angry', 'mad', 'furious', 'upset', 'irritated', 'giandoi', 'tuc', 'bucluc', 'buc', 'chan'],
  sad: ['sad', 'cry', 'unhappy', 'sorry', 'regret', 'buon', 'tiec', 'thuongthay', 'kho', 'thuong'],
  apologize: ['apologize', 'sorry', 'forgive', 'bow', 'excuse', 'xinloi', 'thatbai', 'xinthai', 'xin', 'thatday'],
  encourage: ['encourage', 'cheer', 'support', 'motivate', 'fight', 'colen', 'cogang', 'codo', 'colengayvuive', 'gioi', 'tuyetvoi'],
  listen: ['listen', 'attentive', 'hear', 'focus', 'langnghe', 'nghe', 'chuy', 'taptrung'],
  deny: ['deny', 'no', 'refuse', 'reject', 'disagree', 'khong', 'tucho', 'khongphai', 'khongduoc'],
}

export type Live2DMotionCatalogItem = {
  group: string
  index: number
  file: string
  tokens: string[]
  duration: number
  parameterRanges: Record<string, number>
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

const toMotionTokens = (group: string, definition: Live2DMotionDefinition) =>
  unique(
    [group, definition.File, getFileBaseName(definition.File), definition.Sound, getFileBaseName(definition.Sound)]
      .filter((value): value is string => Boolean(value))
      .flatMap(value => [
        normalizeKey(value),
        ...stripFileExtension(getFileBaseName(value))
          .split(/[^a-zA-Z0-9]+/)
          .map(normalizeKey),
      ])
      .filter(Boolean),
  )

const resolveLive2DRelativeUrl = (baseUrl: string, relativePath = '') => {
  if (!relativePath) return ''

  try {
    const base = new URL(
      baseUrl,
      typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost',
    )
    return new URL(relativePath, base).toString()
  } catch {
    const base = baseUrl.replace(/\\/g, '/').replace(/\/[^/]*$/, '/')
    return `${base}${relativePath}`.replace(/([^:]\/)\/+/g, '$1')
  }
}

const getMotionParameterRanges = (motionJson: any) => {
  const parameterRanges: Record<string, number> = {}
  const curves = Array.isArray(motionJson?.Curves) ? motionJson.Curves : []

  for (const curve of curves) {
    const id = typeof curve?.Id === 'string' ? curve.Id : ''
    const segments = Array.isArray(curve?.Segments) ? curve.Segments : []
    if (!id || !segments.length) continue

    const values: number[] = []
    for (let i = 1; i < segments.length; i += 3) {
      const value = Number(segments[i])
      if (Number.isFinite(value)) values.push(value)
    }
    for (let i = 2; i < segments.length; i += 3) {
      const value = Number(segments[i])
      if (Number.isFinite(value)) values.push(value)
    }

    if (!values.length) continue
    const min = Math.min(...values)
    const max = Math.max(...values)
    parameterRanges[id] = Math.max(parameterRanges[id] || 0, max - min)
  }

  return parameterRanges
}

const loadMotionCatalogItem = async (
  modelUrl: string,
  group: string,
  index: number,
  definition: Live2DMotionDefinition,
): Promise<Live2DMotionCatalogItem> => {
  const file = definition.File || ''
  const motionUrl = resolveLive2DRelativeUrl(modelUrl, file)
  let duration = 0
  let parameterRanges: Record<string, number> = {}

  if (motionUrl) {
    try {
      const response = await fetch(motionUrl, { cache: 'no-store' })
      if (response.ok) {
        const motionJson = await response.json()
        duration = Number(motionJson?.Meta?.Duration) || 0
        parameterRanges = getMotionParameterRanges(motionJson)
      }
    } catch {
      // Motion metadata is best-effort. Group/file names are still useful.
    }
  }

  return {
    group,
    index,
    file,
    tokens: toMotionTokens(group, definition),
    duration,
    parameterRanges,
  }
}

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

const scoreDurationFit = (duration: number, min = 1.2, max = 6.5) => {
  if (!duration) return 0
  if (duration >= min && duration <= max) return 1

  const distance = duration < min ? min - duration : duration - max
  return Math.max(0, 1 - distance / 4)
}

const sumParameterRange = (motion: Live2DMotionCatalogItem, aliases: string[]) => {
  const normalizedAliases = aliases.map(normalizeKey).filter(Boolean)
  let total = 0

  Object.entries(motion.parameterRanges).forEach(([paramId, range]) => {
    const normalizedParam = normalizeKey(paramId)
    if (normalizedAliases.some(alias => normalizedParam.includes(alias))) {
      total += Math.abs(Number(range) || 0)
    }
  })

  return total
}

const capScore = (value: number, divisor: number, max = 8) =>
  Math.min(max, Math.max(0, value / divisor))

const getMotionFeatures = (motion: Live2DMotionCatalogItem) => {
  const headX = sumParameterRange(motion, ['paramanglex', 'anglex'])
  const headY = sumParameterRange(motion, ['paramangley', 'angley'])
  const headZ = sumParameterRange(motion, ['paramanglez', 'anglez'])
  const body = sumParameterRange(motion, ['body', 'bodyupper', 'bodyposition'])
  const arm = sumParameterRange(motion, [
    'arm',
    'hand',
    'shoulder',
    'elbow',
    'wrist',
    'watch',
    'glass',
    'leg',
  ])
  const face = sumParameterRange(motion, [
    'mouth',
    'smile',
    'cheek',
    'brow',
    'face',
    'tere',
    'eyeform',
    'eyesmile',
  ])
  const eyes = sumParameterRange(motion, ['eyeball', 'eyeopen', 'eyel', 'eyer'])

  return {
    headX: capScore(headX, 10),
    headY: capScore(headY, 10),
    headZ: capScore(headZ, 10),
    body: capScore(body, 14),
    arm: capScore(arm, 18),
    face: capScore(face, 8),
    eyes: capScore(eyes, 12),
    duration: scoreDurationFit(motion.duration),
  }
}

const scoreTokenMatch = (motion: Live2DMotionCatalogItem, aliases: string[]) => {
  const normalizedAliases = aliases.map(normalizeKey).filter(Boolean)
  let score = 0

  normalizedAliases.forEach((alias) => {
    if (motion.tokens.some(token => token === alias)) score += 5
    else if (motion.tokens.some(token => token.includes(alias) || alias.includes(token))) score += 2
  })

  return score
}

const scoreGroupMatch = (group: string, candidates: string[]) => {
  const normalizedGroup = normalizeKey(group)
  if (!normalizedGroup && candidates.includes('')) return 1.5

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeKey(candidate)
    if (!normalizedCandidate) continue
    if (normalizedGroup === normalizedCandidate) return 4
    if (normalizedGroup.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedGroup)) return 2
  }

  return 0
}

const scoreMotionForGesture = (motion: Live2DMotionCatalogItem, gesture: CommonGesture) => {
  const features = getMotionFeatures(motion)
  const tokenScore = scoreTokenMatch(motion, GESTURE_TOKEN_ALIASES[gesture])
  const groupScore = scoreGroupMatch(motion.group, GESTURE_GROUP_CANDIDATES[gesture])
  const genericIndexScore = COMMON_GESTURE_VARIANTS[gesture].includes(motion.index)
    ? 1.75
    : 0

  switch (gesture) {
    case 'greeting':
      return tokenScore + groupScore + genericIndexScore + features.arm * 1.15 + features.headZ * 0.55 + features.headY * 0.35 + features.duration
    case 'nod':
      return tokenScore + groupScore + genericIndexScore + features.headX * 1.2 + features.body * 0.55 + features.duration
    case 'think':
      return tokenScore + groupScore + genericIndexScore + features.headX * 0.8 + features.headY * 0.55 + features.face * 0.7 + features.eyes * 0.35 + features.duration
    case 'happy':
      return tokenScore + groupScore + genericIndexScore + features.face * 1.1 + features.arm * 0.55 + features.headZ * 0.45 + features.duration
    case 'introduceProduct':
      return tokenScore + groupScore + genericIndexScore + features.arm * 1.35 + features.body * 0.75 + features.headY * 0.55 + features.duration
    case 'recommendProduct':
      return tokenScore + groupScore + genericIndexScore + features.arm * 1.05 + features.face * 0.75 + features.body * 0.65 + features.headY * 0.55 + features.duration
    case 'closing':
      return tokenScore + groupScore + genericIndexScore + features.arm * 1 + features.body * 0.85 + features.face * 0.45 + features.duration
    case 'goodbye':
      return tokenScore + groupScore + genericIndexScore + features.arm * 1.2 + features.headZ * 0.55 + features.duration
    case 'surprised':
      return tokenScore + groupScore + genericIndexScore + features.face * 1.2 + features.eyes * 0.9 + features.headY * 0.55 + features.body * 0.35 + features.duration
    case 'shy':
      return tokenScore + groupScore + genericIndexScore + features.face * 1.1 + features.headX * 0.7 + features.headZ * 0.55 + features.body * 0.35 + features.duration
    case 'excited':
      return tokenScore + groupScore + genericIndexScore + features.arm * 1.1 + features.face * 0.85 + features.body * 0.65 + features.headZ * 0.45 + features.duration
    case 'confused':
      return tokenScore + groupScore + genericIndexScore + features.headY * 0.9 + features.headX * 0.7 + features.face * 0.6 + features.eyes * 0.45 + features.duration
    case 'angry':
      return tokenScore + groupScore + genericIndexScore + features.face * 1.15 + features.body * 0.75 + features.arm * 0.55 + features.headX * 0.4 + features.duration
    case 'sad':
      return tokenScore + groupScore + genericIndexScore + features.face * 1.1 + features.headX * 0.65 + features.eyes * 0.55 + features.body * 0.4 + features.duration
    case 'apologize':
      return tokenScore + groupScore + genericIndexScore + features.headX * 1.15 + features.body * 0.85 + features.face * 0.55 + features.duration
    case 'encourage':
      return tokenScore + groupScore + genericIndexScore + features.arm * 1.1 + features.face * 0.85 + features.body * 0.55 + features.headZ * 0.35 + features.duration
    case 'listen':
      return tokenScore + groupScore + genericIndexScore + features.headX * 0.65 + features.eyes * 0.55 + features.face * 0.45 + features.duration
    case 'deny':
      return tokenScore + groupScore + genericIndexScore + features.headZ * 0.95 + features.headY * 0.7 + features.arm * 0.55 + features.face * 0.4 + features.duration
    case 'subtleTalk':
    default:
      return tokenScore + groupScore + genericIndexScore + features.face * 0.85 + features.headY * 0.45 + features.body * 0.35 + features.duration
  }
}

const selectSemanticMotions = (
  gesture: CommonGesture,
  motionCatalog: Live2DMotionCatalogItem[],
  idleGroup: string,
) => {
  const hasNonIdleMotions = motionCatalog.some(motion => motion.group !== idleGroup)
  const scored = motionCatalog
    .filter(motion => gesture === 'subtleTalk' || motion.group !== idleGroup || !hasNonIdleMotions)
    .map(motion => ({
      group: motion.group,
      index: motion.index,
      score: scoreMotionForGesture(motion, gesture),
    }))
    .filter(motion => motion.score > 0)
    .sort((a, b) => (b.score || 0) - (a.score || 0))

  if (!scored.length) return []

  const bestScore = scored[0].score || 0
  const minScore = Math.max(2, bestScore * 0.62)
  return scored
    .filter(motion => (motion.score || 0) >= minScore)
    .slice(0, MAX_SEMANTIC_MOTIONS_PER_GESTURE)
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
  motionCatalog: Live2DMotionCatalogItem[] = [],
) => {
  const semanticMotions = motionCatalog.length
    ? selectSemanticMotions(gesture, motionCatalog, idleGroup)
    : []

  if (semanticMotions.length) {
    const firstGroup = semanticMotions[0].group
    return {
      group: firstGroup,
      indexes: semanticMotions
        .filter(motion => motion.group === firstGroup)
        .map(motion => motion.index),
      motions: semanticMotions,
    }
  }

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
    motions: buildIndexPool(motionCount, preferredIndexes).map(index => ({
      group: fallbackGroup,
      index,
    })),
  }
}

const createEmptyBehaviorProfile = (): CommonLive2DBehaviorProfile => ({
  availableExpressions: [],
  lipSyncParamIds: [...DEFAULT_LIPSYNC_PARAM_IDS],
  idleGroup: DEFAULT_IDLE_GROUP,
  idleMotionCount: 0,
  primaryGestureGroup: '',
  primaryGestureMotionCount: 0,
  primaryGestureMotions: [],
  expressionByMood: {
    neutral: null,
    smile: null,
    serious: null,
    soft: null,
    curious: null,
    delighted: null,
    shy: null,
    sad: null,
    angry: null,
    surprised: null,
  },
  gestureMap: {
    greeting: { group: '', indexes: [], motions: [] },
    nod: { group: '', indexes: [], motions: [] },
    think: { group: '', indexes: [], motions: [] },
    happy: { group: '', indexes: [], motions: [] },
    introduceProduct: { group: '', indexes: [], motions: [] },
    recommendProduct: { group: '', indexes: [], motions: [] },
    closing: { group: '', indexes: [], motions: [] },
    goodbye: { group: '', indexes: [], motions: [] },
    subtleTalk: { group: '', indexes: [], motions: [] },
    surprised: { group: '', indexes: [], motions: [] },
    shy: { group: '', indexes: [], motions: [] },
    excited: { group: '', indexes: [], motions: [] },
    confused: { group: '', indexes: [], motions: [] },
    angry: { group: '', indexes: [], motions: [] },
    sad: { group: '', indexes: [], motions: [] },
    apologize: { group: '', indexes: [], motions: [] },
    encourage: { group: '', indexes: [], motions: [] },
    listen: { group: '', indexes: [], motions: [] },
    deny: { group: '', indexes: [], motions: [] },
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
  motionCatalog,
}: {
  modelDefinition?: Live2DModelDefinition | null
  runtimeMotionDefinitions?: Record<string, Live2DMotionDefinition[]>
  motionCatalog?: Live2DMotionCatalogItem[]
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
  baseProfile.primaryGestureMotions = (motionCatalog || [])
    .filter(motion => motion.group !== idleGroup || primaryGestureGroup === idleGroup)
    .map(motion => ({ group: motion.group, index: motion.index }))
  baseProfile.expressionByMood = expressionByMood

  ;(Object.keys(COMMON_GESTURE_VARIANTS) as CommonGesture[]).forEach((gesture) => {
    baseProfile.gestureMap[gesture] = resolveGesturePlan(
      gesture,
      motionDefinitions,
      availableGroups,
      primaryGestureGroup,
      idleGroup,
      motionCatalog,
    )
  })

  baseProfile.compatibility = {
    hasLipSync: Boolean(lipSyncGroup?.Ids?.length),
    matchedMoods: Object.values(expressionByMood).filter(Boolean).length,
    mappedGestures: (Object.values(baseProfile.gestureMap) as GesturePlan[])
      .filter(plan => plan.indexes.length > 0 || plan.motions.length > 0).length,
  }

  return baseProfile
}

export const loadLive2DMotionCatalog = async (
  modelUrl: string,
  modelDefinition?: Live2DModelDefinition | null,
) => {
  const motionDefinitions = modelDefinition?.FileReferences?.Motions || {}
  const jobs: Array<Promise<Live2DMotionCatalogItem>> = []

  Object.entries(motionDefinitions).forEach(([group, definitions]) => {
    definitions.forEach((definition, index) => {
      jobs.push(loadMotionCatalogItem(modelUrl, group, index, definition))
    })
  })

  return await Promise.all(jobs)
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
