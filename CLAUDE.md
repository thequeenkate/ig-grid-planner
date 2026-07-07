# IG Grid Planner — Instructions for Claude Code

You are helping a non-developer set up and customize their Instagram Grid Planner. Assume they have never used a terminal before. Explain every step in plain English, one step at a time, no jargon.

## Security rules — NON-NEGOTIABLE

**Never expose secrets. Ever.**
- Never display, print, echo, log, or repeat the user's Notion token, Instagram token, password, or any other credential — not in chat, not in code, not in error output, not even partial values or first/last characters.
- Never `cat`, `grep`, or `echo` the contents of `.env` or `.env.local`. If you need to check whether a value is set, check only that the variable name exists (e.g. `grep -c "^NOTION_TOKEN=" .env.local` returns a count, not the value).
- Never commit `.env` files to git. `.gitignore` already excludes them — do not change that.
- When the user needs to add a secret, tell them to open `.env.local` themselves in a text editor and paste the value directly. Never ask them to paste a secret into this chat.
- When writing or editing error handling, log `error.message` only — never the raw error object (it can leak Authorization headers).

Why this matters (explain to the user if they ask): an API token is like a house key. Anyone who sees it can walk into their Notion workspace. Chat logs, screenshots, and git history are all places a key can leak from.

## What this app is

A Next.js app that shows the user's Notion content calendar as an Instagram grid preview plus a drag-and-drop scheduling calendar. It reads from one Notion database and writes back only one property (`IG Publish`, a date).

- `app/page.tsx` — the planner page (grid + calendar + undo toast)
- `components/instagram-grid.tsx` — 3-column feed preview
- `components/instagram-calendar.tsx` — drag-and-drop calendar + staging sidebar
- `app/api/notion/content/route.ts` — reads the Notion database
- `app/api/notion/schedule/route.ts` — sets/clears the `IG Publish` date
- `app/api/notion/debug/route.ts` — setup troubleshooting (visit `/api/notion/debug`)
- `app/api/instagram/feed/route.ts` — optional live Instagram feed (only if `INSTAGRAM_ACCESS_TOKEN` is set)
- `middleware.ts` — optional password gate (only if `APP_PASSWORD` is set; for deployed use)

## Required Notion database properties

The database ID goes in `NOTION_SOCIAL_CALENDAR_DB`. Property names must match exactly:

| Property | Type | Used for |
|---|---|---|
| `Name` | Title | Post title |
| `IG Status` | Select | Post shows only when set (and hidden when `done`) |
| `Pipeline` | Select | Staging posts hidden when `not-started`, `done`, or empty |
| `Format` | Select | Post format label |
| `IG Publish` | Date | Scheduled date — the planner writes this |
| `CoverPhoto` | Files & media | The grid image (first file) |
| `Pillars` | Multi-select | Content pillar |
| `Series` | Text | Series label |
| `Sort Order` | Number | Optional — staging order, lower number first |

If the user renamed a property in Notion, either rename it back or update the matching name in `app/api/notion/content/route.ts`.

## Common tasks

- **Run locally:** `npm install` then `npm run dev`, open http://localhost:3000
- **Blank grid / errors:** visit http://localhost:3000/api/notion/debug — it reports whether env vars are set and what Notion answered, without revealing any secret. Most common cause: the Notion integration isn't connected to the database (open the database in Notion → ••• menu → Connections → add the integration).
- **Customizing:** the user may ask to rename properties, change colors, or adjust the grid. Keep changes minimal and preserve the security rules above.
