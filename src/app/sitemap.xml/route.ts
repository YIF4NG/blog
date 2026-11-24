import blogIndex from '@/../public/blogs/index.json'
import type { BlogIndexItem } from '@/app/blog/types'
import { createXmlResponse, escapeXml, getSiteOrigin, siteBuildDate } from '@/lib/site-xml'

export const dynamic = 'force-dynamic'

const blogs = blogIndex as BlogIndexItem[]

function serializeEntry(url: string, date: Date, frequency: 'daily' | 'weekly', priority: number): string {
	return `
	<url>
		<loc>${escapeXml(url)}</loc>
		<lastmod>${date.toISOString()}</lastmod>
		<changefreq>${frequency}</changefreq>
		<priority>${priority}</priority>
	</url>`
}

export function GET(request: Request): Response {
	const siteOrigin = getSiteOrigin(request.url)
	if (!siteOrigin) return new Response('Invalid site URL', { status: 400 })

	const home = serializeEntry(siteOrigin, siteBuildDate, 'daily', 1)
	const posts = blogs
		.filter(post => post.slug && !post.hidden)
		.map(post => serializeEntry(`${siteOrigin}/blog/${encodeURIComponent(post.slug)}`, post.date ? new Date(post.date) : siteBuildDate, 'weekly', 0.8))
		.join('')

	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${home}${posts}
</urlset>`

	return createXmlResponse(sitemap, 'application/xml')
}
