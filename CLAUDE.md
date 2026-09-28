# IG Grid Planner: Instructions for Claude Code

You are helping a non-developer set up and customize their Instagram Grid Planner. Assume they have never used a terminal before. Explain every step in plain English, one step at a time, no jargon.

## Security rules: NON-NEGOTIABLE

**Never expose secrets. Ever.**
- Never display, print, echo, log, or repeat the user's Notion token, Instagram token, password, or any other credential, not in chat, not in code, not in error output, not even partial values or first/last characters.
- Never `cat`, `grep`, or `echo` the contents of `.env` or `.env.local`. If you need to check whether a value is set, check only that the variable name exists (e.g. `grep -c "^NOTION_TOKEN=" .env.local` returns a count, not the value).
- Never commit `.env` files to git. `.gitignore` already excludes them; do not change that.
- When the user needs to add a secret, tell them to open `.env.local` themselves in a text editor and paste the value directly. Never ask them to paste a secret into this chat.
- When writing or editing error handling, log `error.message` only, never the raw error object (it can leak Authorization headers).

Why this matters (explain to the user if they ask): an API token is like a house key. Anyone who sees it can walk into their Notion workspace. Chat logs, screenshots, and git history are all places a key can leak from.

## What this app is

A Next.js app that shows the user's Notion content calendar as an Instagram grid preview plus a drag-and-drop scheduling calendar. It reads from one Notion database and writes back only one property (`IG Publish`, a date).

- `app/page.tsx`: the planner page (grid + calendar + undo toast)
- `components/instagram-grid.tsx`: 3-column feed preview
- `components/instagram-calendar.tsx`: drag-and-drop calendar + staging sidebar
- `app/api/notion/content/route.ts`: reads the Notion database
- `app/api/notion/schedule/route.ts`: sets/clears the `IG Publish` date
- `app/api/notion/debug/route.ts`: setup troubleshooting (visit `/api/notion/debug`)
- `app/api/instagram/feed/route.ts`: optional live Instagram feed (only if `INSTAGRAM_ACCESS_TOKEN` is set)
- `middleware.ts`: optional password gate (only if `APP_PASSWORD` is set; for deployed use)

## Required Notion database properties

The database ID goes in `NOTION_SOCIAL_CALENDAR_DB`. The planner reads the database's
own column list at request time, so names are matched case-insensitively and several
property types are accepted. Only the first three are required.

**Required. The planner returns a named error if any is missing:**

| Property | Type | Used for |
|---|---|---|
| `Name` or `Title` | Title | Post title. Any title property works |
| `IG Publish` | Date | Scheduled date. The only property the planner writes |
| `CoverPhoto` or `Cover Photo` | Files & media | The grid image (first file) |

**Optional. Each one is skipped entirely when the column is absent:**

| Property | Type | Used for |
|---|---|---|
| `Platform` | Multi-select | When present, only rows tagged `IG` or `Instagram` are shown |
| `IG Status` or `IG/Video Status` | Select or Status | Row hidden when `done`. Staging rows need it set |
| `Pipeline` | Select or Status | Staging rows hidden when empty, `not-started`, `not-started/idea`, `idea`, or `done` |
| `Format` or `Format (IG)` | Select or Multi-select | Post format label. `Trial Reel` is flagged |
| `Pillars` or `Pillar` | Select or Multi-select | Content pillar |
| `Series` | Text | Series label |
| `Sort Order` | Number | Staging order, lower number first. Defaults to 999 |

Rows are fetched in two queries: dated rows from the last 60 days onward, and undated
rows for staging. Each query pages up to 5 times, so 500 rows per bucket.

Do not hard-code a single workspace's spelling into
`app/api/notion/content/route.ts`. Add a name to the candidate list in `find()` instead.

## Common tasks

- **Run locally:** `npm install` then `npm run dev`, open http://localhost:3000
- **Blank grid / errors:** visit http://localhost:3000/api/notion/debug. It reports whether env vars are set and what Notion answered, without revealing any secret. Most common cause: the Notion integration isn't connected to the database (open the database in Notion → ••• menu → Connections → add the integration).
- **Customizing:** the user may ask to rename properties, change colors, or adjust the grid. Keep changes minimal and preserve the security rules above.
