import { ArrowLeft, LoaderCircle, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getAchievements, setFeaturedBadge, type AchievementCollection, type RankedIdentity } from '../api/ranked'
import { BadgeMark } from '../components/BadgeMark'
import { BADGES, BADGE_CATEGORY_LABELS, type BadgeCategory } from '../domain/achievements'

export function BadgeCollectionScreen({ identity, onBack }: { identity: RankedIdentity; onBack: () => void }) {
  const [collection, setCollection] = useState<AchievementCollection | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')
  const load = useCallback(() => { setLoading(true); setError(''); getAchievements(identity).then(setCollection).catch(caught => setError(caught instanceof Error ? caught.message : 'The trophy cabinet would not open.')).finally(() => setLoading(false)) }, [identity])
  useEffect(load, [load])
  const earned = useMemo(() => new Set(collection?.earned.map(item => item.badgeId) || []), [collection])
  const feature = async (badgeId: string) => {
    if (!earned.has(badgeId) || saving) return
    setSaving(badgeId); setError('')
    try { const result = await setFeaturedBadge(identity, badgeId); setCollection(current => current ? { ...current, featuredBadgeId: result.featuredBadgeId } : current) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'That badge could not be pinned.') }
    finally { setSaving('') }
  }
  const groups = (['matchday', 'consistency', 'detective', 'game'] as BadgeCategory[])
  return <div className="badges-page">
    <button className="badges-back" onClick={onBack}><ArrowLeft/> Profile & weekly table</button>
    <p className="eyebrow">PLAYER HONOURS</p><div className="badges-title"><span><Sparkles/></span><h1>The Badge<br/>Cabinet</h1></div>
    <p className="badges-intro">Football honours earned from ranked cases. Badges are cosmetic and never alter your score.</p>
    {loading && <div className="leader-state"><LoaderCircle className="spin"/> Checking the honours list…</div>}
    {error && <div className="leader-state error"><span>{error}</span><button onClick={load}><RefreshCw/> Retry</button></div>}
    {collection && <>
      <section className="featured-badge-card"><small>FEATURED BESIDE YOUR NAME</small>{collection.featuredBadgeId ? (() => { const badge = BADGES.find(item => item.id === collection.featuredBadgeId)!; return <><BadgeMark badge={badge}/><span><strong>{badge.name}</strong><em>{badge.description}</em></span></> })() : <><span className="empty-feature"><ShieldCheck/></span><span><strong>No badge pinned yet</strong><em>Choose any earned honour below.</em></span></>}</section>
      <p className="cabinet-count"><strong>{earned.size}</strong> of {BADGES.length} collected</p>
      {groups.map(category => <section className="badge-group" key={category}><h2>{BADGE_CATEGORY_LABELS[category]}</h2><div className="badge-grid">
        {BADGES.filter(badge => badge.category === category).map(badge => {
          const unlocked = earned.has(badge.id); const progress = Math.min(badge.target, collection.progress[badge.id] || 0)
          return <button className={`badge-card ${unlocked ? 'earned' : 'locked'}`} key={badge.id} disabled={!unlocked || Boolean(saving)} onClick={() => feature(badge.id)}>
            <BadgeMark badge={badge} locked={!unlocked}/><span><strong>{badge.name}</strong><em>{badge.description}</em>{unlocked ? <small>{collection.featuredBadgeId === badge.id ? 'PINNED TO PROFILE' : 'TAP TO FEATURE'}</small> : <span className="badge-progress"><i style={{ width: `${Math.min(100, progress / badge.target * 100)}%` }}/><b>{progress}/{badge.target}</b></span>}</span>
          </button>
        })}
      </div></section>)}
    </>}
  </div>
}
