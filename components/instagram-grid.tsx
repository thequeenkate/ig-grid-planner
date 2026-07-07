'use client'

import { format, isToday } from 'date-fns'

export interface Post {
  id: string
  notionUrl: string
  title: string
  igStatus: string
  pipeline: string
  format: string
  igPublish: string | null
  coverPhoto: string | null
  pillar: string
  series: string
  sortOrder: number
  isLocked: boolean
}

interface Props {
  posts: Post[]
}

export function InstagramGrid({ posts }: Props) {
  function parseLocalDate(str: string): Date {
    const [y, m, d] = str.split('-').map(Number)
    return new Date(y, m - 1, d)
  }

  const scheduled = posts
    .filter(p => p.isLocked)
    .sort((a, b) => {
      if (!a.igPublish || !b.igPublish) return 0
      return parseLocalDate(b.igPublish).getTime() - parseLocalDate(a.igPublish).getTime()
    })

  const drafts = posts.filter(p => !p.isLocked).sort((a, b) => a.sortOrder - b.sortOrder)

  if (posts.length === 0) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: '#8A8070', fontFamily: 'Jost, sans-serif', fontSize: 13 }}>
        No posts found.
      </div>
    )
  }

  return (
    <div>
      {/* scheduled posts */}
      {scheduled.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
          {scheduled.map(post => {
            const publishedToday = !!post.igPublish && isToday(parseLocalDate(post.igPublish))
            return (
            <div
              key={post.id}
              onClick={() => window.open(post.notionUrl, '_blank')}
              title={post.title}
              style={{ position: 'relative', aspectRatio: '3/4', borderRadius: 3, overflow: 'hidden', cursor: 'pointer', background: '#E8E1D4', border: publishedToday ? '1.5px solid #8B1A1A' : undefined }}
            >
              {post.coverPhoto ? (
                <img src={post.coverPhoto} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
                  <span style={{ fontSize: 9, color: '#8A8070', textAlign: 'center', fontFamily: 'Jost, sans-serif', lineHeight: 1.3 }}>{post.title || 'No title'}</span>
                </div>
              )}
              {/* today triangle */}
              {publishedToday && (
                <div style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderTop: '11px solid #8B1A1A', borderLeft: '11px solid transparent', zIndex: 2 }} />
              )}
              {/* date badge */}
              <div style={{ position: 'absolute', top: 5, left: 5, background: 'rgba(33,29,24,0.65)', borderRadius: 3, padding: '2px 5px', display: 'flex', alignItems: 'center', gap: 3 }}>
                <svg width="7" height="8" viewBox="0 0 8 9" fill="none"><rect x="1" y="4" width="6" height="5" rx="1" fill="rgba(255,255,255,0.7)" /><path d="M2.5 4V3a1.5 1.5 0 0 1 3 0v1" stroke="rgba(255,255,255,0.7)" strokeWidth="1" strokeLinecap="round" /></svg>
                {post.igPublish && (
                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.8)', fontFamily: 'Jost, sans-serif' }}>
                    {format(parseLocalDate(post.igPublish), 'MMM d')}
                  </span>
                )}
              </div>
            </div>
          )})}

        </div>
      )}

      {/* divider */}
      {scheduled.length > 0 && drafts.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 12px' }}>
          <div style={{ flex: 1, height: 1, background: '#E8E1D4' }} />
          <span style={{ fontSize: 9, color: '#C4B9A8', fontFamily: 'Jost, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
            Staging
          </span>
          <div style={{ flex: 1, height: 1, background: '#E8E1D4' }} />
        </div>
      )}

      {/* staging posts */}
      {drafts.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
          {drafts.map(post => (
            <div
              key={post.id}
              onClick={() => window.open(post.notionUrl, '_blank')}
              title={post.title}
              style={{ position: 'relative', aspectRatio: '3/4', borderRadius: 3, overflow: 'hidden', cursor: 'pointer', background: '#F0EBE3', border: '1.5px dashed #D4C9B8' }}
            >
              {post.coverPhoto ? (
                <img src={post.coverPhoto} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.85 }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
                  <span style={{ fontSize: 9, color: '#C4B9A8', textAlign: 'center', fontFamily: 'Jost, sans-serif', lineHeight: 1.3 }}>{post.title || 'Untitled'}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
