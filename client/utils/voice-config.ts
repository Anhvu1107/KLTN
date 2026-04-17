export type VoiceConfig = {
  voiceName: string
  liveModel: string
  temperature: number
  characterId: string
  characterName: string
  characterSubtitle: string
  hintText: string
  live2dModelUrl: string
  idleReminderSeconds: number
  live2dScale: number
  live2dOffsetY: number
}

export type CharacterPreset = {
  value: string
  label: string
  description: string
  modelUrl: string
  tags: string[]
  isCustom?: boolean
  isAvailable?: boolean
}

export const DEFAULT_CHARACTER_ID = 'aura-classic'
export const DEFAULT_LIVE2D_MODEL_URL = '/live2d/office_f/office_f.model3.json'

/** Built-in presets bundled with the codebase */
export const CHARACTER_PRESETS: CharacterPreset[] = [
  {
    value: DEFAULT_CHARACTER_ID,
    label: 'AURA Classic',
    description: 'Nhân viên tư vấn thời trang thanh lịch, hiện đại',
    modelUrl: DEFAULT_LIVE2D_MODEL_URL,
    tags: ['default', 'elegant', 'office'],
  },
  {
    value: 'chitose',
    label: 'Chitose',
    description: 'Cô gái dễ thương, thân thiện với nhiều biểu cảm',
    modelUrl: '/live2d/chitose/chitose.model3.json',
    tags: ['cute', 'friendly', 'expressions'],
  },
  {
    value: 'haru',
    label: 'Haru',
    description: 'Chàng trai năng động với nhiều cử chỉ sống động',
    modelUrl: '/live2d/haru_greeter/haru_greeter_t05.model3.json',
    tags: ['male', 'energetic', 'greeter'],
  },
  {
    value: 'hiyori',
    label: 'Hiyori',
    description: 'Cô gái học sinh trẻ trung, nhiều hành động sinh động',
    modelUrl: '/live2d/hiyori/hiyori_pro_t11.model3.json',
    tags: ['youthful', 'student', 'active'],
  },
  {
    value: 'miku',
    label: 'Miku',
    description: 'Nhân vật iconic với chuyển động uyển chuyển',
    modelUrl: '/live2d/miku/miku_sample_t04.model3.json',
    tags: ['iconic', 'graceful', 'idol'],
  },
  {
    value: 'natori',
    label: 'Natori',
    description: 'Nhân vật chuyên nghiệp với nhiều biểu cảm phong phú',
    modelUrl: '/live2d/natori/natori_pro_t06.model3.json',
    tags: ['professional', 'expressive', 'detailed'],
  },
  {
    value: 'kei',
    label: 'Kei',
    description: 'Cậu bé dễ mến với MotionSync và khẩu hình chuyển động',
    modelUrl: '/live2d/kei/kei_vowels_pro.model3.json',
    tags: ['male', 'boy', 'motionsync'],
  },
]

export const VOICE_NAME_OPTIONS = [
  { value: 'Leda', tone: 'Youthful' },
  { value: 'Achernar', tone: 'Soft' },
  { value: 'Despina', tone: 'Smooth' },
  { value: 'Callirrhoe', tone: 'Easy-going' },
  { value: 'Autonoe', tone: 'Bright' },
  { value: 'Aoede', tone: 'Breezy' },
] as const

export const LIVE_MODEL_OPTIONS = [
  {
    value: '',
    label: 'System default',
    description: 'Use the server-configured Gemini Live model',
  },
  {
    value: 'gemini-2.5-flash-native-audio-preview-12-2025',
    label: 'Gemini 2.5 Native Audio',
    description: 'Low-latency native audio preview',
  },
  {
    value: 'gemini-3.1-flash-live-preview',
    label: 'Gemini 3.1 Flash Live Preview',
    description: 'Newer Live API model with combined content events',
  },
] as const

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  voiceName: 'Aoede',
  liveModel: '',
  temperature: 0.2,
  characterId: DEFAULT_CHARACTER_ID,
  characterName: 'AURA',
  characterSubtitle: 'AI Stylist Voice Call',
  hintText: 'Nói bất cứ điều gì để bắt đầu tư vấn',
  live2dModelUrl: DEFAULT_LIVE2D_MODEL_URL,
  idleReminderSeconds: 60,
  live2dScale: 1.0,
  live2dOffsetY: 0,
}

const clampNumber = (value: unknown, min: number, max: number, fallback: number) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.min(max, Math.max(min, parsed))
}

const clampInteger = (value: unknown, min: number, max: number, fallback: number) =>
  Math.round(clampNumber(value, min, max, fallback))

const normalizeString = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.trim()
    ? value.trim()
    : fallback

export const cloneDefaultVoiceConfig = (): VoiceConfig => ({ ...DEFAULT_VOICE_CONFIG })

export const normalizeVoiceConfig = (input?: Partial<VoiceConfig> | null): VoiceConfig => {
  const requestedCharacterId = normalizeString(input?.characterId, DEFAULT_CHARACTER_ID)
  const preset = CHARACTER_PRESETS.find(option => option.value === requestedCharacterId)
  const fallbackPreset = preset || CHARACTER_PRESETS[0]

  return {
    voiceName: normalizeString(input?.voiceName, DEFAULT_VOICE_CONFIG.voiceName),
    liveModel: typeof input?.liveModel === 'string' ? input.liveModel.trim() : DEFAULT_VOICE_CONFIG.liveModel,
    temperature: clampNumber(input?.temperature, 0, 1, DEFAULT_VOICE_CONFIG.temperature),
    characterId: requestedCharacterId,
    characterName: normalizeString(input?.characterName, DEFAULT_VOICE_CONFIG.characterName),
    characterSubtitle: normalizeString(input?.characterSubtitle, DEFAULT_VOICE_CONFIG.characterSubtitle),
    hintText: normalizeString(input?.hintText, DEFAULT_VOICE_CONFIG.hintText),
    live2dModelUrl: normalizeString(input?.live2dModelUrl, fallbackPreset.modelUrl),
    idleReminderSeconds: clampInteger(
      input?.idleReminderSeconds,
      0,
      600,
      DEFAULT_VOICE_CONFIG.idleReminderSeconds,
    ),
    live2dScale: clampNumber(input?.live2dScale, 0.1, 5.0, DEFAULT_VOICE_CONFIG.live2dScale),
    live2dOffsetY: clampNumber(input?.live2dOffsetY, -1000, 1000, DEFAULT_VOICE_CONFIG.live2dOffsetY),
  }
}
