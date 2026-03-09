<script setup lang="ts">
/**
 * Admin Payment Settings Page
 * AURA ARCHIVE - Configure payment methods, bank accounts, and gateway settings
 */

import { useI18n } from '#imports'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const { t } = useI18n()
const config = useRuntimeConfig()
const { getToken } = useAuthToken()

const isSaving = ref(false)
const saveMessage = ref('')
const saveError = ref('')
const isLoading = ref(true)

// Payment methods toggle
const methods = ref({
  cod: { enabled: true, label: 'Thanh toán khi nhận hàng (COD)' },
  bank_transfer: { enabled: true, label: 'Chuyển khoản ngân hàng' },
  momo: { enabled: true, label: 'MoMo' },
  vnpay: { enabled: true, label: 'VNPay' },
  paypal: { enabled: true, label: 'PayPal' },
  credit_card: { enabled: true, label: 'Visa / Mastercard / AMEX' },
})

// Bank accounts for bank transfer
const bankAccounts = ref<Array<{
  bankName: string
  accountNumber: string
  accountHolder: string
  branch: string
}>>([])

// Add bank account
const addBankAccount = () => {
  bankAccounts.value.push({
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    branch: '',
  })
}

// Remove bank account
const removeBankAccount = (index: number) => {
  bankAccounts.value.splice(index, 1)
}

// Fetch settings from server
const fetchPaymentSettings = async () => {
  isLoading.value = true
  try {
    const token = getToken()
    const response = await $fetch<{ success: boolean; data: { settings: Record<string, any> } }>(
      `${config.public.apiUrl}/admin/settings`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    // Look for payment-related settings in grouped data
    const allSettings = response.data.settings
    const paymentGroup = allSettings['payment'] || []

    for (const setting of paymentGroup) {
      if (setting.key === 'payment_methods') {
        try {
          const parsed = JSON.parse(setting.value)
          methods.value = { ...methods.value, ...parsed }
        } catch (e) { }
      }
      if (setting.key === 'bank_accounts') {
        try {
          bankAccounts.value = JSON.parse(setting.value)
        } catch (e) { }
      }
    }
  } catch (error) {
    console.error('Failed to fetch payment settings:', error)
  } finally {
    isLoading.value = false
  }
}

// Save settings
const saveSettings = async () => {
  isSaving.value = true
  saveMessage.value = ''
  saveError.value = ''

  try {
    const token = getToken()
    await $fetch(`${config.public.apiUrl}/admin/settings`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        settings: [
          { key: 'payment_methods', value: JSON.stringify(methods.value) },
          { key: 'bank_accounts', value: JSON.stringify(bankAccounts.value) },
        ],
      },
    })
    saveMessage.value = t('admin.settings.saveSuccess') || 'Saved!'
    setTimeout(() => { saveMessage.value = '' }, 3000)
  } catch (error: any) {
    saveError.value = error?.data?.message || 'Failed to save'
  } finally {
    isSaving.value = false
  }
}

onMounted(fetchPaymentSettings)

