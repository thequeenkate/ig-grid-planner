'use client'

import { useState, useRef } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, isSameDay, addMonths, subMonths } from 'date-fns'
import type { Post } from './instagram-grid'

interface Props {
  posts: Post[]
  onReschedule: (postId: string, date: string | null) => void
}

const MONTHS_SHOWN = 4
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function InstagramCalendar({ posts: allPosts, onReschedule }: Props) {
  const [startMonth, setStartMonth] = useState(() => startOfMonth(new Date()))
  const [dragOverDay, setDragOverDay] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const monthRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const months = Array.from({ length: MONTHS_SHOWN }, (_, i) => addMonths(startMonth, i))
  const scheduled = allPosts.filter(p => p.isLocked && p.igPublish)
  const unscheduled = allPosts.filter(p => !p.isLocked)

  const todayMonthKey = format(startOfMonth(new Date()), 'yyyy-MM')
  const todayInView = months.some(m => format(m, 'yyyy-MM') === todayMonthKey)

  function postsOnDay(day: Date) {
    return scheduled.filter(p => isSameDay(parseLocalDate(p.igPublish!), day))
  }

  function handleDragStart(e: React.DragEvent, postId: string) {
    e.dataTransfer.setData('text/plain', postId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingId(postId)
  }

  function handleDragEnd() {
    setDraggingId(null)
    setDragOverDay(null)
  }

  function handleDayDragOver(e: React.DragEvent, dayStr: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverDay(dayStr)
  }

  function handleDayDrop(e: React.DragEvent, day: Date) {
    e.preventDefault()
    const postId = e.dataTransfer.getData('text/plain')
    if (!postId) return
    onReschedule(postId, format(day, 'yyyy-MM-dd'))
    setDragOverDay(null)
    setDraggingId(null)
  }

  function goBack() {
    setStartMonth(m => subMonths(m, 1))
  }

  function scrollToToday() {
    if (!todayInView) setStartMonth(startOfMonth(new Date()))
    setTimeout(() => {
      monthRefs.current[todayMonthKey]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  return (
    <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>

      {/* scrollable calendar column */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* nav bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <button
            onClick={goBack}
            title="Previous month"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', color: '#4A453F' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M9 2L4 7l5 5" />
            </svg>
          </button>

          <button
            onClick={scrollToToday}
            style={{
              background: 'none', border: '1px solid #D4C9B8', borderRadius: 5,
              padding: '4px 12px', cursor: 'pointer',
              fontFamily: 'Jost, sans-serif', fontSize: 11, color: '#8B1A1A', fontWeight: 500,
              letterSpacing: '0.03em',
            }}
          >
            Today
          </button>

          {/* right spacer to keep Today centered */}
          <div style={{ width: 30 }} />
        </div>

        {/* months stacked */}
        {months.map(monthDate => {
          const monthKey = format(monthDate, 'yyyy-MM')
          const monthStart = startOfMonth(monthDate)
          const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(monthDate) })
          const pad = (getDay(monthStart) + 6) % 7

          return (
            <div
              key={monthKey}
              ref={el => { monthRefs.current[monthKey] = el }}
              style={{ marginBottom: 48 }}
            >
              {/* month label */}
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, color: '#211D18', fontWeight: 600 }}>
                  {format(monthDate, 'MMMM yyyy')}
                </span>
              </div>

              {/* weekday headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
                {WEEKDAYS.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 10, color: '#8A8070', fontFamily: 'Jost, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 0' }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* day grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                {Array.from({ length: pad }).map((_, i) => (
                  <div key={`pad-${i}`} style={{ aspectRatio: '3/4', background: '#F8F4EE', borderRadius: 3 }} />
                ))}

                {days.map(day => {
                  const dayStr = format(day, 'yyyy-MM-dd')
                  const dayPosts = postsOnDay(day)
                  const today = isToday(day)
                  const isDragOver = dragOverDay === dayStr

                  return (
                    <div
                      key={dayStr}
                      onDragOver={e => handleDayDragOver(e, dayStr)}
                      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverDay(null) }}
                      onDrop={e => handleDayDrop(e, day)}
                      style={{
                        aspectRatio: '3/4',
                        position: 'relative',
                        background: isDragOver ? '#EEF6F1' : today ? '#FFF5F5' : '#fff',
                        border: isDragOver ? '2px solid #2A6145' : today ? '3px solid #8B1A1A' : '1px solid #E8E1D4',
                        borderRadius: 4,
                        padding: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        overflow: 'hidden',
                        transition: 'background 0.1s, border-color 0.1s',
                        boxSizing: 'border-box',
                      }}
                    >
                      {today && (
                        <div style={{
                          position: 'absolute', top: 0, right: 0,
                          width: 0, height: 0,
                          borderTop: '14px solid #8B1A1A',
                          borderLeft: '14px solid transparent',
                          zIndex: 1,
                        }} />
                      )}

                      <span style={{ fontSize: 10, color: today ? '#8B1A1A' : '#8A8070', fontFamily: 'Jost, sans-serif', lineHeight: 1, fontWeight: today ? 700 : 400, flexShrink: 0 }}>
                        {format(day, 'd')}
                      </span>

                      {dayPosts.slice(0, 2).map(post => (
                        <div
                          key={post.id}
                          draggable
                          onDragStart={e => handleDragStart(e, post.id)}
                          onDragEnd={handleDragEnd}
                          style={{ position: 'relative', cursor: 'grab', opacity: draggingId === post.id ? 0.35 : 1, transition: 'opacity 0.15s', flexShrink: 0 }}
                          title={post.title}
                        >
                          {post.coverPhoto ? (
                            <img
                              src={post.coverPhoto}
                              alt={post.title}
                              draggable={false}
                              onClick={e => { e.stopPropagation(); window.open(post.notionUrl, '_blank') }}
                              style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 2, display: 'block', cursor: 'pointer' }}
                            />
                          ) : (
                            <div
                              onClick={e => { e.stopPropagation(); window.open(post.notionUrl, '_blank') }}
                              style={{ width: '100%', padding: '2px 3px', background: '#A22B2B', borderRadius: 2, fontSize: 8, color: '#fff', fontFamily: 'Jost, sans-serif', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', cursor: 'pointer' }}
                            >
                              {post.title || 'Post'}
                            </div>
                          )}

                          <button
                            onClick={e => { e.stopPropagation(); onReschedule(post.id, null) }}
                            title="Remove from calendar"
                            className="unschedule-btn"
                            style={{ position: 'absolute', top: 1, right: 1, width: 12, height: 12, background: 'rgba(33,29,24,0.7)', border: 'none', borderRadius: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s', padding: 0, lineHeight: 1, fontSize: 9, color: '#fff' }}
                          >
                            ×
                          </button>
                        </div>
                      ))}

                      {dayPosts.length > 2 && (
                        <span style={{ fontSize: 8, color: '#8A8070', fontFamily: 'Jost, sans-serif' }}>
                          +{dayPosts.length - 2}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* staging sidebar */}
      {unscheduled.length > 0 && (
        <div style={{ width: 220, flexShrink: 0 }}>
          <p style={{ fontSize: 10, color: '#8A8070', fontFamily: 'Jost, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
            Staging ({unscheduled.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {unscheduled.map(post => (
              <div
                key={post.id}
                draggable
                onDragStart={e => handleDragStart(e, post.id)}
                onDragEnd={handleDragEnd}
                onClick={() => window.open(post.notionUrl, '_blank')}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#D4C9B8')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#E8E1D4')}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#fff', border: '1px solid #E8E1D4', borderRadius: 8, cursor: 'grab', transition: 'border-color 0.15s, opacity 0.15s', opacity: draggingId === post.id ? 0.35 : 1, userSelect: 'none' }}
              >
                {post.coverPhoto ? (
                  <img src={post.coverPhoto} alt="" draggable={false} style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 32, height: 32, background: '#E8E1D4', borderRadius: 3, flexShrink: 0 }} />
                )}
                <span style={{ fontSize: 11.5, color: '#4A453F', fontFamily: 'Jost, sans-serif', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {post.title || 'Untitled'}
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 10, color: '#C4B9A8', fontFamily: 'Jost, sans-serif', marginTop: 14, textAlign: 'center' }}>
            Drag onto a date to schedule
          </p>
        </div>
      )}

      <style>{`
        [draggable]:hover .unschedule-btn { opacity: 1 !important; }
        div:hover > div > .unschedule-btn { opacity: 1 !important; }
      `}</style>

    </div>
  )
}
