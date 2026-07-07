'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { InstagramGrid, type Post } from '@/components/instagram-grid'
import { InstagramCalendar } from '@/components/instagram-calendar'

interface UndoAction {
  postId: string
  previousDate: string | null
  label: string
}

interface LivePost {
  id: string
  caption: string
  type: string
  imageUrl: string | null
  timestamp: string
  permalink: string
}

export default function PlannerPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [livePosts, setLivePosts] = useState<LivePost[]>([])
  const [tokenDaysRemaining, setTokenDaysRemaining] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [undo, setUndo] = useState<UndoAction | null>(null)
  const [undoCountdown, setUndoCountdown] = useState(8)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const [notionRes, liveRes] = await Promise.all([
        fetch('/api/notion/content'),
        fetch('/api/instagram/feed'),
      ])
      const notionData = await notionRes.json()
      if (!notionRes.ok) { setErrorMsg(notionData?.error ?? `Error ${notionRes.status}`); return }
      setPosts(notionData)
      if (liveRes.ok) {
        const liveData = await liveRes.json()
        if (liveData?.posts) {
          setLivePosts(liveData.posts)
          if (typeof liveData.daysRemaining === 'number') setTokenDaysRemaining(liveData.daysRemaining)
        }
      }
    } catch {
      setErrorMsg('Network error. Try refreshing.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function clearUndoTimers() {
    if (undoTimer.current) clearTimeout(undoTimer.current)
    if (countdownTimer.current) clearInterval(countdownTimer.current)
  }

  function showUndo(action: UndoAction) {
    clearUndoTimers()
    setUndo(action)
    setUndoCountdown(8)

    countdownTimer.current = setInterval(() => {
      setUndoCountdown(n => n - 1)
    }, 1000)

    undoTimer.current = setTimeout(() => {
      setUndo(null)
      clearUndoTimers()
    }, 8000)
  }

  async function applyReschedule(postId: string, date: string | null) {
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, igPublish: date, isLocked: !!date } : p
    ))
    const res = await fetch('/api/notion/schedule', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageId: postId, date }),
    })
    if (!res.ok) load()
  }

  async function handleReschedule(postId: string, date: string | null) {
    const prev = posts.find(p => p.id === postId)
    const previousDate = prev?.igPublish ?? null

    const label = date
      ? `Scheduled to ${new Date(date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}`
      : 'Moved to staging'

    await applyReschedule(postId, date)
    showUndo({ postId, previousDate, label })
  }

  async function handleUndo() {
    if (!undo) return
    clearUndoTimers()
    await applyReschedule(undo.postId, undo.previousDate)
    setUndo(null)
  }

  const scheduled = posts.filter(p => p.isLocked).length
  const staging = posts.filter(p => !p.isLocked).length

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* header */}
      <div style={{ padding: isMobile ? '20px 16px 0' : '28px 36px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: isMobile ? 22 : 26, color: '#211D18', fontWeight: 600, marginBottom: 2 }}>
            Instagram Planner
          </h1>
          {!loading && !errorMsg && (
            <p style={{ fontSize: 12, color: '#8A8070', fontFamily: 'Jost, sans-serif' }}>
              {scheduled} scheduled &middot; {staging} in staging
            </p>
          )}
        </div>

        <button onClick={load} disabled={loading} style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
          background: 'none', border: '1px solid #E8E1D4', borderRadius: 6,
          cursor: loading ? 'default' : 'pointer',
          fontFamily: 'Jost, sans-serif', fontSize: 12, color: '#4A453F',
          opacity: loading ? 0.5 : 1,
        }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M10.5 6A4.5 4.5 0 1 1 6 1.5" /><path d="M6 1.5l2-2M6 1.5l2 2" />
          </svg>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* error */}
      {errorMsg && (
        <div style={{ margin: isMobile ? '16px' : '20px 28px', padding: '14px 18px', background: '#FFF5F5', border: '1px solid #FECACA', borderRadius: 8 }}>
          <p style={{ fontSize: 13, color: '#A22B2B', fontFamily: 'Jost, sans-serif', marginBottom: 4, fontWeight: 500 }}>Could not load from Notion</p>
          <p style={{ fontSize: 12, color: '#B45B5B', fontFamily: 'Jost, sans-serif' }}>{errorMsg}</p>
          <p style={{ fontSize: 11.5, color: '#8A8070', fontFamily: 'Jost, sans-serif', marginTop: 8 }}>
            Open the database in Notion, click ... menu, Connections, and add your integration.
          </p>
        </div>
      )}

      {loading && (
        <div style={{ padding: '80px 28px', textAlign: 'center', color: '#8A8070', fontFamily: 'Jost, sans-serif', fontSize: 13.5 }}>
          Loading from Notion...
        </div>
      )}

      {/* token expiry warning */}
      {tokenDaysRemaining !== null && tokenDaysRemaining <= 10 && (
        <div style={{ margin: isMobile ? '12px 16px 0' : '12px 36px 0', padding: '10px 16px', background: tokenDaysRemaining <= 3 ? '#FFF5F5' : '#FFFBEB', border: `1px solid ${tokenDaysRemaining <= 3 ? '#FECACA' : '#FDE68A'}`, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14 }}>{tokenDaysRemaining <= 3 ? '🔴' : '🟡'}</span>
          <p style={{ fontSize: 12, color: tokenDaysRemaining <= 3 ? '#A22B2B' : '#92400E', fontFamily: 'Jost, sans-serif', margin: 0 }}>
            Instagram token expires in <strong>{tokenDaysRemaining} day{tokenDaysRemaining !== 1 ? 's' : ''}</strong>. Go to Meta Dev Console → Graph API Explorer → generate a new token → update <code style={{ fontSize: 11 }}>INSTAGRAM_ACCESS_TOKEN</code> where your app runs (.env.local, or your host&apos;s dashboard) and reset <code style={{ fontSize: 11 }}>INSTAGRAM_TOKEN_DATE</code>.
          </p>
        </div>
      )}

      {/* content */}
      {!loading && !errorMsg && (
        isMobile ? (
          <div style={{ padding: '20px 16px 40px', display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div>
              <p style={{ fontSize: 10, color: '#8A8070', fontFamily: 'Jost, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Feed Preview</p>
              <InstagramGrid posts={posts} />
              {livePosts.length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0 12px' }}>
                    <div style={{ flex: 1, height: 1, background: '#E8E1D4' }} />
                    <span style={{ fontSize: 9, color: '#C4B9A8', fontFamily: 'Jost, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                      Live on Instagram
                    </span>
                    <div style={{ flex: 1, height: 1, background: '#E8E1D4' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
                    {livePosts.slice(0, 12).map(post => (
                      <div
                        key={post.id}
                        onClick={() => window.open(post.permalink, '_blank')}
                        title={post.caption?.slice(0, 80) || ''}
                        style={{ position: 'relative', aspectRatio: '3/4', borderRadius: 3, overflow: 'hidden', cursor: 'pointer', background: '#E8E1D4' }}
                      >
                        {post.imageUrl ? (
                          <img src={post.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: '#F0EBE3' }} />
                        )}
                        {post.type === 'VIDEO' && (
                          <div style={{ position: 'absolute', top: 5, right: 5 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="white" opacity={0.85}><polygon points="5 3 19 12 5 21 5 3"/></svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div>
              <p style={{ fontSize: 10, color: '#8A8070', fontFamily: 'Jost, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Schedule</p>
              <InstagramCalendar posts={posts} onReschedule={handleReschedule} />
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', gap: 0, padding: '28px 0 0', overflow: 'hidden', height: 'calc(100vh - 120px)' }}>
            {/* wider grid panel */}
            <div style={{ width: 440, flexShrink: 0, borderRight: '1px solid #E8E1D4', overflowY: 'auto', padding: '0 64px 40px 32px' }}>
              <p style={{ fontSize: 10, color: '#8A8070', fontFamily: 'Jost, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 18, paddingTop: 4 }}>Feed Preview</p>
              <InstagramGrid posts={posts} />
              {livePosts.length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '28px 0 14px' }}>
                    <div style={{ flex: 1, height: 1, background: '#E8E1D4' }} />
                    <span style={{ fontSize: 9, color: '#C4B9A8', fontFamily: 'Jost, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                      Live on Instagram
                    </span>
                    <div style={{ flex: 1, height: 1, background: '#E8E1D4' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
                    {livePosts.slice(0, 12).map(post => (
                      <div
                        key={post.id}
                        onClick={() => window.open(post.permalink, '_blank')}
                        title={post.caption?.slice(0, 80) || ''}
                        style={{ position: 'relative', aspectRatio: '3/4', borderRadius: 3, overflow: 'hidden', cursor: 'pointer', background: '#E8E1D4' }}
                      >
                        {post.imageUrl ? (
                          <img src={post.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: '#F0EBE3' }} />
                        )}
                        {post.type === 'CAROUSEL_ALBUM' && (
                          <div style={{ position: 'absolute', top: 5, right: 5 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="white" opacity={0.85}><rect x="2" y="7" width="15" height="15" rx="2"/><path d="M22 7V5a2 2 0 0 0-2-2H9" stroke="white" strokeWidth="2" fill="none"/></svg>
                          </div>
                        )}
                        {post.type === 'VIDEO' && (
                          <div style={{ position: 'absolute', top: 5, right: 5 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="white" opacity={0.85}><polygon points="5 3 19 12 5 21 5 3"/></svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            {/* calendar takes remaining space */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 36px 40px 64px' }}>
              <p style={{ fontSize: 10, color: '#8A8070', fontFamily: 'Jost, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20, paddingTop: 4 }}>Schedule</p>
              <InstagramCalendar posts={posts} onReschedule={handleReschedule} />
            </div>
          </div>
        )
      )}

      {/* undo toast */}
      {undo && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: '#211D18', borderRadius: 10, padding: '12px 18px',
          display: 'flex', alignItems: 'center', gap: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
          zIndex: 9999, whiteSpace: 'nowrap',
        }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontFamily: 'Jost, sans-serif' }}>
            {undo.label}
          </span>
          <button
            onClick={handleUndo}
            style={{
              background: '#A22B2B', border: 'none', borderRadius: 6,
              padding: '4px 12px', cursor: 'pointer',
              fontFamily: 'Jost, sans-serif', fontSize: 12, color: '#fff', fontWeight: 500,
            }}
          >
            Undo
          </button>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Jost, sans-serif', minWidth: 12 }}>
            {undoCountdown}s
          </span>
        </div>
      )}
    </div>
  )
}
