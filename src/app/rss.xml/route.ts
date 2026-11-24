import siteContent from '@/config/site-content.json'
import blogIndex from '@/../public/blogs/index.json'
import type { BlogIndexItem } from '@/app/blog/types'
import { createXmlResponse, escapeXml, getSiteOrigin, siteBuildDate } from '@/lib/site-xml'

export const dynamic = 'force-dynamic'

const blogs = blogIndex as BlogIndexItem[]
const coverLengths: Record<string, number> = JSON.parse(process.env.RSS_COVER_LENGTHS || '{}')

const wrapCdata = (value: string): string => `<![CDATA[${value.replaceAll(']]>', ']]]]><![CDATA[>')}]]>`

const getExtension = (input: string): string | undefined => {
	const clean = input.split(/[?#]/)[0]
	return clean.split('.').pop()?.toLowerCase()
}

const getMimeTypeFromUrl = (url?: string): string | null => {
	if (!url) return null
	const ext = getExtension(url)
	if (!ext) return null
	if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
	if (ext === 'png') return 'image/png'
	if (ext === 'gif') return 'image/gif'
	if (ext === 'webp') return 'image/webp'
	if (ext === 'svg') return 'image/svg+xml'
	return null
}

const buildEnclosure = (siteOrigin: string, cover?: string): string | null => {
	if (!cover) return null
	const type = getMimeTypeFromUrl(cover)
	const length = coverLengths[cover]
	if (!type || typeof length !== 'number') return null

	const coverUrl = new URL(cover, siteOrigin).href
	return `<enclosure url="${escapeXml(coverUrl)}" type="${type}" length="${length}" />`
}

const serializeItem = (item: BlogIndexItem, siteOrigin: string): string => {
	const link = escapeXml(`${siteOrigin}/blog/${encodeURIComponent(item.slug)}`)
	const title = escapeXml(item.title || item.slug)
	const description = wrapCdata(item.summary || '')
	const pubDate = new Date(item.date).toUTCString()
	const categories = (item.tags || [])
		.filter(Boolean)
		.map(tag => `<category>${escapeXml(tag)}</category>`)
		.join('')

	const enclosure = buildEnclosure(siteOrigin, item.cover)

	return `
		<item>
			<title>${title}</title>
			<link>${link}</link>
			<guid isPermaLink="false">${link}</guid>
			<description>${description}</description>
			<pubDate>${pubDate}</pubDate>
			${categories}
			${enclosure ?? ''}
		</item>`.trim()
}

export function GET(request: Request): Response {
	const siteOrigin = getSiteOrigin(request.url)
	if (!siteOrigin) return new Response('Invalid site URL', { status: 400 })

	const feedUrl = new URL('/rss.xml', siteOrigin).href
	const title = siteContent.meta?.title || '2025 Blog'
	const description = siteContent.meta?.description || 'Latest updates from 2025 Blog'

	const items = blogs
		.filter(item => item?.slug && !item.hidden)
		.map(item => serializeItem(item, siteOrigin))
		.join('')

	const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
	<channel xmlns:atom="http://www.w3.org/2005/Atom">
		<title>${escapeXml(title)}</title>
		<link>${escapeXml(siteOrigin)}</link>
		<atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
		<description>${escapeXml(description)}</description>
		<language>zh-CN</language>
		<docs>https://www.rssboard.org/rss-specification</docs>
		<ttl>60</ttl>
		<lastBuildDate>${siteBuildDate.toUTCString()}</lastBuildDate>
		${items}
	</channel>
</rss>`

	return createXmlResponse(rss, 'application/rss+xml')
}
