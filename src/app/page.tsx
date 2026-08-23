import { Metadata } from 'next/types'
import type { SiteConfig } from '@/types/site'
import navigationData from '@/navsphere/content/navigation.json'
import siteDataRaw from '@/navsphere/content/site.json'
import { redirect } from 'next/navigation'

import { getProcessedData } from '@/lib/data-loader'

function getData() {
  return getProcessedData(navigationData, siteDataRaw)
}

export function generateMetadata(): Metadata {
  const { siteData } = getData()

  return {
    title: siteData.basic.title,
    description: siteData.basic.description,
    keywords: siteData.basic.keywords,
    icons: {
      icon: siteData.appearance.favicon,
    },
  }
}

export default function HomePage() {
  redirect('/bookmarks')
}
