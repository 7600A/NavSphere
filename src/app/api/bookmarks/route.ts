import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { commitFile, getFileContent } from '@/lib/github'
import { checkBookmark, classifyBookmark, flattenBookmarks, isGameAssist, type BookmarkStore } from '@/lib/bookmarks'
export const runtime = 'edge'
const path = 'src/navsphere/content/bookmarks.json'
const empty = (): BookmarkStore => ({ bookmarks: [], backups: [] })

function normalizeStore(value: unknown): BookmarkStore {
  if (!value || typeof value !== 'object') return empty()

  const candidate = value as Partial<BookmarkStore>
  return {
    bookmarks: Array.isArray(candidate.bookmarks) ? candidate.bookmarks : [],
    backups: Array.isArray(candidate.backups) ? candidate.backups : [],
  }
}

async function store() {
  return normalizeStore(await getFileContent(path))
}
async function save(data: BookmarkStore, token: string, message: string) { await commitFile(path, JSON.stringify(data, null, 2), message, token) }
async function sessionToken() { const s = await auth(); return s?.user?.accessToken }

export async function GET(req: Request) { const token = await sessionToken(); if (!token) return new Response('Unauthorized', { status: 401 }); const url = new URL(req.url); const s = await store(); const items = s.bookmarks.filter(b => (!url.searchParams.get('source') || b.source === url.searchParams.get('source')) && (!url.searchParams.get('q') || `${b.title} ${b.url}`.toLowerCase().includes(url.searchParams.get('q')!.toLowerCase()))); return NextResponse.json({ ...s, bookmarks: items }) }
export async function POST(req: Request) {
  const token = await sessionToken(); if (!token) return new Response('Unauthorized', { status: 401 }); const body = await req.json(); const data = await store()
  if (body.action === 'import') { const source = body.source || 'Default'; const incoming = flattenBookmarks(body.tree || [], source).map(b => ({ ...b, key: `${source}:${b.id}`, category: classifyBookmark(b), status: 'unchecked' })); const keys = new Set(incoming.map(b => b.key)); data.bookmarks = [...data.bookmarks.filter(b => !keys.has(b.key)), ...incoming]; await save(data, token, `Import bookmarks (${source})`); return NextResponse.json({ imported: incoming.length }) }
  if (body.action === 'check') {
    const requestedKeys = Array.isArray(body.keys) ? new Set(body.keys.filter((key: unknown): key is string => typeof key === 'string')) : undefined
    const limit = Math.min(Math.max(Number(body.limit) || 20, 1), 50)
    const pending = data.bookmarks
      .filter(b => b.status !== 'deleted' && b.url && (!requestedKeys || requestedKeys.has(b.key)))
      .slice(0, limit)
    const results = await Promise.all(pending.map(async bookmark => ({ bookmark, result: await checkBookmark(bookmark.url!) })))
    const checkedAt = new Date().toISOString()
    for (const { bookmark, result } of results) {
      bookmark.httpStatus = result.status
      bookmark.status = result.state
      bookmark.checkedAt = checkedAt
    }
    await save(data, token, 'Check bookmark links')
    return NextResponse.json({ checked: pending.length, keys: pending.map(b => b.key) })
  }
  if (body.action === 'cleanup') { const targets = data.bookmarks.filter(b => isGameAssist(b) || b.status === 'dead'); const backup = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), source: body.source || 'all', bookmarks: targets, reason: 'cleanup' }; data.backups.push(backup); const keys = new Set(targets.map(b => b.key)); data.bookmarks = data.bookmarks.filter(b => !keys.has(b.key)); await save(data, token, 'Cleanup bookmarks'); return NextResponse.json({ removed: targets.length, backupId: backup.id, backup }) }
  if (body.action === 'restore') { const backup = data.backups.find(b => b.id === body.backupId); if (!backup) return NextResponse.json({ error: 'Backup not found' }, { status: 404 }); const existing = new Set(data.bookmarks.map(b => b.key)); data.bookmarks.push(...backup.bookmarks.filter(b => !existing.has(`${b.source}:${b.id}`)).map(b => ({ ...b, key: `${b.source}:${b.id}`, category: classifyBookmark(b), status: 'restored' }))); await save(data, token, 'Restore bookmark backup'); return NextResponse.json({ restored: backup.bookmarks.length }) }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
