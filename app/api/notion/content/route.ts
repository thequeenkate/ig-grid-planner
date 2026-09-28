export const dynamic = 'force-dynamic'

const NOTION_API = 'https://api.notion.com/v1'

function notionHeaders() {
  return {
    'Authorization': `Bearer ${process.env.NOTION_TOKEN!}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  }
}

type NotionProp = Record<string, unknown> & { type: string }

function str(prop: NotionProp | undefined): string {
  if (!prop) return ''
  const type = prop.type
  if (type === 'title') return (prop.title as { plain_text: string }[])?.map(t => t.plain_text).join('') ?? ''
  if (type === 'rich_text') return (prop.rich_text as { plain_text: string }[])?.map(t => t.plain_text).join('') ?? ''
  if (type === 'select') return (prop.select as { name: string } | null)?.name ?? ''
  if (type === 'status') return (prop.status as { name: string } | null)?.name ?? ''
  if (type === 'date') return (prop.date as { start: string } | null)?.start ?? ''
  if (type === 'multi_select') return (prop.multi_select as { name: string }[])?.map(s => s.name).join(', ') ?? ''
  return ''
}

// Format may be a single Select or a Multi-select depending on the template.
function multi(prop: NotionProp | undefined): string[] {
  if (!prop) return []
  if (prop.type === 'multi_select') return (prop.multi_select as { name: string }[])?.map(s => s.name) ?? []
  if (prop.type === 'select') {
    const name = (prop.select as { name: string } | null)?.name
    return name ? [name] : []
  }
  return []
}

function num(prop: NotionProp | undefined): number | null {
  if (!prop || prop.type !== 'number') return null
  return (prop.number as number | null) ?? null
}

function coverPhoto(prop: NotionProp | undefined): string | null {
  if (!prop || prop.type !== 'files') return null
  const files = prop.files as { type: string; file?: { url: string }; external?: { url: string } }[]
  if (!files?.length) return null
  const f = files[0]
  return f.type === 'file' ? (f.file?.url ?? null) : (f.external?.url ?? null)
}

const MAX_PAGES = 5

class NotionError extends Error {
  status: number
  code?: string
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

// Reads the database's own column list so filters match whatever the user
// actually named things, instead of assuming one person's workspace.
type Schema = Record<string, string>

async function getSchema(dbId: string): Promise<Schema> {
  const res = await fetch(`${NOTION_API}/databases/${dbId}`, { headers: notionHeaders() })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string; code?: string }
    throw new NotionError(body.message ?? `Notion API ${res.status}`, res.status, body.code)
  }
  const db = await res.json() as { properties: Record<string, { type: string }> }
  const schema: Schema = {}
  for (const [name, def] of Object.entries(db.properties)) schema[name] = def.type
  return schema
}

// First candidate name that exists with one of the accepted types.
function find(schema: Schema, candidates: string[], types: string[]): string | null {
  for (const c of candidates) {
    for (const [name, type] of Object.entries(schema)) {
      if (name.toLowerCase() === c.toLowerCase() && types.includes(type)) return name
    }
  }
  return null
}

async function queryAll(dbId: string, filter: unknown): Promise<unknown[]> {
  const results: unknown[] = []
  let cursor: string | undefined

  for (let i = 0; i < MAX_PAGES; i++) {
    const res = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
      method: 'POST',
      headers: notionHeaders(),
      body: JSON.stringify({ page_size: 100, filter, start_cursor: cursor }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { message?: string; code?: string }
      throw new NotionError(body.message ?? `Notion API ${res.status}`, res.status, body.code)
    }

    const page = await res.json() as { results: unknown[]; has_more: boolean; next_cursor: string | null }
    results.push(...page.results)
    if (!page.has_more || !page.next_cursor) break
    cursor = page.next_cursor
  }

  return results
}

// Local date, not UTC: the calendar renders in the user's timezone.
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  const pad = (v: number) => String(v).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Pipeline values that mean "not worth showing in staging yet, or already finished".
const INACTIVE_PIPELINE = ['', 'not-started', 'not started', 'not-started/idea', 'idea', 'done']

export async function GET() {
  try {
    const dbId = process.env.NOTION_SOCIAL_CALENDAR_DB
    if (!dbId) {
      return Response.json(
        { error: 'NOTION_SOCIAL_CALENDAR_DB is not set. Add it to .env.local, then restart the app.' },
        { status: 500 },
      )
    }

    const schema = await getSchema(dbId)

    const titleProp = find(schema, ['Name', 'Title'], ['title'])
      ?? Object.entries(schema).find(([, t]) => t === 'title')?.[0] ?? null
    const publishProp = find(schema, ['IG Publish'], ['date'])
    const coverProp = find(schema, ['CoverPhoto', 'Cover Photo'], ['files'])

    const missing: string[] = []
    if (!titleProp) missing.push('a Title property')
    if (!publishProp) missing.push('"IG Publish" (Date)')
    if (!coverProp) missing.push('"CoverPhoto" (Files & media)')
    if (missing.length) {
      return Response.json(
        {
          error: `Your Notion database is missing ${missing.join(', ')}. Add it with that exact name and type, then refresh.`,
          code: 'missing_property',
        },
        { status: 400 },
      )
    }

    const platformProp = find(schema, ['Platform'], ['multi_select'])
    const pipelineProp = find(schema, ['Pipeline'], ['select', 'status'])
    const statusProp = find(schema, ['IG Status', 'IG/Video Status'], ['select', 'status'])
    const formatProp = find(schema, ['Format (IG)', 'Format'], ['select', 'multi_select'])
    const pillarProp = find(schema, ['Pillars', 'Pillar'], ['select', 'multi_select'])
    const seriesProp = find(schema, ['Series'], ['rich_text'])
    const sortProp = find(schema, ['Sort Order'], ['number'])

    // Only narrow by platform when the database actually has that column.
    // Accepts either spelling so both templates work.
    const platformFilter = platformProp
      ? {
          or: [
            { property: platformProp, multi_select: { contains: 'IG' } },
            { property: platformProp, multi_select: { contains: 'Instagram' } },
          ],
        }
      : null

    const withPlatform = (f: unknown) => (platformFilter ? { and: [platformFilter, f] } : f)

    const scheduledFilter = withPlatform({
      property: publishProp!,
      date: { on_or_after: daysAgo(60) },
    })

    const stagingFilter = withPlatform({
      property: publishProp!,
      date: { is_empty: true },
    })

    const [scheduledRows, stagingRows] = await Promise.all([
      queryAll(dbId, scheduledFilter),
      queryAll(dbId, stagingFilter),
    ])

    const posts = [...scheduledRows, ...stagingRows].map((page) => {
      const p = page as { id: string; url: string; properties: Record<string, NotionProp> }
      const props = p.properties

      const igPublish = str(props[publishProp!]) || null
      const formats = formatProp ? multi(props[formatProp]) : []

      return {
        id: p.id,
        notionUrl: p.url,
        title: titleProp ? str(props[titleProp]) : '',
        igStatus: statusProp ? str(props[statusProp]) : '',
        pipeline: pipelineProp ? str(props[pipelineProp]) : '',
        format: formats.join(', '),
        formats,
        isTrial: formats.includes('Trial Reel'),
        igPublish,
        coverPhoto: coverProp ? coverPhoto(props[coverProp]) : null,
        pillar: pillarProp ? str(props[pillarProp]) : '',
        series: seriesProp ? str(props[seriesProp]) : '',
        // "Sort Order" controls staging order, lower shows first.
        sortOrder: (sortProp ? num(props[sortProp]) : null) ?? 999,
        isLocked: !!igPublish,
      }
    })

    // Pipeline is filtered here rather than in the Notion query, because it may be
    // a Select or a Status property and those need different filter syntax.
    const isDone = (p: typeof posts[0]) => p.igStatus.toLowerCase().trim() === 'done'
    const isIdle = (p: typeof posts[0]) =>
      INACTIVE_PIPELINE.includes(p.pipeline.toLowerCase().trim())

    const filtered = posts.filter(p => {
      if (isDone(p)) return false
      if (p.isLocked) return true
      // Staging rows only show once they are actually moving through the pipeline.
      if (pipelineProp && isIdle(p)) return false
      if (statusProp && !p.igStatus) return false
      return true
    })

    return Response.json(filtered)
  } catch (err) {
    if (err instanceof NotionError) {
      console.error('Notion error:', err.message, 'code:', err.code)
      return Response.json({ error: err.message, code: err.code }, { status: err.status })
    }
    console.error('Notion fetch error:', (err as Error).message)
    return Response.json({ error: 'Network error. Try refreshing.' }, { status: 500 })
  }
}
