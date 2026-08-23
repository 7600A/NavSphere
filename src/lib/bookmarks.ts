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
  if (/chatgpt|claude\.ai|anthropic|gemini\.google|midjourney|stability\.ai|huggingface|replicate|perplexity|人工智能|大模型|提示词|ai编程|ai工具/.test(text)) return 'AI工具'
  if (/网盘|cloud drive|webdav|文件共享|文件传输|直链|离线下载|资源库|资源收藏|下载平台/.test(text)) return '网盘与资源'
  if (/影视|电影|动漫|追剧|观影|fmovies|emby|media server|音源|小说|电子书|漫画|阅读/.test(text)) return '影视与阅读'
  if (/vps|主机|域名|dns|cloudflare|vercel|hosting|隧道|tunnel|代理|proxy|节点|v2ray|vless|网速|speedtest|ip查询|ip 地址|端口|ping|mtr|bgp/.test(text)) return '网络与云服务'
  if (/github\.|gitlab\.|bitbucket\.|npmjs\.|stackoverflow|vercel|cloudflare|docker|kubernetes|其?开发|编程|代码|api|sdk|数据库|运维|服务器|terminal|console/.test(text)) return '开发工具'
  if (/gmail|邮箱|mail|短信|sms|telegram|微信|wechat|qq|通讯|临时号码|手机号码/.test(text)) return '邮箱与通讯'
  if (/youtube|bilibili|douban|reddit|twitter|x\.com|weibo|知乎|新闻|资讯|论坛|社区|播客|视频|音乐|博客/.test(text)) return '媒体资讯'
  if (/figma|canva|dribbble|behance|unsplash|icon|设计|配色|素材|字体|图片|插画|logo|ui|ux/.test(text)) return '设计资源'
  if (/教程|大学|学术|题库|学习|课程|教育|百科|语言|翻译|matlab|csdn/.test(text)) return '学习教育'
  if (/支付|pay|信用卡|银行卡|金融|投资|充值|订阅|账单|商店|shop|购买|选购|esim/.test(text)) return '商业与生活'
  if (/软件|apk|应用|工具箱|tool|浏览器|刷机|系统|插件|扩展/.test(text)) return '软件工具'
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
