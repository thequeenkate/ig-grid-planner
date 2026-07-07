# IG Grid Planner

Plan your Instagram feed from your Notion content calendar. A 3-column grid preview of what your feed will look like, plus a drag-and-drop calendar to schedule posts — every change writes straight back to Notion.

Part of the **IG Grid Planner Kit**. The kit's playbook walks you through the full setup step by step (including installing Claude Code, which does most of the work for you) and includes a duplicatable Notion template with the exact database this app expects.

## What it does

- **Feed preview** — your scheduled + staged posts as a 3-column portrait grid, using each post's cover photo from Notion
- **Drag-and-drop scheduling** — drag a staged post onto a calendar day and the publish date is saved to Notion; drag between days to reschedule; every change has an 8-second undo
- **Staging area** — posts that are in progress but not yet dated
- **Optional live feed** — your 12 most recent real Instagram posts under the preview (needs a Meta API token; skip on first setup)

## Quick start

1. Duplicate the Notion template (link in the playbook) or create a database with the properties listed in [CLAUDE.md](CLAUDE.md)
2. Create a Notion integration at [notion.so/my-integrations](https://www.notion.so/my-integrations) and connect it to your database (••• menu → Connections)
3. Copy `.env.example` to `.env.local` and fill in `NOTION_TOKEN` and `NOTION_SOCIAL_CALENDAR_DB`
4. `npm install && npm run dev`, then open [http://localhost:3000](http://localhost:3000)

Not sure how to do any of that? That's what the playbook + Claude Code are for — paste the setup prompt from the playbook into Claude Code and it walks you through everything.

## Troubleshooting

- Blank grid or an error banner → open [http://localhost:3000/api/notion/debug](http://localhost:3000/api/notion/debug). It tells you which env vars are missing and what Notion answered (never your token).
- Most common fix: the integration isn't connected to the database. Open the database in Notion → ••• → Connections → add your integration.
- Cover images disappear after ~1 hour → normal. Notion image links expire; hit Refresh in the planner.

## Deploying online (optional)

Runs anywhere Next.js runs (e.g. Vercel). If you deploy, set `APP_PASSWORD` in your host's environment variables so your planner isn't public — the app asks for that password before showing anything.

## Security

Your Notion token stays in `.env.local` on your machine (or your host's environment settings). Never paste it into a chat, a screenshot, or a git commit. The included `CLAUDE.md` instructs Claude Code to follow the same rules.
