import { useEffect, useState } from 'react'
import { useWriteStore } from '../stores/write-store'

type LoadResult = { slug: string; error?: string }

export function useLoadBlog(slug?: string) {
	const { loadBlogForEdit, loading } = useWriteStore()
	const [result, setResult] = useState<LoadResult | null>(null)

	useEffect(() => {
		if (!slug) return
		const controller = new AbortController()
		const { signal } = controller
		setResult(null)
		loadBlogForEdit(slug, signal).then(
			() => {
				if (!signal.aborted) setResult({ slug })
			},
			(error: unknown) => {
				if (!signal.aborted) setResult({ slug, error: error instanceof Error ? error.message : '加载博客失败' })
			}
		)
		return () => controller.abort()
	}, [slug, loadBlogForEdit])

	const currentResult = result?.slug === slug ? result : null
	return { loading: loading || !currentResult, error: currentResult?.error }
}
