import { toBase64Utf8, getRepoPathInfo, getRef, createTree, createCommit, updateRef, createBlob, type TreeItem } from '@/lib/github-client'
import { fileToBase64NoPrefix, hashFileSHA256 } from '@/lib/file-utils'
import { prepareBlogsIndex, readBlogsIndex } from '@/lib/blog-index'
import { getAuthToken } from '@/lib/auth'
import type { BlogVersion } from '@/lib/load-blog'
import { GITHUB_CONFIG } from '@/consts'
import type { ImageItem } from '../types'
import { getFileExt } from '@/lib/utils'
import { toast } from 'sonner'
import { formatDateTimeLocal } from '../stores/write-store'

export type PushBlogParams = {
	form: {
		slug: string
		title: string
		md: string
		tags: string[]
		date?: string
		summary?: string
		hidden?: boolean
		category?: string
	}
	cover?: ImageItem | null
	images?: ImageItem[]
	mode?: 'create' | 'edit'
	originalSlug?: string | null
	editVersion?: BlogVersion | null
}

export async function pushBlog(params: PushBlogParams): Promise<BlogVersion> {
	const { form, cover, images, mode = 'create', originalSlug, editVersion } = params

	if (!form?.slug) throw new Error('需要 slug')

	if (mode === 'edit' && originalSlug !== form.slug) {
		throw new Error('编辑模式下不支持修改 slug，请保持原 slug 不变')
	}

	// 获取认证 token（自动从全局认证状态获取）
	const token = await getAuthToken()
	const { OWNER, REPO, BRANCH } = GITHUB_CONFIG
	const branchRef = `heads/${BRANCH}`

	toast.info('正在获取分支信息...')
	const refData = await getRef(token, OWNER, REPO, branchRef)
	const latestCommitSha = refData.sha

	const basePath = `public/blogs/${form.slug}`
	const latestItems = await readBlogsIndex(token, OWNER, REPO, latestCommitSha)
	if (mode === 'create') {
		const indexed = latestItems.some(item => item.slug === form.slug)
		if (indexed || (await getRepoPathInfo(token, OWNER, REPO, basePath, latestCommitSha)) !== null) {
			throw new Error('该 slug 已存在，请更换 slug 或编辑已有文章')
		}
	} else {
		if (!editVersion) throw new Error('缺少文章版本，请重新打开编辑页面')
		const [currentMarkdown, currentConfig] = await Promise.all([
			getRepoPathInfo(token, OWNER, REPO, `${basePath}/index.md`, latestCommitSha),
			getRepoPathInfo(token, OWNER, REPO, `${basePath}/config.json`, latestCommitSha)
		])
		if (
			currentMarkdown?.type !== 'file' ||
			currentMarkdown.sha !== editVersion.markdownSha ||
			(currentConfig !== null && currentConfig.type !== 'file') ||
			(currentConfig === null ? null : currentConfig.sha) !== editVersion.configSha
		) {
			throw new Error('文章已更新或删除，请保留当前稿件，待部署完成后重新打开编辑页面')
		}
	}
	const commitMessage = mode === 'edit' ? `更新文章: ${form.slug}` : `新增文章: ${form.slug}`

	// collect all local images (content + cover)
	const allLocalImages: Array<{ img: Extract<ImageItem, { type: 'file' }>; id: string }> = []

	// add content images
	for (const img of images || []) {
		if (img.type === 'file') {
			allLocalImages.push({ img, id: img.id })
		}
	}

	// add cover if local
	if (cover?.type === 'file') {
		allLocalImages.push({ img: cover, id: cover.id })
	}

	toast.info('正在准备文件...')

	const uploadedHashes = new Set<string>()
	let mdToUpload = form.md
	let coverPath: string | undefined

	// prepare tree items for all files
	const treeItems: TreeItem[] = []

	// process all images
	if (allLocalImages.length > 0) {
		toast.info('正在上传图片...')
		for (const { img, id } of allLocalImages) {
			const hash = img.hash || (await hashFileSHA256(img.file))
			const ext = getFileExt(img.file.name)
			const filename = `${hash}${ext}`
			const publicPath = `/blogs/${form.slug}/${filename}`

			if (!uploadedHashes.has(hash)) {
				const path = `${basePath}/${filename}`
				const contentBase64 = await fileToBase64NoPrefix(img.file)
				// create blob for image
				const blobData = await createBlob(token, OWNER, REPO, contentBase64, 'base64')
				treeItems.push({
					path,
					mode: '100644',
					type: 'blob',
					sha: blobData.sha
				})
				uploadedHashes.add(hash)
			}

			// replace placeholder in markdown
			const placeholder = `local-image:${id}`
			mdToUpload = mdToUpload.split(`(${placeholder})`).join(`(${publicPath})`)

			// set cover path if this is the cover
			if (cover?.type === 'file' && cover.id === id) {
				coverPath = publicPath
			}
		}
	}

	// handle external cover URL
	if (cover?.type === 'url') {
		coverPath = cover.url
	}

	toast.info('正在创建文件...')

	// create blob for index.md
	const mdBlob = await createBlob(token, OWNER, REPO, toBase64Utf8(mdToUpload), 'base64')
	treeItems.push({
		path: `${basePath}/index.md`,
		mode: '100644',
		type: 'blob',
		sha: mdBlob.sha
	})

	// create blob for config.json
	const dateStr = form.date || formatDateTimeLocal()
	const config = {
		title: form.title,
		tags: form.tags,
		date: dateStr,
		summary: form.summary,
		cover: coverPath,
		hidden: form.hidden,
		category: form.category
	}

	const configBlob = await createBlob(token, OWNER, REPO, toBase64Utf8(JSON.stringify(config, null, 2)), 'base64')
	treeItems.push({
		path: `${basePath}/config.json`,
		mode: '100644',
		type: 'blob',
		sha: configBlob.sha
	})

	// prepare and create blob for blogs index
	const indexJson = prepareBlogsIndex(latestItems, { slug: form.slug, ...config })
	const indexBlob = await createBlob(token, OWNER, REPO, toBase64Utf8(indexJson), 'base64')
	treeItems.push({
		path: 'public/blogs/index.json',
		mode: '100644',
		type: 'blob',
		sha: indexBlob.sha
	})

	// create tree
	toast.info('正在创建文件树...')
	const treeData = await createTree(token, OWNER, REPO, treeItems, latestCommitSha)

	// create commit
	toast.info('正在创建提交...')
	const commitData = await createCommit(token, OWNER, REPO, commitMessage, treeData.sha, [latestCommitSha])

	// update branch reference
	toast.info('正在更新分支...')
	await updateRef(token, OWNER, REPO, branchRef, commitData.sha)

	return { markdownSha: mdBlob.sha, configSha: configBlob.sha }
}
