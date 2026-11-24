import { createInstallationToken, getInstallationId, signAppJwt } from './github-client'
import { GITHUB_CONFIG } from '@/consts'
import { useAuthStore } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { decrypt, encrypt } from './aes256-util'

const GITHUB_TOKEN_CACHE_KEY = 'github_token'
const GITHUB_PEM_CACHE_KEY = 'p_info'
let authSession = new AbortController()

export function getAuthSessionSignal(): AbortSignal {
	return authSession.signal
}

function getTokenFromCache(): string | null {
	try {
		if (typeof sessionStorage === 'undefined') return null
		return sessionStorage.getItem(GITHUB_TOKEN_CACHE_KEY)
	} catch {
		return null
	}
}

function saveTokenToCache(token: string): void {
	try {
		if (typeof sessionStorage === 'undefined') return
		sessionStorage.setItem(GITHUB_TOKEN_CACHE_KEY, token)
	} catch (error) {
		console.error('Failed to save token to cache:', error)
	}
}

function clearTokenCache(): void {
	try {
		if (typeof sessionStorage === 'undefined') return
		sessionStorage.removeItem(GITHUB_TOKEN_CACHE_KEY)
	} catch (error) {
		console.error('Failed to clear token cache:', error)
	}
}

export async function getPemFromCache(): Promise<string | null> {
	try {
		if (typeof sessionStorage === 'undefined') return null
		// 解密缓存中的 pem
		const encryptedPem = sessionStorage.getItem(GITHUB_PEM_CACHE_KEY)
		if (!encryptedPem) return null
		return await decrypt(encryptedPem, GITHUB_CONFIG.ENCRYPT_KEY)
	} catch {
		return null
	}
}

export async function savePemToCache(pem: string, signal: AbortSignal): Promise<void> {
	try {
		if (signal.aborted || typeof sessionStorage === 'undefined') return
		// 加密 pem 后存储
		const encryptedPem = await encrypt(pem, GITHUB_CONFIG.ENCRYPT_KEY)
		if (signal.aborted) return
		sessionStorage.setItem(GITHUB_PEM_CACHE_KEY, encryptedPem)
	} catch (error) {
		console.error('Failed to save pem to cache:', error)
	}
}

function clearPemCache(): void {
	try {
		if (typeof sessionStorage === 'undefined') return
		sessionStorage.removeItem(GITHUB_PEM_CACHE_KEY)
	} catch (error) {
		console.error('Failed to clear pem cache:', error)
	}
}

export function clearAllAuthCache(): void {
	const previousSession = authSession
	authSession = new AbortController()
	clearTokenCache()
	clearPemCache()
	previousSession.abort(new Error('认证会话已结束，请重新导入密钥'))
}

export function hasCachedToken(): boolean {
	return !!getTokenFromCache()
}

function signAuthJwt(): string {
	const privateKey = useAuthStore.getState().privateKey
	if (!privateKey) {
		throw new Error('需要先设置私钥。请使用 useAuth().setPrivateKey()')
	}

	toast.info('正在签发 JWT...')
	return signAppJwt(GITHUB_CONFIG.APP_ID, privateKey)
}

/**
 * 统一的认证 Token 获取
 * 自动处理缓存、签发等逻辑
 * @returns GitHub Installation Token
 */
export async function getAuthToken(): Promise<string> {
	const signal = getAuthSessionSignal()
	// 1. 先尝试从缓存获取 token
	const cachedToken = getTokenFromCache()
	if (cachedToken) {
		toast.info('使用缓存的令牌...')
		return cachedToken
	}

	const jwt = signAuthJwt()

	toast.info('正在获取安装信息...')
	const installationId = await getInstallationId(jwt, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, signal)
	signal.throwIfAborted()

	toast.info('正在创建安装令牌...')
	const token = await createInstallationToken(jwt, installationId, signal)
	signal.throwIfAborted()

	saveTokenToCache(token)

	return token
}
