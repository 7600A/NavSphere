export type BookmarkNode = { id: string; title: string; url?: string; path: string[]; source: string; folderId?: string }
export type BookmarkRecord = BookmarkNode & { key: string; category: string; status: string; httpStatus?: number; checkedAt?: string; deletedAt?: string }
export type BookmarkStore = { bookmarks: BookmarkRecord[]; backups: Array<{ id: string; createdAt: string; source: string; bookmarks: BookmarkNode[]; reason: string }> }

export function flattenBookmarks(tree: any[], source: string, path: string[] = []): BookmarkNode[] {
  const out: BookmarkNode[] = []
  for (const node of tree || []) {
    const nextPath = node.url || !node.title ? path : [...path, node.title]
    if (node.url) out.push({ id: String(node.id), title: node.title || node.url, url: node.url, path, source, folderId: node.parentId })
    out.push(...flattenBookmarks(node.children || [], source, nextPath))
  }
  return out
}

export function classifyBookmark(b: BookmarkNode) {
  const text = `${b.title} ${b.url} ${b.path.join(' ')}`.toLowerCase()
  const url = (b.url || '').toLowerCase()
  if (/chatgpt|claude\.ai|anthropic|gemini\.google|midjourney|stability\.ai|huggingface|replicate|perplexity|人工智能|大模型|提示词|ai编程|ai工具/.test(text)) return 'AI工具'
  if (/github\.|gitlab\.|bitbucket\.|npmjs\.|stackoverflow|vercel|cloudflare|docker|kubernetes|其?开发|编程|代码|api|sdk|数据库|运维|服务器|terminal|console/.test(text)) return '开发工具'
  if (/youtube|bilibili|douban|reddit|twitter|x\.com|weibo|知乎|新闻|资讯|论坛|社区|播客|视频|电影|音乐/.test(text)) return '媒体资讯'
  if (/figma|canva|dribbble|behance|unsplash|icon|设计|配色|素材|字体|图片|插画|logo|ui|ux/.test(text)) return '设计资源'
  if (/steam|epicgames|itch\.io|taptap|游戏|game|minecraft|genshin|原神|网游/.test(text)) return '游戏'
  return '其他'
}

export function isGameAssist(b: BookmarkRecord) {
  return /游戏\s*辅助\s*网|youxi\s*fuzhu\s*wang|game\s*assist/i.test(`${b.title} ${b.url} ${b.path.join('/')}`)
}

export async function checkBookmark(url: string) {
  try {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 8000)
    let response = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal, cache: 'no-store' })
    clearTimeout(timer)
    if ([405, 403].includes(response.status)) response = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal, cache: 'no-store' })
    return { status: response.status, state: response.status === 404 || response.status === 410 ? 'dead' : response.ok ? 'ok' : 'review' }
  } catch { return { status: 0, state: 'dead' } }
}
