import { toast } from 'sonner'
import { GITHUB_CONFIG } from '@/consts'
import { getAuthToken } from '@/lib/auth'
import { createBlob, createCommit, createTree, getRef, listRepoFilesRecursive, toBase64Utf8, type TreeItem, updateRef, readTextFileFromRepo } from '@/lib/github-client'
import { readBlogsIndex, type BlogIndexItem } from '@/lib/blog-index'

export async function saveBlogEdits(originalItems: BlogIndexItem[], nextItems: BlogIndexItem[], categories: string[]): Promise<void> {
	const removedSlugs = originalItems.filter(item => !nextItems.some(next => next.slug === item.slug)).map(item => item.slug)
	const uniqueRemoved = Array.from(new Set(removedSlugs.filter(Boolean)))

	const token = await getAuthToken()

	toast.info('正在获取分支信息...')
	const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
	const latestCommitSha = refData.sha

	// Compare with the exact snapshot used as the commit parent.
	const latestItems = await readBlogsIndex(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, latestCommitSha)
	const snapshot = (items: BlogIndexItem[]) => JSON.stringify([...items].sort((a, b) => a.slug.localeCompare(b.slug)))
	if (snapshot(latestItems) !== snapshot(originalItems)) {
		throw new Error('文章列表已更新，请刷新页面后重新编辑')
	}

	const treeItems: TreeItem[] = []
	for (const item of nextItems) {
		const original = latestItems.find(entry => entry.slug === item.slug)
		if (!original) throw new Error('文章列表不一致，请刷新页面后重新编辑')
		if ((original.category || '') === (item.category || '')) continue
		const path = `public/blogs/${item.slug}/config.json`
		const text = await readTextFileFromRepo(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, path, latestCommitSha)
		if (text === null) throw new Error(`文章配置不存在：${item.slug}`)
		const config = JSON.parse(text)
		if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error(`文章配置格式错误：${item.slug}`)
		config.category = item.category || ''
		treeItems.push({ path, mode: '100644', type: 'blob', content: JSON.stringify(config, null, 2) })
	}

	for (const slug of uniqueRemoved) {
		toast.info(`正在收集 ${slug} 文件...`)
		const basePath = `public/blogs/${slug}`
		const files = await listRepoFilesRecursive(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, basePath, latestCommitSha)

		for (const path of files) {
			treeItems.push({
				path,
				mode: '100644',
				type: 'blob',
				sha: null
			})
		}
	}

	toast.info('正在更新索引...')
	const sortedItems = [...nextItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
	const indexJson = JSON.stringify(sortedItems, null, 2)
	const indexBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(indexJson), 'base64')
	treeItems.push({
		path: 'public/blogs/index.json',
		mode: '100644',
		type: 'blob',
		sha: indexBlob.sha
	})

	toast.info('正在更新分类...')
	const uniqueCategories = Array.from(new Set(categories.map(c => c.trim()).filter(Boolean)))
	const categoriesJson = JSON.stringify({ categories: uniqueCategories }, null, 2)
	const categoriesBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(categoriesJson), 'base64')
	treeItems.push({
		path: 'public/blogs/categories.json',
		mode: '100644',
		type: 'blob',
		sha: categoriesBlob.sha
	})

	toast.info('正在创建提交...')
	const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, latestCommitSha)
	const actionLabels: string[] = []
	if (uniqueRemoved.length > 0) {
		actionLabels.push(`删除:${uniqueRemoved.join(',')}`)
	}
	actionLabels.push('更新索引')
	if (uniqueCategories.length > 0) {
		actionLabels.push('更新分类')
	}
	const commitLabel = actionLabels.join(' | ')
	const commitData = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, commitLabel, treeData.sha, [latestCommitSha])

	toast.info('正在更新分支...')
	await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, commitData.sha)

	toast.success('保存成功！请等待页面部署后刷新')
}

