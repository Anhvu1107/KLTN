<script setup lang="ts">
/**
 * SizeGuide Component
 * AURA ARCHIVE - Size chart modal for clothing measurements
 */

interface Props {
  modelValue: boolean
  category?: string
}

const props = withDefaults(defineProps<Props>(), {
  category: 'Tops',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

// Size charts by category
const sizeCharts = {
  Tops: {
    headers: ['Size', 'Chest (cm)', 'Shoulder (cm)', 'Length (cm)'],
    rows: [
      ['XS', '86-91', '40-42', '66'],
      ['S', '91-97', '42-44', '68'],
      ['M', '97-102', '44-46', '70'],
      ['L', '102-107', '46-48', '72'],
      ['XL', '107-112', '48-50', '74'],
      ['XXL', '112-117', '50-52', '76'],
    ],
  },
  Pants: {
    headers: ['Size', 'Waist (cm)', 'Hip (cm)', 'Inseam (cm)'],
    rows: [
      ['XS', '71-76', '86-91', '76'],
      ['S', '76-81', '91-97', '78'],
      ['M', '81-86', '97-102', '80'],
      ['L', '86-91', '102-107', '82'],
      ['XL', '91-97', '107-112', '82'],
      ['XXL', '97-102', '112-117', '82'],
    ],
  },
  Outerwear: {
    headers: ['Size', 'Chest (cm)', 'Shoulder (cm)', 'Sleeve (cm)'],
    rows: [
      ['XS', '90-95', '42-44', '60'],
      ['S', '95-100', '44-46', '62'],
      ['M', '100-105', '46-48', '64'],
      ['L', '105-110', '48-50', '66'],
      ['XL', '110-115', '50-52', '68'],
      ['XXL', '115-120', '52-54', '70'],
    ],
  },
  Shoes: {
    headers: ['EU', 'US Men', 'US Women', 'UK', 'CM'],
    rows: [
      ['36', '4', '6', '3.5', '22.5'],
      ['37', '5', '7', '4.5', '23.5'],
      ['38', '6', '8', '5.5', '24'],
      ['39', '6.5', '8.5', '6', '24.5'],
      ['40', '7', '9', '6.5', '25'],
      ['41', '8', '10', '7.5', '26'],
      ['42', '9', '11', '8.5', '27'],
      ['43', '10', '12', '9.5', '28'],
      ['44', '11', '13', '10.5', '29'],
      ['45', '12', '14', '11.5', '30'],
    ],
  },
}

// Get appropriate size chart
const currentChart = computed(() => {
  const category = props.category || 'Tops'
  if (category.toLowerCase().includes('shoe') || category.toLowerCase().includes('sneaker')) {
    return sizeCharts.Shoes
  }
  if (category.toLowerCase().includes('pant') || category.toLowerCase().includes('trouser') || category.toLowerCase().includes('jean')) {
    return sizeCharts.Pants
  }
  if (category.toLowerCase().includes('jacket') || category.toLowerCase().includes('coat') || category.toLowerCase().includes('outerwear')) {
    return sizeCharts.Outerwear
  }
  return sizeCharts.Tops
})

const close = () => {
  isOpen.value = false
}

// Handle escape key
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isOpen.value) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="size-guide-title"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="close"
        />

        <!-- Modal -->
        <div
          class="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto transform transition-all"
        >
          <!-- Header -->
          <div class="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
            <h2 id="size-guide-title" class="font-serif text-heading-4 text-aura-black">
              {{ $t('shop.sizeGuide') || 'Size Guide' }}
            </h2>
            <button
              type="button"
              @click="close"
              class="text-neutral-400 hover:text-aura-black transition-colors"
              aria-label="Close"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="p-6">
            <!-- Measurement Tips -->
            <div class="bg-neutral-50 rounded-sm p-4 mb-6">
              <h3 class="font-medium text-aura-black mb-2">{{ $t('shop.howToMeasure') || 'How to Measure' }}</h3>
              <ul class="text-body-sm text-neutral-600 space-y-1">
                <li>• {{ $t('shop.measureTip1') || 'Use a soft measuring tape' }}</li>
                <li>• {{ $t('shop.measureTip2') || 'Measure over undergarments similar to what you\'ll wear' }}</li>
                <li>• {{ $t('shop.measureTip3') || 'Keep the tape snug but not tight' }}</li>
              </ul>
            </div>

            <!-- Size Chart Table -->
            <div class="overflow-x-auto">
              <table class="w-full text-body-sm">
                <thead>
                  <tr class="border-b-2 border-neutral-200">
                    <th 
                      v-for="header in currentChart.headers" 
                      :key="header"
                      class="py-3 px-4 text-left font-medium text-aura-black uppercase tracking-wider"
                    >
                      {{ header }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="(row, index) in currentChart.rows" 
                    :key="index"
                    class="border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
                  >
                    <td 
                      v-for="(cell, cellIndex) in row" 
                      :key="cellIndex"
                      class="py-3 px-4"
                      :class="cellIndex === 0 ? 'font-medium text-aura-black' : 'text-neutral-600'"
                    >
                      {{ cell }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Note -->
            <p class="text-caption text-neutral-500 mt-4">
              {{ $t('shop.sizeNote') || 'Measurements may vary slightly between brands. If between sizes, we recommend sizing up.' }}
            </p>
          </div>

          <!-- Footer -->
          <div class="sticky bottom-0 bg-white border-t border-neutral-200 px-6 py-4">
            <button
              type="button"
              @click="close"
              class="w-full btn-primary"
            >
              {{ $t('common.close') || 'Close' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s ease;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>
