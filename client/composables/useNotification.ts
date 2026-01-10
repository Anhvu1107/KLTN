/**
 * useNotification Composable
 * AURA ARCHIVE - Toast notification system
 */

export interface Notification {
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    message: string
    duration?: number
}

// Global state for notifications
const notifications = ref<Notification[]>([])

export const useNotification = () => {
    const { t } = useI18n()

    /**
     * Add notification
     */
    const notify = (type: Notification['type'], message: string, duration = 4000) => {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        notifications.value.push({
            id,
            type,
            message,
            duration,
        })

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                remove(id)
            }, duration)
        }

        return id
    }

    /**
     * Success notification
     */
    const success = (message: string, duration?: number) => {
        return notify('success', message, duration)
    }

    /**
     * Error notification
     */
    const error = (message: string, duration?: number) => {
        return notify('error', message, duration ?? 6000)
    }

    /**
     * Warning notification
     */
    const warning = (message: string, duration?: number) => {
        return notify('warning', message, duration)
    }

    /**
     * Info notification
     */
    const info = (message: string, duration?: number) => {
        return notify('info', message, duration)
    }

    /**
     * Remove notification by id
     */
    const remove = (id: string) => {
        const index = notifications.value.findIndex(n => n.id === id)
        if (index > -1) {
            notifications.value.splice(index, 1)
        }
    }

    /**
     * Clear all notifications
     */
    const clear = () => {
        notifications.value = []
    }

    // Convenience methods with i18n keys
    const successKey = (key: string, params?: Record<string, any>) => {
        return success(params ? t(key, params) : t(key))
    }

    const errorKey = (key: string, params?: Record<string, any>) => {
        return error(params ? t(key, params) : t(key))
    }

    return {
        notifications: readonly(notifications),
        notify,
        success,
        error,
        warning,
        info,
        remove,
        clear,
        successKey,
        errorKey,
    }
}
