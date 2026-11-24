import { useCallback } from 'react'
import { readFileAsText } from '@/lib/file-utils'
import { toast } from 'sonner'
import { pushBlog } from '../services/push-blog'
import { deleteBlog } from '../services/delete-blog'
import { useWriteStore } from '../stores/write-store'
import { useAuthStore } from '@/hooks/use-auth'

export function usePublish() {
	const loading = useWriteStore(state => state.loading)
	const { isAuth, setPrivateKey } = useAuthStore()

	const onChoosePrivateKey = useCallback(
		async (file: File) => {
			const pem = await readFileAsText(file)
			setPrivateKey(pem)
		},
		[setPrivateKey]
	)

	const onPublish = useCallback(async () => {
		const { loading, setLoading, form, cover, images, mode, originalSlug, editVersion } = useWriteStore.getState()
		if (loading) return
		try {
			setLoading(true)
			const publishedVersion = await pushBlog({
				form,
				cover,
				images,
				mode,
				originalSlug,
				editVersion
			})
			if (mode === 'edit') {
				useWriteStore.setState(state => (state.editVersion === editVersion ? { editVersion: publishedVersion } : state))
			}

			const successMsg = mode === 'edit' ? '更新成功' : '发布成功'
			toast.success(successMsg)
		} catch (err: any) {
			console.error(err)
			toast.error(err?.message || '操作失败')
		} finally {
			setLoading(false)
		}
	}, [])

	const onDelete = useCallback(async () => {
		const { loading, setLoading, form, originalSlug } = useWriteStore.getState()
		if (loading) return
		const targetSlug = originalSlug || form.slug
		if (!targetSlug) {
			toast.error('缺少 slug，无法删除')
			return
		}
		try {
			setLoading(true)
			await deleteBlog(targetSlug)
		} catch (err: any) {
			console.error(err)
			toast.error(err?.message || '删除失败')
		} finally {
			setLoading(false)
		}
	}, [])

	return {
		isAuth,
		loading,
		onChoosePrivateKey,
		onPublish,
		onDelete
	}
}
