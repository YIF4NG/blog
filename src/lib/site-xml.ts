function parseOrigin(value?: string): string | undefined {
	const address = value?.trim()
	if (!address || !/^https?:\/\//i.test(address)) return undefined

	try {
		const url = new URL(address)
		return url.username || url.password ? undefined : url.origin
	} catch {
		return undefined
	}
}

export function getSiteOrigin(requestUrl: string): string | undefined {
	return parseOrigin(process.env.SITE_URL) ?? parseOrigin(process.env.NEXT_PUBLIC_SITE_URL) ?? parseOrigin(requestUrl)
}

export const siteBuildDate = new Date(process.env.SITE_BUILD_DATE || Date.now())

export const escapeXml = (value: string): string =>
	value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

export function createXmlResponse(xml: string, contentType: string): Response {
	return new Response(xml, {
		headers: {
			'Content-Type': `${contentType}; charset=utf-8`,
			'Cache-Control': 'private, no-store'
		}
	})
}
