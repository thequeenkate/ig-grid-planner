export const dynamic = 'force-dynamic'

// Instagram Graph API — Dev Mode (no app review needed for personal use)
// Setup: create Meta app at developers.facebook.com, add yourself as tester,
// generate a long-lived token, and set INSTAGRAM_ACCESS_TOKEN in .env.local + Vercel.
// Docs: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api

const BASE = 'https://graph.instagram.com/v21.0'

export async function GET() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!token) {
    return Response.json({ error: 'INSTAGRAM_ACCESS_TOKEN not set' }, { status: 503 })
  }

  try {
    const res = await fetch(
      `${BASE}/me/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,permalink&limit=30&access_token=${token}`
    )
    if (!res.ok) throw new Error(`Instagram API ${res.status}`)

    const { data } = await res.json() as { data: {
      id: string
      caption?: string
      media_type: string
      media_url: string
      thumbnail_url?: string
      timestamp: string
      permalink: string
    }[] }

    const posts = data.map(m => ({
      id: m.id,
      caption: m.caption ?? '',
      type: m.media_type,
      imageUrl: m.media_type === 'VIDEO' ? (m.thumbnail_url ?? null) : m.media_url,
      timestamp: m.timestamp,
      permalink: m.permalink,
    }))

    const tokenDate = process.env.INSTAGRAM_TOKEN_DATE
    let daysRemaining: number | null = null
    if (tokenDate) {
      const created = new Date(tokenDate).getTime()
      const elapsed = Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24))
      daysRemaining = Math.max(0, 60 - elapsed)
    }

    return Response.json({ posts, daysRemaining })
  } catch (err) {
    console.error('Instagram feed error:', (err as Error).message)
    return Response.json({ posts: [], daysRemaining: null }, { status: 500 })
  }
}
