export type BookmarkNode = { id: string; title: string; url?: string; path: string[]; source: string; folderId?: string }
export type BookmarkRecord = BookmarkNode & { key: string; category: string; status: string; httpStatus?: number; checkedAt?: string; deletedAt?: string }
export type BookmarkStore = { bookmarks: BookmarkRecord[]; backups: Array<{ id: string; createdAt: string; source: string; bookmarks: BookmarkNode[]; reason: string }> }

export function flattenBookmarks(tree: any[], source: string, path: string[] = []): BookmarkNode[] {
  const out: BookmarkNode[] = []
  for (const node of tree || []) {
    const nextPath = node.url ? path : [...path, node.title || '未命名']
    if (node.url) out.push({ id: String(node.id), title: node.title || node.url, url: node.url, path, source, folderId: node.parentId })
    out.push(...flattenBookmarks(node.children || [], source, nextPath))
  }
  return out
}

export function classifyBookmark(b: BookmarkNode) {
  const text = `${b.title} ${b.url} ${b.path.join(' ')}`.toLowerCase()
  if (/ai|chatgpt|claude|gemini|人工智能/.test(text)) return 'AI工具'
  if (/github|gitlab|code|开发|编程|npm/.test(text)) return '开发工具'
  if (/news|新闻|reddit|论坛|社区/.test(text)) return '媒体资讯'
  if (/design|figma|icon|设计|配色|素材/.test(text)) return '设计资源'
  if (/game|游戏|辅助网/.test(text)) return '游戏'
  return b.path[0] || '其他'
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
