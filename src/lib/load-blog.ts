import type { BlogConfig } from '@/app/blog/types'

export type { BlogConfig } from '@/app/blog/types'

export type LoadedBlog = {
	slug: string
	config: BlogConfig
	markdown: string
	cover?: string
}

export type BlogVersion = {
	markdownSha: string
	configSha: string | null
}

type EditLoadOptions = { forEdit: true; signal: AbortSignal }

async function getGitBlobSha(bytes: ArrayBuffer): Promise<string> {
	// Git includes the byte length and object type before the original file bytes.
	const header = new TextEncoder().encode(`blob ${bytes.byteLength}\0`)
	const blob = new Uint8Array(header.length + bytes.byteLength)
	blob.set(header)
	blob.set(new Uint8Array(bytes), header.length)
	const digest = new Uint8Array(await crypto.subtle.digest('SHA-1', blob))
	return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Load blog data from public/blogs/{slug}
 * Used by both view page and edit page
 */
export function loadBlog(slug: string): Promise<LoadedBlog>
export function loadBlog(slug: string, options: EditLoadOptions): Promise<LoadedBlog & { version: BlogVersion }>
export async function loadBlog(slug: string, options?: EditLoadOptions): Promise<LoadedBlog | (LoadedBlog & { version: BlogVersion })> {
	if (!slug) {
		throw new Error('Slug is required')
	}

	const basePath = `/blogs/${encodeURIComponent(slug)}`
	const requestOptions: RequestInit | undefined = options && { cache: 'no-store', signal: options.signal }
	const [configRes, mdRes] = await Promise.all([fetch(`${basePath}/config.json`, requestOptions), fetch(`${basePath}/index.md`, requestOptions)])
	if (!mdRes.ok) {
		throw new Error(options ? '文章不存在或暂未部署' : 'Blog not found')
	}
	if (options && !configRes.ok && configRes.status !== 404) {
		throw new Error('加载文章配置失败')
	}

	const decoder = new TextDecoder()
	let configBytes: ArrayBuffer | null = null
	let config: BlogConfig = {}
	if (configRes.ok) {
		try {
			configBytes = await configRes.arrayBuffer()
			const parsed: unknown = JSON.parse(decoder.decode(configBytes))
			if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid blog config')
			config = parsed as BlogConfig
		} catch {
			if (options) throw new Error('文章配置读取失败或格式错误')
		}
	}

	const markdownBytes = await mdRes.arrayBuffer()
	const blog: LoadedBlog = {
		slug,
		config,
		markdown: decoder.decode(markdownBytes),
		cover: config.cover
	}
	if (!options) return blog

	const [markdownSha, configSha] = await Promise.all([getGitBlobSha(markdownBytes), configBytes ? getGitBlobSha(configBytes) : null])
	return { ...blog, version: { markdownSha, configSha } }
}
