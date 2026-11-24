import { create } from 'zustand'
import { clearAllAuthCache, getAuthSessionSignal, getAuthToken, getPemFromCache, hasCachedToken, savePemToCache } from '@/lib/auth'
import { useConfigStore } from '@/app/(home)/stores/config-store'
interface AuthStore {
	// State
	isAuth: boolean
	privateKey: string | null

	// Actions
	setPrivateKey: (key: string) => Promise<void>
	clearAuth: () => void
	refreshAuthState: () => Promise<void>
	getAuthToken: () => Promise<string>
}

export const useAuthStore = create<AuthStore>((set, get) => ({
	isAuth: false,
	privateKey: null,

	setPrivateKey: async (key: string) => {
		clearAllAuthCache()
		const signal = getAuthSessionSignal()
		set({ isAuth: true, privateKey: key })
		const { siteContent } = useConfigStore.getState()
		if (siteContent?.isCachePem) {
			await savePemToCache(key, signal)
		}
	},

	clearAuth: () => {
		clearAllAuthCache()
		set({ isAuth: false, privateKey: null })
	},

	refreshAuthState: async () => {
		if (get().privateKey) return
		const signal = getAuthSessionSignal()
		if (hasCachedToken()) set({ isAuth: true })
		const privateKey = await getPemFromCache()
		if (signal.aborted) return
		set({ isAuth: !!privateKey || hasCachedToken(), privateKey })
	},

	getAuthToken: () => getAuthToken()
}))

// Restore cached auth after the store and auth modules have initialized.
queueMicrotask(() => {
	void useAuthStore.getState().refreshAuthState()
})
