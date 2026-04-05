<script setup lang="ts">
/**
 * Admin Users Management
 * AURA ARCHIVE - Customer list and management
 */

import { useDialog } from '~/composables/useDialog'

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const { t } = useI18n()
const config = useRuntimeConfig()
const authStore = useAuthStore()
const { alert: showAlert, confirm: showConfirm } = useDialog()
const token = computed(() => authStore.token)

const page = ref(1)
const search = ref('')
const role = ref('')

// Fetch users (use admin getAllUsers endpoint)
const { data, pending, refresh } = await useFetch<{
  success: boolean
  data: { users: any[]; pagination: any }
}>(() => {
  let url = `${config.public.apiUrl}/admin/users?page=${page.value}&limit=20`
  if (search.value) url += `&search=${search.value}`
  if (role.value) url += `&role=${role.value}`
  return url
}, {
  headers: { Authorization: `Bearer ${token.value}` },
  watch: [page, role],
  server: false,
})

const users = computed(() => data.value?.data?.users || [])
const pagination = computed(() => data.value?.data?.pagination || {})

// Search
const handleSearch = () => {
  page.value = 1
  refresh()
}

// Toggle user status
const toggleStatus = async (userId: string, currentStatus: boolean) => {
  try {
    await $fetch(`${config.public.apiUrl}/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token.value}` },
      body: { is_active: !currentStatus },
    })
    await refresh()
  } catch (error: any) {
    showAlert({ title: t('notifications.error', 'Lỗi'), message: error?.data?.message || t('notifications.updateError'), type: 'danger' })
  }
}

// Delete user
const deleteUser = async (userId: string, userName: string) => {
  const confirmed = await showConfirm({
    title: t('admin.deleteUser', 'Xóa người dùng'),
    message: t('admin.confirmDeleteUser', `Bạn có chắc muốn xóa "${userName}"? Hành động này không thể hoàn tác.`),
    type: 'danger',
  })
  if (!confirmed) return
  try {
    await $fetch(`${config.public.apiUrl}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token.value}` },
    })
    await refresh()
  } catch (error: any) {
    showAlert({ title: t('notifications.error', 'L\u1ed7i'), message: error?.data?.message || t('notifications.deleteError', 'Kh\u00f4ng th\u1ec3 x\u00f3a ng\u01b0\u1eddi d\u00f9ng'), type: 'danger' })
  }
}

const { locale } = useI18n()
const formatDate = (date: string) => {
  if (!date) return t('common.unknown')
  const d = new Date(date)
  if (isNaN(d.getTime())) return t('common.unknown')
  return d.toLocaleDateString(locale.value === 'vi' ? 'vi-VN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

useSeoMeta({
  title: 'Users | AURA ARCHIVE Admin',
})
</script>

<template>
  <div class="p-8">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 class="font-serif text-heading-2 text-aura-black">{{ t('admin.users') }}</h1>
        <p class="text-body text-neutral-600">{{ pagination.total || 0 }} {{ t('admin.totalUsers').toLowerCase() }}</p>
      </div>
      
      <div class="flex gap-4">
        <!-- Search -->
        <div class="relative">
          <input
            v-model="search"
            @keyup.enter="handleSearch"
            type="text"
            :placeholder="t('common.search') + '...'"
            class="input-field w-64 pr-10"
          />
          <button @click="handleSearch" class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-aura-black">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>

        <!-- Role Filter -->
        <select v-model="role" class="input-field w-40">
          <option value="">{{ t('admin.allRoles') }}</option>
          <option value="CUSTOMER">{{ t('admin.customer') }}</option>
          <option value="ADMIN">{{ t('admin.adminRole') }}</option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="text-center py-16">
      <p class="text-neutral-500">{{ t('common.loading') }}</p>
    </div>

    <!-- Table -->
    <div v-else class="card overflow-x-auto">
      <table class="w-full">
        <thead class="bg-neutral-50">
          <tr>
            <th class="text-left py-4 px-4 text-caption font-medium text-neutral-500 uppercase">{{ t('admin.users') }}</th>
            <th class="text-left py-4 px-4 text-caption font-medium text-neutral-500 uppercase">{{ t('admin.role') }}</th>
            <th class="text-left py-4 px-4 text-caption font-medium text-neutral-500 uppercase">{{ t('common.status') }}</th>
            <th class="text-left py-4 px-4 text-caption font-medium text-neutral-500 uppercase">{{ t('admin.joined') }}</th>
            <th class="text-left py-4 px-4 text-caption font-medium text-neutral-500 uppercase">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id" class="border-t border-neutral-100">
            <td class="py-4 px-4">
              <div>
                <p class="text-body-sm font-medium text-aura-black">
                  {{ user.first_name || '' }} {{ user.last_name || '' }}
                </p>
                <p class="text-caption text-neutral-500">{{ user.email }}</p>
              </div>
            </td>
            <td class="py-4 px-4">
              <span 
                class="px-2 py-1 text-caption rounded-sm"
                :class="user.role === 'ADMIN' ? 'bg-teal-100 text-teal-800' : 'bg-blue-100 text-blue-800'"
              >
                {{ user.role === 'ADMIN' ? t('admin.adminRole') : t('admin.customer') }}
              </span>
            </td>
            <td class="py-4 px-4">
              <span 
                class="px-2 py-1 text-caption rounded-sm"
                :class="user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
              >
                {{ user.is_active ? t('common.active') : t('common.inactive') }}
              </span>
            </td>
            <td class="py-4 px-4 text-body-sm text-neutral-600">
              {{ formatDate(user.createdAt) }}
            </td>
            <td class="py-4 px-4">
              <div class="flex gap-2">
                <NuxtLink 
                  :to="`/admin/users/${user.id}`"
                  class="text-caption px-2 py-1 bg-neutral-100 hover:bg-neutral-200 rounded-sm"
                >
                  {{ t('common.view') }}
                </NuxtLink>
                <button
                  v-if="user.role !== 'ADMIN'"
                  @click="toggleStatus(user.id, user.is_active)"
                  class="text-caption px-2 py-1 rounded-sm"
                  :class="user.is_active ? 'bg-red-100 hover:bg-red-200 text-red-800' : 'bg-green-100 hover:bg-green-200 text-green-800'"
                >
                  {{ user.is_active ? t('admin.deactivate') : t('admin.activate') }}
                </button>
                <button
                  v-if="user.role !== 'ADMIN'"
                  @click="deleteUser(user.id, `${user.first_name || ''} ${user.last_name || ''}`)"
                  class="text-caption px-2 py-1 rounded-sm bg-red-50 hover:bg-red-200 text-red-600"
                >
                  {{ t('common.delete') }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty -->
      <div v-if="users.length === 0" class="text-center py-16">
        <p class="text-neutral-500">{{ t('common.noResults') }}</p>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.totalPages > 1" class="flex justify-center gap-2 mt-8">
      <button
        v-for="p in Math.min(pagination.totalPages, 10)"
        :key="p"
        @click="page = p"
        class="w-10 h-10 flex items-center justify-center text-body-sm transition-colors"
        :class="p === pagination.page ? 'bg-aura-black text-white' : 'bg-neutral-100 hover:bg-neutral-200'"
      >
        {{ p }}
      </button>
    </div>
  </div>
</template>
