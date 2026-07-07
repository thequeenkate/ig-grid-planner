import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const NOTION_API = 'https://api.notion.com/v1'

function notionHeaders() {
  return {
    'Authorization': `Bearer ${process.env.NOTION_TOKEN!}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { pageId, date }: { pageId: string; date: string | null } = await req.json()

    const res = await fetch(`${NOTION_API}/pages/${pageId}`, {
      method: 'PATCH',
      headers: notionHeaders(),
      body: JSON.stringify({
        properties: {
          'IG Publish': date ? { date: { start: date } } : { date: null },
        },
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { message?: string }
      return Response.json({ error: body.message ?? `Notion ${res.status}` }, { status: res.status })
    }

    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
