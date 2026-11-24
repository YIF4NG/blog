import { statSync } from 'node:fs'
import path from 'node:path'

import { NextConfig } from 'next'
import { codeInspectorPlugin } from 'code-inspector-plugin'
import blogIndex from './public/blogs/index.json'

const publicDirectory = path.resolve('public')
const rssCoverLengths: Record<string, number> = {}

// Cloudflare serves public files as assets, so record cover sizes at build time.
for (const { cover, hidden } of blogIndex) {
	if (hidden || !cover?.startsWith('/') || cover.startsWith('//')) continue

	const coverPath = path.resolve(publicDirectory, `.${cover}`)
	if (!coverPath.startsWith(`${publicDirectory}${path.sep}`)) continue

	try {
		const stat = statSync(coverPath)
		if (stat.isFile()) rssCoverLengths[cover] = stat.size
	} catch {
		// Skip enclosures whose cover files are unavailable.
	}
}

const nextConfig: NextConfig = {
	env: {
		SITE_URL: process.env.SITE_URL,
		SITE_BUILD_DATE: new Date().toISOString(),
		RSS_COVER_LENGTHS: JSON.stringify(rssCoverLengths)
	},
	devIndicators: false,
	reactStrictMode: false,
	reactCompiler: true,
	pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
	typescript: {
		ignoreBuildErrors: true
	},
	experimental: {
		scrollRestoration: false
	},
	turbopack: {
		rules: {
			'*.svg': {
				loaders: ['@svgr/webpack'],
				as: '*.js'
			}
			// ...codeInspectorPlugin({
			// 	bundler: 'turbopack'
			// })
		},

		resolveExtensions: ['.mdx', '.tsx', '.ts', '.jsx', '.js', '.mjs', '.json', 'css']
	},
	webpack: config => {
		config.module.rules.push({
			test: /\.svg$/i,
			use: [{ loader: '@svgr/webpack', options: { svgo: false } }]
		})

		return config
	},

	async redirects() {
		return [
			{
				source: '/zh',
				destination: '/',
				permanent: true
			},
			{
				source: '/en',
				destination: '/',
				permanent: true
			}
		]
	}
}

export default nextConfig
