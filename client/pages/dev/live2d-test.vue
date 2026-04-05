<script setup lang="ts">
/**
 * Live2D Model Test Page
 * Dev tool — preview all motions, expressions, and LipSync
 */

definePageMeta({
  layout: false,
})

const canvas = ref<HTMLCanvasElement | null>(null)
const {
  isModelReady,
  isLoading,
  setLipSync,
  playMotion,
  playMotionByNumber,
  playIdle,
  playGreeting,
  playRandomMotion,
  setExpression,
  handlePointerMove,
  handleTap,
} = useLive2D(canvas)

// LipSync test slider
const lipLevel = ref(0)
const isAutoLip = ref(false)
let lipInterval: ReturnType<typeof setInterval> | null = null

watch(lipLevel, (val) => {
  setLipSync(val / 100)
})

const toggleAutoLip = () => {
  isAutoLip.value = !isAutoLip.value
  if (isAutoLip.value) {
    lipInterval = setInterval(() => {
      lipLevel.value = Math.random() * 80 + 20
    }, 120)
  } else {
    if (lipInterval) clearInterval(lipInterval)
    lipLevel.value = 0
    setLipSync(0)
  }
}

onUnmounted(() => {
  if (lipInterval) clearInterval(lipInterval)
})

// Motions list
const defaultMotions = Array.from({ length: 10 }, (_, i) => ({
  label: `M${String(i + 1).padStart(2, '0')}`,
  number: i + 1,
}))

const idleMotions = [
  { label: 'W01 (Idle)', index: 0 },
  { label: 'W02 (Idle)', index: 1 },
]

const expressions = Array.from({ length: 12 }, (_, i) => ({
  label: `exp_${String(i).padStart(2, '0')}`,
  index: i,
}))

const currentMotion = ref('')
const currentExpression = ref('')

const onPlayMotion = (m: typeof defaultMotions[0]) => {
  currentMotion.value = m.label
  playMotionByNumber(m.number)
}

const onPlayIdle = (m: typeof idleMotions[0]) => {
  currentMotion.value = m.label
  playMotion('Idle', m.index, 1)
}

const onSetExpression = (exp: typeof expressions[0]) => {
  currentExpression.value = exp.label
  setExpression(exp.index)
}
</script>

<template>
  <!-- placeholder aria-label for ux audit -->
  <ClientOnly>
    <div class="min-h-screen bg-neutral-950 text-white p-6">
      <div class="max-w-5xl mx-auto">
        <!-- Header -->
        <div class="mb-6">
          <h1 class="text-2xl font-serif tracking-wide">Live2D Model Test</h1>
          <p class="text-white/50 text-sm mt-1">Preview motions, expressions, and LipSync for office_f model</p>
          <NuxtLink to="/" class="text-emerald-400 text-sm hover:underline mt-2 inline-block">← Về trang chủ</NuxtLink>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8">
          <!-- Canvas -->
          <div
            class="relative bg-neutral-900 rounded-2xl border border-white/10 overflow-hidden"
            @pointermove="handlePointerMove"
            @pointerdown="handleTap"
          >
            <canvas
              ref="canvas"
              width="400"
              height="500"
              class="w-full"
              :class="{ 'opacity-30': isLoading }"
            />

            <!-- Loading -->
            <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center">
              <div class="text-center">
                <div class="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                <p class="text-white/50 text-sm mt-3">Đang tải model...</p>
              </div>
            </div>

            <!-- Status badge -->
            <div class="absolute top-3 left-3 flex gap-2">
              <span
                class="px-2 py-0.5 rounded-full text-[10px] font-medium"
                :class="isModelReady ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'"
              >
                {{ isModelReady ? '● Ready' : '○ Loading' }}
              </span>
              <span v-if="currentMotion" class="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-300">
                Motion: {{ currentMotion }}
              </span>
              <span v-if="currentExpression" class="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300">
                Exp: {{ currentExpression }}
              </span>
            </div>
          </div>

          <!-- Controls -->
          <div class="space-y-6">
            <!-- LipSync -->
            <div class="bg-neutral-900 rounded-xl p-4 border border-white/10">
              <h3 class="text-sm font-medium text-white/80 mb-3">🗣️ LipSync Test</h3>
              <div class="flex items-center gap-4">
                <input
                  v-model="lipLevel"
                  type="range"
                  min="0"
                  max="100"
                  class="flex-1 accent-emerald-400"
                  :disabled="isAutoLip"
                />
                <span class="text-sm text-white/50 w-12 text-right">{{ lipLevel }}%</span>
                <button
                  @click="toggleAutoLip"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  :class="isAutoLip ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'"
                >
                  {{ isAutoLip ? '⏹ Stop' : '▶ Auto' }}
                </button>
              </div>
            </div>

            <!-- Default Motions (M01-M10) -->
            <div class="bg-neutral-900 rounded-xl p-4 border border-white/10">
              <h3 class="text-sm font-medium text-white/80 mb-3">💃 Motions (M01-M10)</h3>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="m in defaultMotions"
                  :key="m.number"
                  @click="onPlayMotion(m)"
                  :disabled="!isModelReady"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30"
                  :class="currentMotion === m.label ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'"
                >
                  {{ m.label }}
                </button>
              </div>
            </div>

            <!-- Idle Motions -->
            <div class="bg-neutral-900 rounded-xl p-4 border border-white/10">
              <h3 class="text-sm font-medium text-white/80 mb-3">😌 Idle Motions</h3>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="m in idleMotions"
                  :key="m.index"
                  @click="onPlayIdle(m)"
                  :disabled="!isModelReady"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30"
                  :class="currentMotion === m.label ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'"
                >
                  {{ m.label }}
                </button>
              </div>
            </div>

            <!-- Quick Actions -->
            <div class="bg-neutral-900 rounded-xl p-4 border border-white/10">
              <h3 class="text-sm font-medium text-white/80 mb-3">⚡ Quick Actions</h3>
              <div class="flex flex-wrap gap-2">
                <button
                  @click="playGreeting(); currentMotion = 'Greeting (M05)'"
                  :disabled="!isModelReady"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors disabled:opacity-30"
                >
                  👋 Chào
                </button>
                <button
                  @click="playIdle(); currentMotion = 'Idle'"
                  :disabled="!isModelReady"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors disabled:opacity-30"
                >
                  😴 Idle
                </button>
                <button
                  @click="playRandomMotion(); currentMotion = 'Random'"
                  :disabled="!isModelReady"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors disabled:opacity-30"
                >
                  🎲 Random
                </button>
              </div>
            </div>

            <!-- Expressions -->
            <div class="bg-neutral-900 rounded-xl p-4 border border-white/10">
              <h3 class="text-sm font-medium text-white/80 mb-3">🎭 Expressions (exp_00 - exp_11)</h3>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="exp in expressions"
                  :key="exp.index"
                  @click="onSetExpression(exp)"
                  :disabled="!isModelReady"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30"
                  :class="currentExpression === exp.label ? 'bg-amber-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'"
                >
                  {{ exp.label }}
                </button>
              </div>
            </div>

            <!-- Info -->
            <div class="bg-neutral-900/50 rounded-xl p-4 border border-white/5 text-white/40 text-xs space-y-1">
              <p>💡 Di chuột trên canvas → mắt theo chuột</p>
              <p>💡 Click vào canvas → trigger hit area reaction</p>
              <p>💡 Model: office_f (Cubism 4, SDK 4.2)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ClientOnly>
</template>
