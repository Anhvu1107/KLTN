/**
 * useDialog Composable
 * AURA ARCHIVE - Premium modal dialog system (replaces native alert/confirm)
 */

import { reactive } from 'vue'

export interface DialogOptions {
  title: string
  message: string
  type?: 'warning' | 'danger' | 'info' | 'success'
  confirmText?: string
  cancelText?: string
  icon?: 'trash' | 'warning' | 'info' | 'success' | 'close'
}

interface DialogState {
  show: boolean
  mode: 'alert' | 'confirm'
  options: DialogOptions
  resolve: ((value: boolean) => void) | null
}

// Global reactive state
const dialogState = reactive<DialogState>({
  show: false,
  mode: 'alert',
  options: {
    title: '',
    message: '',
    type: 'info',
    confirmText: 'OK',
    cancelText: 'Hủy',
  },
  resolve: null,
})

export const useDialog = () => {

  /**
   * Show a confirmation dialog (like confirm())
   * Returns a Promise<boolean>
   */
  const confirm = (options: DialogOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      const opts: DialogOptions = typeof options === 'string'
        ? { title: 'Xác nhận', message: options, type: 'warning' }
        : options

      dialogState.show = true
      dialogState.mode = 'confirm'
      dialogState.options = {
        type: 'warning',
        confirmText: opts.confirmText || 'Xác nhận',
        cancelText: opts.cancelText || 'Hủy',
        ...opts,
      }
      dialogState.resolve = resolve
    })
  }

  /**
   * Show an alert dialog (like alert())
   * Returns a Promise<boolean> (always true on dismiss)
   */
  const alert = (options: DialogOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      const opts: DialogOptions = typeof options === 'string'
        ? { title: 'Thông báo', message: options, type: 'info' }
        : options

      dialogState.show = true
      dialogState.mode = 'alert'
      dialogState.options = {
        type: 'info',
        confirmText: opts.confirmText || 'OK',
        ...opts,
      }
      dialogState.resolve = resolve
    })
  }

  /** Close dialog with a result */
  const close = (result: boolean) => {
    const resolve = dialogState.resolve
    dialogState.show = false
    dialogState.resolve = null
    if (resolve) resolve(result)
  }

  return {
    state: dialogState,
    confirm,
    alert,
    close,
  }
}
