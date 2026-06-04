import { create } from 'zustand'

interface ConfirmOptions {
 title?: string
 message?: string
 confirmText?: string
 cancelText?: string
 variant?: 'danger' | 'warning' | 'info'
}

interface ConfirmStore {
 isOpen: boolean
 title: string
 message: string
 confirmText: string
 cancelText: string
 variant: 'danger' | 'warning' | 'info'
 resolve: ((value: boolean) => void) | null
 open: (options: ConfirmOptions) => Promise<boolean>
 close: (result: boolean) => void
}

export const useConfirmStore = create<ConfirmStore>((set) => ({
 isOpen: false,
 title: 'Confirm',
 message: '',
 confirmText: 'Confirm',
 cancelText: 'Cancel',
 variant: 'info',
 resolve: null,

 open: (options) => {
 return new Promise<boolean>((resolve) => {
 set({
 isOpen: true,
 title: options.title || 'Confirm',
 message: options.message || '',
 confirmText: options.confirmText || 'Confirm',
 cancelText: options.cancelText || 'Cancel',
 variant: options.variant || 'info',
 resolve,
 })
 })
 },

 close: (result) => {
 const { resolve } = useConfirmStore.getState()
 if (resolve) resolve(result)
 set({ isOpen: false, resolve: null })
 },
}))

export async function confirm(options: ConfirmOptions): Promise<boolean> {
 return await useConfirmStore.getState().open(options)
}
