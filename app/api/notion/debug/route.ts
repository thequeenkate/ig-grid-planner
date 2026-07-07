export const dynamic = 'force-dynamic'

// Setup troubleshooting endpoint. Reports whether env vars are set and what
// Notion answers — never any part of the token itself.
export async function GET() {
  const token = process.env.NOTION_TOKEN
  const dbId = process.env.NOTION_SOCIAL_CALENDAR_DB

  const tokenSet = !!token
  const dbIdSet = !!dbId

  if (!token || !dbId) {
    return Response.json({ tokenSet, dbIdSet, error: 'Missing env vars' })
  }

  const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ page_size: 1 }),
  })

  const body = await res.json()

  return Response.json({
    tokenSet,
    dbIdSet,
    status: res.status,
    notionCode: body.code ?? null,
    notionMessage: body.message ?? null,
    resultCount: body.results?.length ?? null,
  })
}
