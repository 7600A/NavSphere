'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Bookmark, Search } from 'lucide-react'

type Item = { key: string; title: string; url: string; category: string; source: string; path?: string[]; status: string }

const categoryOrder = ['AI工具', '开发工具', '网络与云服务', '网盘与资源', '软件工具', '影视与阅读', '媒体资讯', '设计资源', '学习教育', '邮箱与通讯', '商业与生活', '游戏', '其他']

export default function BookmarksPage() {
  const [items, setItems] = useState<Item[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/bookmarks', { credentials: 'include' }).then(async response => {
      if (response.status === 401) throw new Error('请先使用 GitHub 登录 NavSphere')
      if (!response.ok) throw new Error('书签加载失败')
      const data = await response.json()
      setItems(data.bookmarks || [])
    }).catch(error => setError(error.message))
  }, [])

  const visible = useMemo(() => {
    const value = query.trim().toLowerCase()
    return value ? items.filter(item => `${item.title} ${item.url} ${(item.path || []).join(' ')}`.toLowerCase().includes(value)) : items
  }, [items, query])

  return <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-8">
    <header className="mb-8 flex flex-wrap items-center gap-4">
      <Link href="/" className="rounded-lg border p-2" aria-label="返回首页"><ArrowLeft className="h-5 w-5" /></Link>
      <div className="flex-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold"><Bookmark className="h-6 w-6" />我的 Chrome 书签</h1>
        <p className="mt-1 text-sm text-muted-foreground">已导入并清理的书签，共 {items.length} 条</p>
      </div>
      <label className="flex min-w-64 items-center gap-2 rounded-lg border px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索书签" className="w-full bg-transparent text-sm outline-none" />
      </label>
    </header>
    {error && <div className="rounded-lg border border-destructive/40 p-4 text-destructive">{error}</div>}
    <div className="space-y-10">
      {[...categoryOrder, ...Array.from(new Set(visible.map(item => item.category))).filter(category => !categoryOrder.includes(category))].map(category => {
        const categoryItems = visible.filter(item => item.category === category)
        if (!categoryItems.length) return null
        return <section key={category}>
          <h2 className="mb-4 text-lg font-medium">{category} <span className="text-sm text-muted-foreground">{categoryItems.length}</span></h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categoryItems.map(item => <a key={item.key} href={item.url} target="_blank" rel="noreferrer" className="rounded-xl border bg-card p-4 transition hover:border-primary/50 hover:shadow-sm">
              <div className="truncate font-medium">{item.title}</div>
              <div className="mt-1 truncate text-xs text-muted-foreground">{item.url}</div>
              <div className="mt-3 text-xs text-muted-foreground">{item.source}{item.path?.length ? ` · ${item.path.join(' / ')}` : ''}</div>
            </a>)}
          </div>
        </section>
      })}
    </div>
  </main>
}
