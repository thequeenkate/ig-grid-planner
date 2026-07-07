export const dynamic = 'force-dynamic'

const NOTION_API = 'https://api.notion.com/v1'

function notionHeaders() {
  return {
    'Authorization': `Bearer ${process.env.NOTION_TOKEN!}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  }
}

type NotionProp = Record<string, unknown>

function str(prop: NotionProp | undefined): string {
  if (!prop) return ''
  const type = prop.type as string
  if (type === 'title') return (prop.title as { plain_text: string }[])?.[0]?.plain_text ?? ''
  if (type === 'rich_text') return (prop.rich_text as { plain_text: string }[])?.[0]?.plain_text ?? ''
  if (type === 'select') return (prop.select as { name: string } | null)?.name ?? ''
  if (type === 'date') return (prop.date as { start: string } | null)?.start ?? ''
  if (type === 'multi_select') return (prop.multi_select as { name: string }[])?.map(s => s.name).join(', ') ?? ''
  return ''
}

function num(prop: NotionProp | undefined): number | null {
  if (!prop || prop.type !== 'number') return null
  return (prop.number as number | null) ?? null
}

function coverPhoto(prop: NotionProp | undefined): string | null {
  if (!prop) return null
  const files = (prop.files as { type: string; file?: { url: string }; external?: { url: string } }[])
  if (!files?.length) return null
  const f = files[0]
  return f.type === 'file' ? (f.file?.url ?? null) : (f.external?.url ?? null)
}

export async function GET() {
  try {
    const dbId = process.env.NOTION_SOCIAL_CALENDAR_DB!

    const res = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
      method: 'POST',
      headers: notionHeaders(),
      body: JSON.stringify({ page_size: 100 }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { message?: string; code?: string }
      const msg = body.message ?? `Notion API ${res.status}`
      console.error('Notion error:', msg, 'code:', body.code)
      return Response.json({ error: msg, code: body.code }, { status: res.status })
    }

    const response = await res.json() as { results: unknown[] }

    const posts = response.results.map((page) => {
      const p = page as { id: string; url: string; properties: Record<string, Record<string, unknown>> }
      const props = p.properties

      const igPublish = str(props['IG Publish']) || str(props['ig publish']) || str(props['IG publish']) || null

      return {
        id: p.id,
        notionUrl: p.url,
        title: str(props['Name'] ?? props['name'] ?? props['Title'] ?? props['title']),
        igStatus: str(props['IG/Video Status'] ?? props['IG Status']),
        pipeline: str(props['Pipeline']),
        format: str(props['Format (IG)'] ?? props['Format']),
        igPublish: igPublish || null,
        coverPhoto: coverPhoto(props['CoverPhoto'] ?? props['Cover Photo'] ?? props['Cover photo']),
        pillar: str(props['Pillars'] ?? props['Pillar']),
        series: str(props['Series']),
        // optional "Sort Order" number property controls staging order (lower = first)
        sortOrder: num(props['Sort Order'] ?? props['Sort order']) ?? 999,
        isLocked: !!igPublish,
      }
    })

    const INACTIVE_PIPELINE = ['not-started', 'done', '']
    const isDone = (p: typeof posts[0]) => p.igStatus.toLowerCase().trim() === 'done'

    const filtered = posts.filter(p =>
      !isDone(p) && (
        // show scheduled posts (unless done)
        p.isLocked ||
        // staging: must have IG status set + pipeline is not idle/complete
        (p.igStatus && !INACTIVE_PIPELINE.includes(p.pipeline.toLowerCase().trim()))
      )
    )

    return Response.json(filtered)
  } catch (err) {
    console.error('Notion fetch error:', (err as Error).message)
    return Response.json([], { status: 500 })
  }
}