useSeoMeta({ title: `${t('admin.paymentSettings.title')} | Admin` })
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="font-serif text-heading-2 text-aura-black">{{ t('admin.paymentSettings.title') }}</h1>
        <p class="text-body-sm text-neutral-500 mt-1">{{ t('admin.paymentSettings.subtitle') }}</p>
      </div>
      <div class="flex items-center gap-3">
        <span v-if="saveMessage" class="text-green-600 text-body-sm">{{ saveMessage }}</span>
        <span v-if="saveError" class="text-red-600 text-body-sm">{{ saveError }}</span>
        <button @click="saveSettings" :disabled="isSaving" class="btn-primary">
          {{ isSaving ? t('common.saving') : t('admin.saveChanges') }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-12">
      <div class="animate-spin w-8 h-8 border-2 border-neutral-300 border-t-aura-black rounded-full mx-auto"></div>
    </div>

    <div v-else class="space-y-8">
      <!-- Payment Methods Toggle -->
      <div class="bg-white rounded-sm border border-neutral-200 p-6">
        <h2 class="font-serif text-heading-4 text-aura-black mb-6 pb-4 border-b">
          {{ t('admin.paymentSettings.methodsTitle') }}
        </h2>

        <div class="space-y-4">
          <div v-for="(method, key) in methods" :key="key"
               class="flex items-center justify-between py-3 px-4 rounded-sm border border-neutral-100 hover:bg-neutral-50 transition-colors">
            <div class="flex items-center gap-3">
              <span v-if="key === 'cod'" class="text-xl">🚚</span>
              <span v-else-if="key === 'bank_transfer'" class="text-xl">🏦</span>
              <span v-else-if="key === 'momo'" class="text-xl">📱</span>
              <span v-else-if="key === 'vnpay'" class="text-xl">💳</span>
              <span v-else-if="key === 'paypal'" class="text-xl">🌐</span>
              <span v-else-if="key === 'credit_card'" class="text-xl">💳</span>
              <div>
                <p class="text-body font-medium text-aura-black">{{ method.label }}</p>
                <p class="text-caption text-neutral-500">{{ key.toUpperCase() }}</p>
              </div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="method.enabled" class="sr-only peer">
              <div class="w-11 h-6 bg-neutral-200 rounded-full peer peer-checked:bg-aura-black peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>
        </div>
      </div>

      <!-- Bank Accounts for Bank Transfer -->
      <div class="bg-white rounded-sm border border-neutral-200 p-6">
        <div class="flex items-center justify-between mb-6 pb-4 border-b">
          <h2 class="font-serif text-heading-4 text-aura-black">
            {{ t('admin.paymentSettings.bankAccountsTitle') }}
          </h2>
          <button @click="addBankAccount" class="btn-secondary text-body-sm">
            + {{ t('admin.paymentSettings.addBank') }}
          </button>
        </div>

        <div v-if="bankAccounts.length === 0" class="text-center py-8 text-neutral-500">
          <p class="text-xl mb-2">🏦</p>
          <p>{{ t('admin.paymentSettings.noBanks') }}</p>
        </div>

        <div class="space-y-4">
          <div v-for="(account, idx) in bankAccounts" :key="idx"
               class="p-4 border border-neutral-200 rounded-sm relative">
            <button @click="removeBankAccount(idx)"
                    class="absolute top-3 right-3 text-neutral-400 hover:text-red-500 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="text-body-sm text-neutral-700 block mb-1">{{ t('admin.paymentSettings.bankName') }}</label>
                <input v-model="account.bankName" type="text" class="input-field" placeholder="Vietcombank, BIDV, TPBank..." />
              </div>
              <div>
                <label class="text-body-sm text-neutral-700 block mb-1">{{ t('admin.paymentSettings.accountNumber') }}</label>
                <input v-model="account.accountNumber" type="text" class="input-field" placeholder="0123456789" />
              </div>
              <div>
                <label class="text-body-sm text-neutral-700 block mb-1">{{ t('admin.paymentSettings.accountHolder') }}</label>
                <input v-model="account.accountHolder" type="text" class="input-field" placeholder="NGUYEN VAN A" />
              </div>
              <div>
                <label class="text-body-sm text-neutral-700 block mb-1">{{ t('admin.paymentSettings.branch') }}</label>
                <input v-model="account.branch" type="text" class="input-field" placeholder="Chi nhánh HCM" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Gateway Info -->
      <div class="bg-white rounded-sm border border-neutral-200 p-6">
        <h2 class="font-serif text-heading-4 text-aura-black mb-6 pb-4 border-b">
          {{ t('admin.paymentSettings.gatewayTitle') }}
        </h2>

        <div class="space-y-4">
          <!-- VNPay -->
          <div class="p-4 border border-neutral-100 rounded-sm">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-lg">💳</span>
              <h3 class="text-body font-medium">VNPay</h3>
            </div>
            <p class="text-caption text-neutral-500">{{ t('admin.paymentSettings.gatewayEnvNote') }}</p>
            <code class="text-caption bg-neutral-100 px-2 py-1 rounded mt-2 inline-block">VNPAY_TMN_CODE, VNPAY_HASH_SECRET</code>
          </div>

          <!-- MoMo -->
          <div class="p-4 border border-neutral-100 rounded-sm">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-lg">📱</span>
              <h3 class="text-body font-medium">MoMo</h3>
            </div>
            <p class="text-caption text-neutral-500">{{ t('admin.paymentSettings.gatewayEnvNote') }}</p>
            <code class="text-caption bg-neutral-100 px-2 py-1 rounded mt-2 inline-block">MOMO_PARTNER_CODE, MOMO_ACCESS_KEY, MOMO_SECRET_KEY</code>
          </div>

          <!-- PayPal -->
          <div class="p-4 border border-neutral-100 rounded-sm">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-lg">🌐</span>
              <h3 class="text-body font-medium">PayPal (+ Visa/Mastercard)</h3>
            </div>
            <p class="text-caption text-neutral-500">{{ t('admin.paymentSettings.gatewayEnvNote') }}</p>
            <code class="text-caption bg-neutral-100 px-2 py-1 rounded mt-2 inline-block">PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MODE</code>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
