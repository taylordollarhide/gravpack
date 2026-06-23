import { useState, useEffect, useRef, useCallback } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { createFileRoute } from '@tanstack/react-router'
import {
  type Item, type Household, type Category, type Screen, type ExpiryType,
  UNITS, LOCATIONS, CATEGORIES, CAT_EMOJI, DEFAULT_HOUSEHOLD,
  loadItems, saveItems, loadHousehold, saveHousehold,
  loadDisplayName, saveDisplayName, loadLastBackup, getStorageSize,
  type ThemePreference, loadTheme, saveTheme, applyTheme,
  type AccentOption, ACCENT_OPTIONS, loadAccentColor, saveAccentColor, applyAccentColor,
  getExpiryStatus, getExpiryBadgeText, formatDate,
  calcScores, scoreColor, buildStrategy,
  exportCSV, parseCSV,
} from '@/lib/gravpack'

// ─── Utility ─────────────────────────────────────────────────────────────────

function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

function toTitleCase(s: string) {
  return s.replace(/\b\w/g, c => c.toUpperCase())
}


// ─── Expiry badge ─────────────────────────────────────────────────────────────

function ExpiryBadge({ expiry, depleted, expiryType }: { expiry: string | null; depleted: boolean; expiryType?: ExpiryType }) {
  if (depleted) return <span className="badge-depleted">DEPLETED</span>
  const status = getExpiryStatus(expiry, expiryType)
  const text = getExpiryBadgeText(expiry, expiryType)
  const cls = `badge badge-${status === 'noexp' ? 'accent' : status}`
  return <span className={cls}>{text}</span>
}

// ─── Item Card ────────────────────────────────────────────────────────────────

function ItemCard({ item, onClick, deleting }: { item: Item; onClick: () => void; deleting?: boolean }) {
  return (
    <div className={`item-card${deleting ? ' deleting' : ''}`} onClick={onClick}>
      <div className="item-left">
        <div className="item-name">{item.name}</div>
        <div className="item-meta">
          {item.location && `${item.location} · `}{item.qty} {item.unit}
          {item.category && <> · <span className="material-icons" style={{ fontSize: 15, verticalAlign: 'middle' }}>{CAT_EMOJI[item.category]}</span> {item.category}</>}
        </div>
      </div>
      <ExpiryBadge expiry={item.expiry} depleted={item.depleted} expiryType={item.expiryType} />
    </div>
  )
}

// ─── Shelf Screen ─────────────────────────────────────────────────────────────

function ValueBreakdownModal({ items, onClose }: { items: Item[]; onClose: () => void }) {
  const activeItems = items.filter(i => !i.depleted && i.price && i.qty)
  const total = activeItems.reduce((s, i) => s + i.price! * i.qty, 0)
  const byCategory = CATEGORIES.map(cat => {
    const catItems = activeItems.filter(i => i.category === cat)
    const value = catItems.reduce((s, i) => s + i.price! * i.qty, 0)
    const count = catItems.length
    return { cat, value, count }
  }).filter(r => r.value > 0).sort((a, b) => b.value - a.value)

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 16px 0' }}>
          <button className="overflow-btn" style={{ visibility: 'hidden' }}>
            <span className="material-icons" style={{ fontSize: 22 }}>close</span>
          </button>
          <div className="modal-handle" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 20 }} />
          <button className="overflow-btn" onClick={onClose}>
            <span className="material-icons" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>

        <div className="detail-hero" style={{ paddingBottom: 8 }}>
          <div className="detail-name">${total.toFixed(0)}</div>
          <div className="detail-qty">total inventory value</div>
        </div>

        <div style={{ padding: '8px 16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {byCategory.map(({ cat, value, count }) => {
            const pct = total > 0 ? (value / total) * 100 : 0
            return (
              <div key={cat} className="value-breakdown-row">
                <div className="value-breakdown-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-icons" style={{ fontSize: 18, color: 'var(--t3)' }}>{CAT_EMOJI[cat]}</span>
                    <span className="value-breakdown-cat">{cat}</span>
                    <span className="value-breakdown-count">{count} item{count !== 1 ? 's' : ''}</span>
                  </div>
                  <span className="value-breakdown-val">${value.toFixed(0)}</span>
                </div>
                <div className="value-breakdown-bar-track">
                  <div className="value-breakdown-bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
          {byCategory.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--t3)', fontFamily: 'var(--sans)', fontSize: 14, padding: '24px 0' }}>
              No priced items on shelf
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ItemsBreakdownModal({ items, onClose }: { items: Item[]; onClose: () => void }) {
  const activeItems = items.filter(i => !i.depleted)
  const total = activeItems.length
  const byCategory = CATEGORIES.map(cat => {
    const catItems = activeItems.filter(i => i.category === cat)
    return { cat, count: catItems.length, totalQty: catItems.reduce((s, i) => s + i.qty, 0) }
  }).filter(r => r.count > 0).sort((a, b) => b.count - a.count)

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 16px 0' }}>
          <div style={{ width: 36 }} />
          <div className="modal-handle" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 20 }} />
          <button className="overflow-btn" onClick={onClose}>
            <span className="material-icons" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>

        <div className="detail-hero" style={{ paddingBottom: 8 }}>
          <div className="detail-name">{total} items</div>
          <div className="detail-qty">active inventory by category</div>
        </div>

        <div style={{ padding: '8px 16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {byCategory.map(({ cat, count, totalQty }) => {
            const pct = total > 0 ? (count / total) * 100 : 0
            return (
              <div key={cat} className="value-breakdown-row">
                <div className="value-breakdown-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-icons" style={{ fontSize: 18, color: 'var(--t3)' }}>{CAT_EMOJI[cat]}</span>
                    <span className="value-breakdown-cat">{cat}</span>
                    <span className="value-breakdown-count">{totalQty} units</span>
                  </div>
                  <span className="value-breakdown-val">{count} item{count !== 1 ? 's' : ''}</span>
                </div>
                <div className="value-breakdown-bar-track">
                  <div className="value-breakdown-bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function RestockBreakdownModal({ items, onClose, onItemClick }: { items: Item[]; onClose: () => void; onItemClick: (item: Item) => void }) {
  const depleted = items.filter(i => i.depleted)
  const byCategory = CATEGORIES.map(cat => ({
    cat,
    items: depleted.filter(i => i.category === cat),
  })).filter(r => r.items.length > 0)

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 16px 0' }}>
          <div style={{ width: 36 }} />
          <div className="modal-handle" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 20 }} />
          <button className="overflow-btn" onClick={onClose}>
            <span className="material-icons" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>

        <div className="detail-hero" style={{ paddingBottom: 8 }}>
          <div className="detail-name">{depleted.length} to restock</div>
          <div className="detail-qty">tap an item to restock it</div>
        </div>

        <div style={{ padding: '0 0 24px' }}>
          {byCategory.map(({ cat, items: catItems }) => (
            <div key={cat}>
              <div className="section-dot-row">
                <span className="material-icons" style={{ fontSize: 14, color: 'var(--t3)' }}>{CAT_EMOJI[cat]}</span>
                {cat}
              </div>
              {catItems.map(item => (
                <div key={item.id} className="item-card" style={{ opacity: 0.85 }} onClick={() => { onItemClick(item); onClose() }}>
                  <div className="item-left">
                    <div className="item-name">{item.name}</div>
                    <div className="item-meta">{item.location || '—'} · {item.unit}</div>
                  </div>
                  <span className="badge badge-depleted">Depleted</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ShelfScreen({
  items, household, onItemClick, onRestock, deletingId, onShowValueBreakdown, onShowRestockBreakdown, onShowItemsBreakdown, onGoToExpiring, onShowLocalInfo,
}: {
  items: Item[]
  household: Household
  onItemClick: (item: Item) => void
  onRestock: (item: Item) => void
  deletingId?: string | null
  onShowValueBreakdown: () => void
  onShowRestockBreakdown: () => void
  onShowItemsBreakdown: () => void
  onGoToExpiring: () => void
  onShowLocalInfo: () => void
}) {
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<string>('All')

  const filtered = items.filter(i => {
    if (i.depleted) return false
    if (catFilter !== 'All' && i.category !== catFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return i.name.toLowerCase().includes(q) || i.location.toLowerCase().includes(q)
    }
    return true
  })

  const depleted = items.filter(i => i.depleted)
  const expired = filtered.filter(i => getExpiryStatus(i.expiry, i.expiryType) === 'expired')
  const critical = filtered.filter(i => getExpiryStatus(i.expiry, i.expiryType) === 'critical')
  const needsAttn = [...expired, ...critical]
  const good = filtered.filter(i => !needsAttn.includes(i))

  const totalValue = items.filter(i => !i.depleted && i.price && i.qty)
    .reduce((s, i) => s + (i.price! * i.qty), 0)

  const trendItems = items.filter(i => i.priceHistory.length >= 2)

  const totalItems = items.filter(i => !i.depleted).length
  const scores = calcScores(household, items)
  const foodDays = Math.floor(scores.foodDays ?? 0)
  const waterDays = Math.floor(scores.waterDays ?? 0)

  return (
    <div className="screen" style={{ display: 'block' }}>
      <div className="screen-header">
        <span className="screen-title">SHELF</span>
        <span className="local-badge" style={{ cursor: 'pointer' }} onClick={onShowLocalInfo}>
          <span className="material-icons" style={{ fontSize: 8, color: 'var(--good)', verticalAlign: 'middle' }}>circle</span>
          LOCAL ONLY
        </span>
      </div>

      <div className="stats-bar">
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={onShowItemsBreakdown}>
          <div className="stat-val">{totalItems}</div>
          <div className="stat-lbl">Items ›</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{foodDays}<span style={{ color: 'var(--t3)', fontSize: '0.65em' }}>/d</span></div>
          <div className="stat-lbl">Food</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{waterDays}<span style={{ color: 'var(--t3)', fontSize: '0.65em' }}>/d</span></div>
          <div className="stat-lbl">Water</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={onShowValueBreakdown}>
          <div className="stat-val">${totalValue.toFixed(0)}</div>
          <div className="stat-lbl">Value ›</div>
        </div>
      </div>

      <div className="search-wrap">
        <div className="search-bar">
          <span className="material-icons" style={{ fontSize: 18, color: 'var(--t3)' }}>search</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items..."
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
          )}
        </div>
      </div>

      <div className="filter-pills">
        {['All', ...CATEGORIES].map(c => (
          <button key={c} className={`fpill${catFilter === c ? ' active' : ''}`} onClick={() => setCatFilter(c)}>
            {c !== 'All' && <span className="material-icons" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 3 }}>{CAT_EMOJI[c as Category]}</span>}{c}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-title">SHELF EMPTY</div>
          <div className="empty-sub">Tap + to add your first item.<br />Know what you have.</div>
        </div>
      ) : (
        <>
          {needsAttn.length > 0 && (
            <>
              <div className="section-dot-row">
                <div className="dot" style={{ background: 'var(--red)' }} />
                Needs attention
              </div>
              {needsAttn.map(i => <ItemCard key={i.id} item={i} onClick={() => onItemClick(i)} deleting={deletingId === i.id} />)}
            </>
          )}

          {trendItems.length > 0 && (
            <>
              <div className="section-label">Price trends</div>
              {trendItems.map(i => {
                const first = i.priceHistory[0].price
                const last = i.priceHistory[i.priceHistory.length - 1].price
                const pct = ((last - first) / first) * 100
                const up = pct > 0
                return (
                  <div key={i.id} className="trend-card" onClick={() => onItemClick(i)}>
                    <div className="trend-left">
                      <div className="trend-name">{i.name}</div>
                      <div className="trend-meta">{i.priceHistory.length} price records</div>
                    </div>
                    <div className="trend-right">
                      <div className={`trend-pct ${up ? 'up' : 'down'}`}>{up ? '↑' : '↓'}{Math.abs(pct).toFixed(0)}%</div>
                      <div className="trend-prices">${first.toFixed(2)} → ${last.toFixed(2)}</div>
                    </div>
                  </div>
                )
              })}
            </>
          )}
          {depleted.length > 0 && (
            <>
              <div className="section-dot-row">
                <div className="dot" style={{ background: 'var(--yellow)' }} />
                Depleted · restock needed
              </div>
              {depleted.map(i => (
                <div key={i.id} className="depleted-card" onClick={() => onItemClick(i)}>
                  <div>
                    <div className="depleted-name">{i.name}</div>
                    <div className="depleted-meta">{i.category} · {i.location}</div>
                  </div>
                  <button className="restock-btn" onClick={e => { e.stopPropagation(); onRestock(i) }}>Restock</button>
                </div>
              ))}
            </>
          )}
          {good.length > 0 && (
            <>
              <div className="section-dot-row">
                <div className="dot" style={{ background: 'var(--good)' }} />
                Good standing
              </div>
              {good.map(i => <ItemCard key={i.id} item={i} onClick={() => onItemClick(i)} deleting={deletingId === i.id} />)}
            </>
          )}

          {depleted.length > 0 && (
            <>
              <div className="section-dot-row">
                <div className="dot" style={{ background: 'var(--yellow)' }} />
                Depleted · restock needed
              </div>
              {depleted.map(i => (
                <div key={i.id} className="depleted-card" onClick={() => onItemClick(i)}>
                  <div>
                    <div className="depleted-name">{i.name}</div>
                    <div className="depleted-meta">{i.category} · {i.location}</div>
                  </div>
                  <button className="restock-btn" onClick={e => { e.stopPropagation(); onRestock(i) }}>Restock</button>
                </div>
              ))}
            </>
          )}
        </>
      )}

      <div style={{ height: 16 }} />
    </div>
  )
}

// ─── Expiring Screen ──────────────────────────────────────────────────────────

function ExpiringScreen({ items, onItemClick }: { items: Item[]; onItemClick: (i: Item) => void }) {
  const active = items.filter(i => !i.depleted && i.expiry)
  const expired = active.filter(i => getExpiryStatus(i.expiry, i.expiryType) === 'expired')
  const pastBestBy = active.filter(i => getExpiryStatus(i.expiry, i.expiryType) === 'past-best-by')
  const critical = active.filter(i => getExpiryStatus(i.expiry, i.expiryType) === 'critical')
  const warning = active.filter(i => getExpiryStatus(i.expiry, i.expiryType) === 'warning')

  const allClear = expired.length === 0 && critical.length === 0 && warning.length === 0 && pastBestBy.length === 0

  return (
    <div className="screen" style={{ display: 'block' }}>
      <div className="screen-header">
        <span className="screen-title">EXPIRING</span>
      </div>

      {allClear ? (
        <div className="empty-state">
          <div className="empty-title">ALL CLEAR</div>
          <div className="empty-sub">No items expiring soon.<br />Add items with expiry dates to track them.</div>
        </div>
      ) : (
        <>
          {expired.length > 0 && (
            <>
              <div className="section-dot-row">
                <div className="dot" style={{ background: 'var(--red)' }} />
                EXPIRED — replace now
              </div>
              {expired.map(i => <ItemCard key={i.id} item={i} onClick={() => onItemClick(i)} />)}
            </>
          )}
          {critical.length > 0 && (
            <>
              <div className="section-dot-row">
                <div className="dot" style={{ background: 'var(--orange)' }} />
                CRITICAL — under 30 days
              </div>
              {critical.map(i => <ItemCard key={i.id} item={i} onClick={() => onItemClick(i)} />)}
            </>
          )}
          {pastBestBy.length > 0 && (
            <>
              <div className="section-dot-row">
                <div className="dot" style={{ background: 'var(--yellow)' }} />
                PAST BEST BY — still usable
              </div>
              {pastBestBy.map(i => <ItemCard key={i.id} item={i} onClick={() => onItemClick(i)} />)}
            </>
          )}
          {warning.length > 0 && (
            <>
              <div className="section-dot-row">
                <div className="dot" style={{ background: 'var(--yellow)' }} />
                WARNING — under 90 days
              </div>
              {warning.map(i => <ItemCard key={i.id} item={i} onClick={() => onItemClick(i)} />)}
            </>
          )}
        </>
      )}
    </div>
  )
}

// ─── Readiness Screen ─────────────────────────────────────────────────────────

function ReadinessScreen({
  household, items, onGoToStrategy, onGoToHousehold, onGoToSettings,
}: {
  household: Household
  items: Item[]
  onGoToStrategy: () => void
  onGoToHousehold: () => void
  onGoToSettings: () => void
}) {
  const hasHousehold = household.adults + household.kids + household.seniors > 0
  const scores = calcScores(household, items)

  // Non-linear scale matching evenly-spaced marks: 0,3,7,14,30,90 (5 segments = 20% each)
  const foodDaysVal = scores.foodDays ?? 0
  const covPct = (() => {
    const v = Math.min(foodDaysVal, 90)
    if (v <= 3)  return (v / 3) * 20
    if (v <= 7)  return 20 + ((v - 3) / 4) * 20
    if (v <= 14) return 40 + ((v - 7) / 7) * 20
    if (v <= 30) return 60 + ((v - 14) / 16) * 20
    return 80 + ((v - 30) / 60) * 20
  })()

  const cats = [
    { name: 'Water', score: scores.water, detail: scores.waterDetail },
    { name: 'Food', score: scores.food, detail: scores.foodDetail },
    { name: 'Power', score: scores.power, detail: scores.powerDetail },
    { name: 'Medical', score: scores.medical, detail: scores.medicalDetail },
  ]

  return (
    <div className="screen" style={{ display: 'block' }}>
      <div className="screen-header">
        <span className="screen-title">READY</span>
      </div>

      {!hasHousehold ? (
        <div className="empty-state">
          <div className="empty-title">set up household</div>
          <div className="empty-sub">Configure your household to see<br />your readiness score.</div>
          <button className="btn-primary" style={{ margin: '20px auto', display: 'block', width: 'auto', padding: '12px 24px' }} onClick={onGoToHousehold}>
            Set up household →
          </button>
        </div>
      ) : (
        <>
          <div className="score-hero">
            <div className="score-hero-lbl">Overall readiness score</div>
            <div className="score-big-row">
              <div className="score-big" style={{ color: scoreColor(scores.overall) }}>{scores.overall}</div>
              <div className="score-ctx">
                {scores.coverageDays > 0 ? `${scores.coverageDays.toFixed(0)}d coverage` : '—'}<br />
                {household.adults + household.kids + household.seniors} people
                {household.dogs + household.cats > 0 ? ' + pets' : ''}
              </div>
            </div>
            <div className="bar-wrap">
              <div className="bar-fill" style={{ width: `${scores.overall}%`, background: scoreColor(scores.overall) }} />
            </div>
            <div className="score-pills">
              {cats.map(c => (
                <button key={c.name} className="score-pill" style={{ color: scoreColor(c.score) }}>
                  {c.name}{'\n'}{c.score}
                </button>
              ))}
            </div>
          </div>

          <div className="section-label">Food Coverage Days</div>
          <div className="days-card">
            <div className="days-row">
              <div>
                <div className="days-big">{foodDaysVal > 0 ? Math.floor(foodDaysVal).toString() : '0'}</div>
                <div className="days-sub">days of food · TARGET · 30d</div>
              </div>
            </div>
            <div className="cov-track">
              <div className="cov-fill" style={{ width: `${covPct}%` }} />
            </div>
            <div className="cov-marks">
              {['0', '3d', '7d', '14d', '30d', '90d'].map(m => (
                <div key={m} className="cov-mark">{m}</div>
              ))}
            </div>
          </div>

          <div className="section-label">Category breakdown</div>
          <div className="cat-grid-dash">
            {cats.map(c => (
              <div key={c.name} className="cat-card-dash">
                <div className="ccd-name">{c.name}</div>
                <div className="ccd-score" style={{ color: scoreColor(c.score) }}>{c.score}</div>
                <div className="ccd-bar">
                  <div className="ccd-fill" style={{ width: `${c.score}%`, background: scoreColor(c.score) }} />
                </div>
                <div className="ccd-detail">{c.detail}</div>
              </div>
            ))}
          </div>

          <button className="btn-primary" onClick={onGoToStrategy}>See action plan →</button>
          <button className="btn-ghost" onClick={onGoToHousehold}>Update household →</button>
          <button className="btn-ghost" onClick={onGoToSettings}>Settings →</button>
        </>
      )}
    </div>
  )
}

// ─── Household Screen ─────────────────────────────────────────────────────────

function HouseholdScreen({ household, onChange }: { household: Household; onChange: (h: Household) => void }) {
  function sl(key: keyof Household) {
    return (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...household, [key]: Number(e.target.value) })
  }
  function tog(key: keyof Household) {
    return () => onChange({ ...household, [key]: !household[key] })
  }

  return (
    <div className="screen" style={{ display: 'block' }}>
      <div className="screen-header">
        <span className="screen-title">HOUSEHOLD</span>
      </div>
      <div className="section-label">People</div>
      <div className="card">
        {([
          ['adults', 'Adults', '2,000 cal/day', 0, 8],
          ['kids', 'Children', '1,400 cal/day', 0, 6],
          ['seniors', 'Seniors', '1,600 cal/day', 0, 4],
        ] as [keyof Household, string, string, number, number][]).map(([k, l, s, mn, mx]) => (
          <div key={k} className="sl-row">
            <div className="sl-lbl">{l}<span className="sl-sub">{s}</span></div>
            <input type="range" className="sl" min={mn} max={mx} value={household[k] as number} onChange={sl(k)} />
            <div className="slv">{household[k] as number}</div>
          </div>
        ))}
      </div>

      <div className="section-label">Pets</div>
      <div className="card">
        {([
          ['dogs', 'Dogs', '+1 gal/day each', 0, 4],
          ['cats', 'Cats', '+0.3 gal/day each', 0, 4],
        ] as [keyof Household, string, string, number, number][]).map(([k, l, s, mn, mx]) => (
          <div key={k} className="sl-row">
            <div className="sl-lbl">{l}<span className="sl-sub">{s}</span></div>
            <input type="range" className="sl" min={mn} max={mx} value={household[k] as number} onChange={sl(k)} />
            <div className="slv">{household[k] as number}</div>
          </div>
        ))}
      </div>

      <div className="section-label">Water — commercial storage</div>
      <div className="card">
        <div className="sl-row">
          <div className="sl-lbl">Bottled cases<span className="sl-sub">~6 gal / 24-pack · use as-is</span></div>
          <input type="range" className="sl" min={0} max={20} value={household.bottled} onChange={sl('bottled')} />
          <div className="slv">{household.bottled}</div>
        </div>
      </div>

      <div className="section-label">Water — personal storage</div>
      <div className="card">
        <div className="sl-row">
          <div className="sl-lbl">6-gal cans<span className="sl-sub">Walmart / Amazon · fill at home</span></div>
          <input type="range" className="sl" min={0} max={20} value={household.cans} onChange={sl('cans')} />
          <div className="slv">{household.cans}</div>
        </div>
        <div className="tog-row">
          <div className="tog-lbl">WaterBOB<span className="tog-sub">~100 gal · bathtub bag · ~$30</span></div>
          <button className={`tog${household.bob ? ' on' : ''}`} onClick={tog('bob')}><div className="tok" /></button>
        </div>
      </div>

      <div className="section-label">Water — treatment</div>
      <div className="card">
        {([
          ['tabs', 'Purification tabs', 'Aquatabs ~$8 · minimum treatment'],
          ['sawyer', 'Sawyer filter', '~$25 · tap / stream / can rotation'],
          ['lifestraw', 'Lifestraw', '~$20 · personal point-of-use filter'],
        ] as [keyof Household, string, string][]).map(([k, l, s]) => (
          <div key={k} className="tog-row">
            <div className="tog-lbl">{l}<span className="tog-sub">{s}</span></div>
            <button className={`tog${household[k] ? ' on' : ''}`} onClick={tog(k)}><div className="tok" /></button>
          </div>
        ))}
      </div>

      <div className="section-label">Water — mobile / bug-out</div>
      <div className="card">
        <div className="tog-row">
          <div className="tog-lbl">Jerrycan w/ filter<span className="tog-sub">~$299 · road filtration built in</span></div>
          <button className={`tog${household.jerry ? ' on' : ''}`} onClick={tog('jerry')}><div className="tok" /></button>
        </div>
      </div>

      <div className="section-label">Food supply</div>
      <div className="card">
        <div className="sl-row">
          <div className="sl-lbl">Stored cal/day<span className="sl-sub">Manual override · shelf auto-calculates</span></div>
          <input type="range" className="sl" min={0} max={6000} step={100} value={household.cal} onChange={sl('cal')} />
          <div className="slv">{household.cal > 0 ? `${(household.cal / 1000).toFixed(1)}k` : '0'}</div>
        </div>
        <div className="tog-row">
          <div className="tog-lbl">Vegetarian / vegan<span className="tog-sub">Adjusts protein scoring</span></div>
          <button className={`tog${household.veg ? ' on' : ''}`} onClick={tog('veg')}><div className="tok" /></button>
        </div>
        <div className="tog-row">
          <div className="tog-lbl">Infant in household<span className="tog-sub">Formula tracked separately</span></div>
          <button className={`tog${household.infant ? ' on' : ''}`} onClick={tog('infant')}><div className="tok" /></button>
        </div>
      </div>

      <div className="section-label">Power</div>
      <div style={{ padding: '0 16px 8px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t3)', lineHeight: 1.5 }}>
        Add generators, fuel, solar, and battery packs to your shelf for automatic detection.
      </div>
      <div className="card">
        <div className="sl-row">
          <div className="sl-lbl">Battery packs<span className="sl-sub">Manual override · shelf auto-detects</span></div>
          <input type="range" className="sl" min={0} max={5} value={household.batt} onChange={sl('batt')} />
          <div className="slv">{household.batt}</div>
        </div>
        <div className="tog-row">
          <div className="tog-lbl">Generator<span className="tog-sub">Manual override · shelf auto-detects</span></div>
          <button className={`tog${household.gen ? ' on' : ''}`} onClick={tog('gen')}><div className="tok" /></button>
        </div>
      </div>

      <div className="section-label">Medical</div>
      <div style={{ padding: '0 16px 8px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t3)', lineHeight: 1.5 }}>
        Add first aid kits, medications, and supplements to your shelf for automatic detection.
      </div>
      <div className="card">
        {([
          ['fak', 'First aid kit (stocked)', 'Manual override · shelf auto-detects'],
          ['rx', 'Prescriptions in household', 'Flags 30-day supply gap'],
          ['rxs', '30-day rx supply ready', 'All household members covered'],
          ['mob', 'Mobility limitations', 'Affects bug-out planning'],
        ] as [keyof Household, string, string][]).map(([k, l, s]) => (
          <div key={k} className="tog-row">
            <div className="tog-lbl">{l}<span className="tog-sub">{s}</span></div>
            <button className={`tog${household[k] ? ' on' : ''}`} onClick={tog(k)}><div className="tok" /></button>
          </div>
        ))}
      </div>

      <div style={{ height: 8 }} />
    </div>
  )
}

// ─── Strategy Screen ──────────────────────────────────────────────────────────

function StrategyScreen({
  household, items, onBack,
}: {
  household: Household
  items: Item[]
  onBack: () => void
}) {
  const scores = calcScores(household, items)
  const actions = buildStrategy(household, items)
  const urgent = actions.filter(a => a.priority === 'urgent')
  const high = actions.filter(a => a.priority === 'high')
  const med = actions.filter(a => a.priority === 'med')

  const potentialGain = Math.min(100 - scores.overall, actions.length * 8)

  return (
    <div className="screen" style={{ display: 'block' }}>
      <div className="screen-header">
        <span className="screen-title">STRATEGY</span>
        <button className="back-btn" onClick={onBack}>← Readiness</button>
      </div>

      <div className="strat-hero">
        <div className="strat-hero-row">
          <div>
            <div className="strat-score-lbl">Current score</div>
            <div className="strat-big" style={{ color: scoreColor(scores.overall) }}>{scores.overall}</div>
          </div>
          {potentialGain > 0 && (
            <div>
              <div className="strat-score-lbl">Potential gain</div>
              <div className="strat-big" style={{ color: 'var(--good)' }}>+{potentialGain}</div>
            </div>
          )}
        </div>
        <div className="bar-wrap">
          <div className="bar-fill" style={{ width: `${scores.overall}%`, background: scoreColor(scores.overall) }} />
        </div>
        <div className="strat-hint">Ranked by score impact. Reads directly from your shelf.</div>
      </div>

      {actions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-title">None — clear.</div>
          <div className="empty-sub">No actions needed based on your current setup.</div>
        </div>
      ) : (
        <>
          {urgent.length > 0 && (
            <>
              <div className="section-dot-row">
                <div className="dot" style={{ background: 'var(--red)' }} />
                Critical gaps
              </div>
              {urgent.map((a, i) => <StratItem key={i} action={a} rank={i + 1} />)}
            </>
          )}
          {high.length > 0 && (
            <>
              <div className="section-dot-row">
                <div className="dot" style={{ background: 'var(--orange)' }} />
                High impact
              </div>
              {high.map((a, i) => <StratItem key={i} action={a} rank={urgent.length + i + 1} />)}
            </>
          )}
          {med.length > 0 && (
            <>
              <div className="section-dot-row">
                <div className="dot" style={{ background: 'var(--yellow)' }} />
                Nice to have
              </div>
              {med.map((a, i) => <StratItem key={i} action={a} rank={urgent.length + high.length + i + 1} />)}
            </>
          )}
        </>
      )}
      <div style={{ height: 8 }} />
    </div>
  )
}

function StratItem({ action, rank }: { action: ReturnType<typeof buildStrategy>[0]; rank: number }) {
  const cls = `strat-item ${action.priority === 'urgent' ? 'urgent' : action.priority === 'high' ? 'high' : 'med'}`
  const rankColor = action.priority === 'urgent' ? 'var(--red)' : action.priority === 'high' ? 'var(--orange)' : 'var(--yellow)'
  return (
    <div className={cls}>
      <div className="strat-rank" style={{ color: rankColor }}>{rank}</div>
      <div className="strat-body">
        <div className="strat-title">{action.title}</div>
        <div className="strat-why">{action.why}</div>
        <div className="strat-tags">
          <span className="strat-tag" style={{ background: 'var(--accent)15', color: 'var(--accent)', border: '1px solid var(--accent)30' }}>{action.cost}</span>
          <span className="strat-tag" style={{ background: '#22c55e15', color: 'var(--good)', border: '1px solid #22c55e30' }}>{action.impact}</span>
          <span className="strat-tag" style={{ background: 'var(--bg)', color: 'var(--t3)', border: '1px solid var(--bdr)' }}>{action.category}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Settings Screen ──────────────────────────────────────────────────────────

function SettingsScreen({
  items, displayName, theme, accentColor, onThemeChange, onAccentChange, onDisplayNameChange, onClearAll, onImport,
}: {
  items: Item[]
  displayName: string
  theme: ThemePreference
  accentColor: string
  onThemeChange: (t: ThemePreference) => void
  onAccentChange: (option: AccentOption) => void
  onDisplayNameChange: (name: string) => void
  onClearAll: () => void
  onImport: (items: Item[]) => void
}) {
  const [storageSize, setStorageSize] = useState('—')
  const [lastBackup, setLastBackup] = useState(loadLastBackup())
  const [confirmClear, setConfirmClear] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setStorageSize(getStorageSize()) }, [items])

  function handleExport() {
    exportCSV(items)
    setLastBackup(new Date().toLocaleDateString())
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const parsed = parseCSV(text)
      const merged: Item[] = [...items]
      for (const p of parsed) {
        const idx = merged.findIndex(i => i.id === p.id)
        if (idx >= 0) merged[idx] = { ...merged[idx], ...p } as Item
        else merged.push({ ...p, id: newId(), priceHistory: [], consumeLog: [], created: new Date().toISOString() } as Item)
      }
      onImport(merged)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function doClear() {
    onClearAll()
    setConfirmClear(false)
  }

  return (
    <div className="screen" style={{ display: 'block' }}>
      <div className="screen-header">
        <span className="screen-title">SETTINGS</span>
      </div>

      <div className="section-label">Appearance</div>
      <div className="theme-grid">
        {([
          ['system', 'contrast', 'System'],
          ['dark', 'dark_mode', 'Dark'],
          ['light', 'light_mode', 'Light'],
        ] as [ThemePreference, string, string][]).map(([val, icon, label]) => (
          <button
            key={val}
            className={`theme-btn${theme === val ? ' selected' : ''}`}
            onClick={() => onThemeChange(val)}
          >
            <span className="material-icons theme-icon">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="section-label">Brand color</div>
      <div className="accent-grid">
        {ACCENT_OPTIONS.map(option => (
          <button
            key={option.value}
            className={`accent-swatch${accentColor === option.value ? ' selected' : ''}`}
            style={{ background: option.value }}
            onClick={() => onAccentChange(option)}
            aria-label={option.name}
          >
            {accentColor === option.value && (
              <span className="material-icons" style={{ fontSize: 18, color: '#fff' }}>check</span>
            )}
          </button>
        ))}
      </div>
      <div className="accent-label">
        {ACCENT_OPTIONS.find(o => o.value === accentColor)?.name ?? 'Signal Red'}
      </div>

      <div className="section-label">Account</div>
      <div className="card">
        <div className="detail-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
          <div className="dr-label">Display name</div>
          <input
            className="field-input"
            value={displayName}
            onChange={e => onDisplayNameChange(e.target.value)}
            placeholder="Your name"
            style={{ marginBottom: 0 }}
          />
        </div>
        <div className="set-row">
          <span className="set-label">Account type</span>
          <span className="badge badge-accent">FREE BETA</span>
        </div>
        <div className="set-row">
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t3)', lineHeight: 1.5 }}>
            Local account · no sign-in required
          </span>
        </div>
      </div>

      <div className="section-label">App</div>
      <div className="card">
        {[
          ['Version', '1.0.0 PWA'],
          ['Storage', storageSize],
          ['Items', items.length.toString()],
          ['Data model', 'localStorage'],
        ].map(([l, v]) => (
          <div key={l} className="set-row">
            <span className="set-label">{l}</span>
            <span className="set-val">{v}</span>
          </div>
        ))}
      </div>

      <div className="section-label">Data management</div>
      <div style={{ padding: '4px 20px 8px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t3)' }}>
        Last backup · {lastBackup || 'Never'} · Recommendation: Weekly or after restocking
      </div>
      <div className="backup-row">
        <button className="backup-btn backup-export" onClick={handleExport}><span className="material-icons" style={{fontSize:18,verticalAlign:'middle',marginRight:4}}>download</span>Export CSV</button>
        <button className="backup-btn backup-import" onClick={() => fileRef.current?.click()}><span className="material-icons" style={{fontSize:18,verticalAlign:'middle',marginRight:4}}>upload</span>Import CSV</button>
        <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImport} />
      </div>

      <div className="section-label" style={{ color: 'var(--red)' }}>Danger zone</div>
      {!confirmClear ? (
        <button className="btn-ghost" style={{ color: 'var(--red)', borderColor: '#ef444430', margin: '0 16px 8px' }} onClick={() => setConfirmClear(true)}>
          Clear all shelf data
        </button>
      ) : (
        <div className="warn-box crit" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--red)' }}>Permanently deletes all items. Cannot be undone.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ flex: 1, padding: '10px', background: 'var(--red)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600 }} onClick={doClear}>Delete all</button>
            <button style={{ flex: 1, padding: '10px', background: 'var(--bg)', border: '1px solid var(--bdr)', borderRadius: 6, color: 'var(--t2)', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 13 }} onClick={() => setConfirmClear(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="section-label">About</div>
      <div className="card">
        {[
          ['Product', 'GravPack'],
          ['Built for', 'First responders · families'],
          ['Privacy', '100% local · no tracking'],
          ['Coming in V2', 'Barcode scan · push alerts'],
        ].map(([l, v]) => (
          <div key={l} className="set-row">
            <span className="set-label">{l}</span>
            <span className="set-val">{v}</span>
          </div>
        ))}
      </div>

      <div style={{ height: 8 }} />
    </div>
  )
}

// ─── Add / Edit Item Modal ────────────────────────────────────────────────────

interface AddItemForm {
  name: string
  category: Category
  qty: string
  unit: string
  price: string
  calories: string
  expiry: string
  expiryType: 'expires' | 'best-by' | 'none'
  location: string
  notes: string
}

const BLANK_FORM: AddItemForm = {
  name: '', category: 'Food', qty: '', unit: 'units',
  price: '', calories: '', expiry: '', expiryType: 'none', location: '', notes: '',
}

// ─── Barcode / date helpers ───────────────────────────────────────────────────

const EXPIRY_PRESETS: Record<string, { label: string; months: number }[]> = {
  Food:    [{ label: '+3mo', months: 3 },  { label: '+1yr', months: 12 }, { label: '+2yr', months: 24 }, { label: '+3yr', months: 36 }],
  Water:   [{ label: '+1yr', months: 12 }, { label: '+2yr', months: 24 }, { label: '+5yr', months: 60 }],
  Medical: [{ label: '+3mo', months: 3 },  { label: '+6mo', months: 6 },  { label: '+1yr', months: 12 }, { label: '+2yr', months: 24 }],
  Power:   [{ label: '+1yr', months: 12 }, { label: '+2yr', months: 24 }, { label: '+5yr', months: 60 }],
  Tools:   [{ label: '+1yr', months: 12 }, { label: '+2yr', months: 24 }, { label: '+5yr', months: 60 }],
  Docs:    [{ label: '+1yr', months: 12 }, { label: '+5yr', months: 60 }, { label: '+10yr', months: 120 }],
}

function addMonths(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

function mapOFFCategory(tags: string[]): Category {
  const t = tags.join(' ').toLowerCase()
  if (/water|eau|agua/.test(t)) return 'Water'
  if (/medication|drug|medicine|supplement|vitamin|pharmacy/.test(t)) return 'Medical'
  return 'Food'
}

// ─── Barcode Scanner ──────────────────────────────────────────────────────────

function parseOFFPackaging(packaging: string | undefined, packagingTags: string[] | undefined): string {
  const combined = [packaging || '', ...(packagingTags || [])].join(' ').toLowerCase()
  if (!combined.trim()) return ''
  if (/\bcan(s)?\b/.test(combined))    return 'cans'
  if (/\bjar(s)?\b/.test(combined))    return 'jars'
  if (/\bpouch(es)?|sachet/.test(combined)) return 'pouches'
  if (/\bcarton(s)?|tetra/.test(combined))  return 'cartons'
  if (/\bbox(es)?\b/.test(combined))   return 'boxes'
  if (/\bbag(s)?\b/.test(combined))    return 'bags'
  if (/\bbottle(s)?\b/.test(combined)) return 'bottles'
  if (/\bpack(s|age)?\b/.test(combined)) return 'packs'
  if (/\btab(let)?s?\b/.test(combined)) return 'tabs'
  return ''
}

function parseOFFQuantity(raw: string | undefined): { qty: string; unit: string } {
  if (!raw) return { qty: '', unit: '' }
  const m = raw.trim().match(/^([\d.]+)\s*([a-zA-Z]+)/)
  if (!m) return { qty: '', unit: '' }
  const num = m[1]
  const rawUnit = m[2].toLowerCase()
  const unitMap: Record<string, string> = {
    g: 'oz', kg: 'lbs', ml: 'oz', l: 'gal', lbs: 'lbs', oz: 'oz',
    fl: 'oz', lb: 'lbs',
  }
  return { qty: num, unit: unitMap[rawUnit] || 'units' }
}

function BarcodeScanner({ onScan, onClose }: {
  onScan: (name: string, category: Category, qty: string, unit: string, brand: string, calories: string) => void
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const doneRef = useRef(false)
  const [status, setStatus] = useState<'scanning' | 'fetching' | 'error'>('scanning')
  const [errorMsg, setErrorMsg] = useState('')
  const [scannedCode, setScannedCode] = useState('')

  function stopScanner() {
    try { controlsRef.current?.stop() } catch { /* ignore */ }
  }

  function startScanner() {
    doneRef.current = false
    const reader = new BrowserMultiFormatReader()
    reader.decodeFromConstraints(
      { video: { facingMode: { ideal: 'environment' } } },
      videoRef.current!,
      async (result, _err) => {
        if (!result || doneRef.current) return
        doneRef.current = true
        stopScanner()
        const code = result.getText()
        setScannedCode(code)
        setStatus('fetching')
        await lookup(code)
      }
    ).then(controls => {
      controlsRef.current = controls
    }).catch(() => {
      setErrorMsg('Camera access denied or unavailable')
      setStatus('error')
    })
  }

  useEffect(() => {
    startScanner()
    return stopScanner
  }, [])

  async function lookup(barcode: string) {
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
      const data = await res.json()
      if (data.status === 1 && data.product) {
        const p = data.product
        const name = p.product_name_en || p.product_name || ''
        const category = mapOFFCategory(p.categories_tags || [])
        const { qty, unit: weightUnit } = parseOFFQuantity(p.quantity)
        const packagingUnit = parseOFFPackaging(p.packaging, p.packaging_tags)
        const unit = packagingUnit || weightUnit
        const brand = p.brands ? p.brands.split(',')[0].trim() : ''
        const n = p.nutriments
        let calories = ''
        if (n) {
          const kcalPer100g = n['energy-kcal_100g'] ?? n['energy-kcal'] ?? null
          const grams = p.quantity ? parseFloat(p.quantity) : null
          if (kcalPer100g != null && grams != null && grams > 0) {
            calories = Math.round(kcalPer100g * grams / 100).toString()
          } else if (kcalPer100g != null) {
            calories = Math.round(kcalPer100g).toString()
          }
        }
        onScan(name ? toTitleCase(name) : '', category, qty, unit, brand, calories)
      } else {
        setErrorMsg('Product not found — enter name manually')
        setStatus('error')
      }
    } catch {
      setErrorMsg('Could not reach product database')
      setStatus('error')
    }
  }

  return (
    <div className="scanner-overlay">
      <video ref={videoRef} className="scanner-video" playsInline muted autoPlay />

      {status === 'scanning' && (
        <>
          <div className="scanner-frame" />
          <div className="scanner-label">Align barcode inside the frame</div>
        </>
      )}

      {status === 'fetching' && (
        <div className="scanner-lookup-card">
          <div className="scanner-spinner" />
          <div className="scanner-lookup-title">Barcode found</div>
          <div className="scanner-lookup-code">{scannedCode}</div>
          <div className="scanner-lookup-sub">Looking up product…</div>
        </div>
      )}

      {status === 'error' && (
        <div className="scanner-lookup-card scanner-error-card">
          <div className="scanner-error-icon">✕</div>
          <div className="scanner-lookup-title">{errorMsg}</div>
          <button className="scanner-retry-btn" onClick={() => {
            setScannedCode('')
            setStatus('scanning')
            startScanner()
          }}>Try again</button>
        </div>
      )}

      <button className="scanner-close" onClick={() => { stopScanner(); onClose() }}>✕ Cancel</button>
    </div>
  )
}

function AddItemModal({
  initial, onSave, onClose,
}: {
  initial?: Item | null
  onSave: (item: Omit<Item, 'id' | 'created' | 'consumeLog' | 'priceHistory' | 'depleted'> & { id?: string; priceHistory?: Item['priceHistory'] }) => void
  onClose: () => void
}) {
  const [step, setStep] = useState(0)
  const [showScanner, setShowScanner] = useState(false)
  const [form, setForm] = useState<AddItemForm>(() => initial ? {
    name: initial.name,
    category: initial.category,
    qty: initial.qty.toString(),
    unit: initial.unit,
    price: initial.price?.toString() || '',
    calories: initial.calories?.toString() || '',
    expiry: initial.expiry || '',
    expiryType: initial.expiry ? (initial.expiryType === 'best-by' ? 'best-by' : 'expires') : 'none',
    location: initial.location,
    notes: initial.notes,
  } : BLANK_FORM)

  function set(k: keyof AddItemForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  function next() {
    if (step === 0 && !form.name.trim()) return
    if (step < 2) setStep(s => s + 1)
    else submit()
  }

  function submit() {
    const price = form.price ? parseFloat(form.price) : null
    const priceHistory: Item['priceHistory'] = initial?.priceHistory ? [...initial.priceHistory] : []
    if (price !== null) {
      const last = priceHistory[priceHistory.length - 1]
      if (!last || last.price !== price) {
        priceHistory.push({ price, date: new Date().toISOString().slice(0, 10) })
      }
    }
    onSave({
      ...(initial ? { id: initial.id, priceHistory } : {}),
      name: form.name.trim(),
      category: form.category,
      qty: parseFloat(form.qty) || 0,
      unit: form.unit,
      price,
      calories: form.calories ? parseFloat(form.calories) : null,
      expiry: form.expiryType !== 'none' ? (form.expiry || null) : null,
      expiryType: form.expiryType !== 'none' ? (form.expiryType === 'best-by' ? 'best-by' : 'expires') : undefined,
      location: form.location,
      notes: form.notes,
    })
  }

  const stepLabels = ['Name & Category', 'Quantity & Price', 'Location & Notes']

  return (
    <>
    {showScanner && (
      <BarcodeScanner
        onScan={(name, category, qty, unit, brand, calories) => {
          setForm(f => ({
            ...f,
            name,
            category,
            ...(qty ? { qty } : {}),
            ...(unit ? { unit } : {}),
            ...(brand ? { notes: brand } : {}),
            ...(calories ? { calories } : {}),
          }))
          setShowScanner(false)
        }}
        onClose={() => setShowScanner(false)}
      />
    )}
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">{initial ? 'Edit Item' : 'Add Item'}</div>
        <div className="modal-sub">{stepLabels[step]}</div>

        <div className="steps-bar">
          {[0, 1, 2].map(i => (
            <div key={i} className={`step${i < step ? ' done' : i === step ? ' active' : ''}`} />
          ))}
        </div>

        {step === 0 && (
          <>
            <button className="scan-btn" onClick={() => setShowScanner(true)}>
              <span className="material-icons" style={{ fontSize: 20, verticalAlign: 'middle' }}>qr_code_scanner</span> Scan barcode
            </button>
            <div className="field-group">
              <div className="field-label">Item name</div>
              <input
                className="field-input"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: toTitleCase(e.target.value) }))}
                placeholder="e.g. Canned Tuna"
              />
            </div>
            <div className="field-group">
              <div className="field-label">Category</div>
            </div>
            <div className="cat-grid-form">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  className={`cat-btn-form${form.category === c ? ' selected' : ''}`}
                  onClick={() => setForm(f => ({ ...f, category: c }))}
                >
                  <span className="material-icons" style={{ fontSize: 20, verticalAlign: 'middle' }}>{CAT_EMOJI[c]}</span> {c}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="field-group">
              <div className="field-label">Quantity</div>
              <div className="field-row">
                <input className="field-input" type="number" min={0} value={form.qty} onChange={set('qty')} placeholder="0" />
                <select className="field-input" value={form.unit} onChange={set('unit')}>
                  {UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="field-group">
              <div className="field-label">Price per unit (optional)</div>
              <input className="field-input" type="number" min={0} step={0.01} value={form.price} onChange={set('price')} placeholder="0.00" />
            </div>
            <div className="field-group">
              <div className="field-label">Calories per unit (optional)</div>
              <input className="field-input" type="number" min={0} value={form.calories} onChange={set('calories')} placeholder="e.g. 350" />
            </div>
            <div className="field-group">
              <div className="field-label">Date type</div>
            </div>
            <div className="date-type-grid">
              <button
                className={`date-type-btn${form.expiryType === 'expires' ? ' selected' : ''}`}
                onClick={() => setForm(f => ({ ...f, expiryType: 'expires' }))}
              >
                <span className="material-icons dt-icon">warning</span>
                <span>Expires</span>
                <span className="dt-label">Hard date</span>
              </button>
              <button
                className={`date-type-btn${form.expiryType === 'best-by' ? ' selected' : ''}`}
                onClick={() => setForm(f => ({ ...f, expiryType: 'best-by' }))}
              >
                <span className="material-icons dt-icon">calendar_today</span>
                <span>Best By</span>
                <span className="dt-label">Quality</span>
              </button>
              <button
                className={`date-type-btn${form.expiryType === 'none' ? ' selected' : ''}`}
                onClick={() => setForm(f => ({ ...f, expiryType: 'none', expiry: '' }))}
              >
                <span className="material-icons dt-icon">all_inclusive</span>
                <span>No Date</span>
                <span className="dt-label">Long life</span>
              </button>
            </div>
            {form.expiryType !== 'none' && (
              <div className="field-group">
                <div className="field-label">{form.expiryType === 'best-by' ? 'Best by date' : 'Expiration date'}</div>
                <div className="expiry-presets">
                  {(EXPIRY_PRESETS[form.category] || EXPIRY_PRESETS['Food']).map(p => (
                    <button
                      key={p.label}
                      className={`expiry-preset${form.expiry === addMonths(p.months) ? ' selected' : ''}`}
                      onClick={() => setForm(f => ({ ...f, expiry: addMonths(p.months) }))}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <input className="field-input" type="date" value={form.expiry} onChange={set('expiry')} />
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <div className="field-group">
              <div className="field-label">Location</div>
              <select className="field-input" value={form.location} onChange={set('location')}>
                <option value="">Choose location</option>
                {LOCATIONS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div className="field-group">
              <div className="field-label">Notes (optional)</div>
              <textarea className="field-input" value={form.notes} onChange={set('notes')} placeholder="Any notes..." rows={3} style={{ resize: 'none' }} />
            </div>
            <div className="section-label" style={{ padding: '0 16px 8px' }}>Review</div>
            <div className="detail-rows" style={{ margin: '0 16px 12px' }}>
              {[
                ['Name', form.name],
                ['Category', form.category],
                ['Qty', `${form.qty} ${form.unit}`],
                ['Price', form.price ? `$${form.price}` : '—'],
                ...(form.calories ? [
                  ['Cal / unit', `${Number(form.calories).toLocaleString()} kcal`],
                  ['Total calories', `${(parseFloat(form.calories) * (parseFloat(form.qty) || 1)).toLocaleString()} kcal`],
                ] : []),
                ['Date type', form.expiryType === 'best-by' ? 'Best by' : form.expiryType === 'expires' ? 'Expires' : 'No date'],
                ...(form.expiryType !== 'none' && form.expiry ? [[form.expiryType === 'best-by' ? 'Best by' : 'Expiry', form.expiry]] : []),
                ['Location', form.location || '—'],
              ].map(([l, v]) => (
                <div key={l} className="detail-row">
                  <span className="dr-label">{l}</span>
                  <span className="dr-val">{v}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <button className="btn-primary" onClick={next} disabled={step === 0 && !form.name.trim()}>
          {step < 2 ? 'Next →' : initial ? 'Save changes' : 'Add to shelf'}
        </button>
        {step > 0 && (
          <button className="btn-ghost" onClick={() => setStep(s => s - 1)}>← Back</button>
        )}
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </div>
    </>
  )
}

// ─── Consume Modal ────────────────────────────────────────────────────────────

function ConsumeModal({
  item, onConfirm, onClose,
}: {
  item: Item
  onConfirm: (qty: number, note: string) => void
  onClose: () => void
}) {
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="consume-sheet" onClick={e => e.stopPropagation()}>
        <div className="consume-handle" />
        <div className="consume-title">USE ITEM</div>
        <div className="consume-item-name">{item.name} · {item.qty} {item.unit} available</div>
        <div className="consume-qty-row">
          <div className="consume-stepper">
            <button className="consume-step-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
            <div className="consume-step-val">{qty}</div>
            <button className="consume-step-btn" onClick={() => setQty(q => Math.min(item.qty, q + 1))}>+</button>
          </div>
          <div className="consume-of">of {item.qty} {item.unit}</div>
        </div>
        <div className="consume-note">
          <input
            className="field-input"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. dinner, camping trip..."
          />
        </div>
        <button className="btn-primary" onClick={() => onConfirm(qty, note)}>
          {qty >= item.qty ? 'Use all — mark depleted' : 'Confirm use'}
        </button>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </div>
  )
}

// ─── Item Detail Modal ────────────────────────────────────────────────────────

function ItemDetailModal({
  item, onClose, onEdit, onConsume, onDelete, onRestock, onAdd,
}: {
  item: Item
  onClose: () => void
  onEdit: () => void
  onConsume: () => void
  onDelete: () => void
  onRestock: () => void
  onAdd: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const status = getExpiryStatus(item.expiry, item.expiryType)
  const dateLabel = item.expiryType === 'best-by' ? 'Best by' : 'Expiration'

  let consumeRate = ''
  if (item.consumeLog.length >= 2) {
    const sorted = [...item.consumeLog].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const totalQty = sorted.reduce((s, e) => s + e.qty, 0)
    const days = (new Date(sorted[sorted.length - 1].date).getTime() - new Date(sorted[0].date).getTime()) / 86400000
    if (days > 0) {
      const rate = totalQty / days
      const remaining = item.qty / rate
      consumeRate = `${rate.toFixed(2)} ${item.unit}/day · ~${remaining.toFixed(0)}d remaining`
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 16px 0', position: 'relative' }}>
          <button className="overflow-btn" onClick={() => setMenuOpen(o => !o)}>
            <span className="material-icons" style={{ fontSize: 22 }}>more_vert</span>
            {menuOpen && (
              <div className="overflow-menu" style={{ left: 0, right: 'auto' }} onClick={e => e.stopPropagation()}>
                <div className="overflow-menu-item" onClick={() => { onEdit(); setMenuOpen(false) }}><span className="material-icons" style={{fontSize:18,verticalAlign:'middle',marginRight:6}}>edit</span>Edit item</div>
                {!item.depleted && (
                  <div className="overflow-menu-item" onClick={() => { onConsume(); setMenuOpen(false) }}><span className="material-icons" style={{fontSize:18,verticalAlign:'middle',marginRight:6}}>remove_circle_outline</span>Use item</div>
                )}
                {item.depleted && (
                  <div className="overflow-menu-item" onClick={() => { onRestock(); setMenuOpen(false) }}><span className="material-icons" style={{fontSize:18,verticalAlign:'middle',marginRight:6}}>refresh</span>Restock</div>
                )}
                <div className="overflow-menu-item danger" onClick={() => { onDelete(); setMenuOpen(false) }}><span className="material-icons" style={{fontSize:18,verticalAlign:'middle',marginRight:6}}>delete_outline</span>Delete</div>
              </div>
            )}
          </button>
          <div className="modal-handle" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 8 }} />
          <button className="overflow-btn" onClick={onClose}>
            <span className="material-icons" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>

        <div className="detail-hero">
          <div className="detail-cat">
            <span className="material-icons" style={{ fontSize: 30 }}>{CAT_EMOJI[item.category]}</span>
            <span>{item.category}</span>
          </div>
          <div className="detail-name">{item.name}</div>
          <div className="detail-qty">{item.qty} {item.unit}{item.location ? ` · ${item.location}` : ''}</div>
        </div>

        <div className={`expiry-hero ${item.depleted ? 'noexp' : status}`}>
          <div>
            <div className="expiry-date-label">{dateLabel}</div>
            <div className={`expiry-date-val ${item.depleted ? 'noexp' : status}`}>
              {item.depleted ? 'DEPLETED' : item.expiry ? formatDate(item.expiry) : 'No expiry date'}
            </div>
          </div>
          <ExpiryBadge expiry={item.expiry} depleted={item.depleted} expiryType={item.expiryType} />
        </div>

        {item.calories && (
          <div className="calorie-hero">
            <div className="calorie-hero-block">
              <div className="calorie-hero-val">{(item.calories * item.qty).toLocaleString()}</div>
              <div className="calorie-hero-lbl">total kcal</div>
            </div>
            <div className="calorie-hero-divider" />
            <div className="calorie-hero-block">
              <div className="calorie-hero-val">{item.calories.toLocaleString()}</div>
              <div className="calorie-hero-lbl">kcal / {item.unit.replace(/s$/, '')}</div>
            </div>
            <div className="calorie-hero-divider" />
            <div className="calorie-hero-block">
              <div className="calorie-hero-val">{item.qty}</div>
              <div className="calorie-hero-lbl">{item.unit}</div>
            </div>
          </div>
        )}

        <div className="detail-rows">
          {[
            ['Location', item.location || '—'],
            ['Quantity', `${item.qty} ${item.unit}`],
            ['Price / unit', item.price ? `$${item.price.toFixed(2)}` : '—'],
            ['Total value', item.price && item.qty ? `$${(item.price * item.qty).toFixed(2)}` : '—'],
            ...(item.calories ? [
              ['Cal / unit', `${item.calories.toLocaleString()} kcal`],
              ['Total calories', `${(item.calories * item.qty).toLocaleString()} kcal`],
            ] : []),
            ['Category', item.category],
            ['Added', formatDate(item.created)],
            ...(item.notes ? [['Notes', item.notes]] : []),
          ].map(([l, v]) => (
            <div key={l} className="detail-row">
              <span className="dr-label">{l}</span>
              <span className="dr-val">{v}</span>
            </div>
          ))}
        </div>

        {!item.depleted && (
          <div className="action-row">
            <button className="action-btn" onClick={onAdd}>Add item</button>
            <button className="action-btn" style={{ background: '#22c55e15', borderColor: '#22c55e30', color: 'var(--good)' }} onClick={onConsume}>Use item</button>
          </div>
        )}

        {item.depleted && (
          <button className="btn-primary" onClick={onRestock}>Restock item</button>
        )}

        {item.priceHistory.length >= 2 && (
          <div className="price-history">
            <div className="price-history-head">
              <span className="price-history-title">Price history</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t3)' }}>{item.priceHistory.length} records</span>
            </div>
            {item.priceHistory.map((r, i) => {
              const prev = item.priceHistory[i - 1]
              const delta = prev ? ((r.price - prev.price) / prev.price * 100) : 0
              const cls = i === 0 ? 'price-same' : delta > 0 ? 'price-up' : delta < 0 ? 'price-down' : 'price-same'
              return (
                <div key={i} className="price-row">
                  <span className="price-row-date">{formatDate(r.date)}</span>
                  <span className="price-row-val">${r.price.toFixed(2)}</span>
                  <span className={`price-row-delta ${cls}`}>{i === 0 ? 'base' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`}</span>
                </div>
              )
            })}
          </div>
        )}

        {item.consumeLog.length > 0 && (
          <div className="consume-log">
            <div className="consume-log-head">
              <span className="consume-log-title">Consumption log</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t3)' }}>{item.consumeLog.length} entries</span>
            </div>
            {item.consumeLog.slice(-5).reverse().map((e, i) => (
              <div key={i} className="consume-log-row">
                <div>
                  <div className="consume-log-date">{formatDate(e.date)}</div>
                  {e.note && <div className="consume-log-note">{e.note}</div>}
                </div>
                <div className="consume-log-amt">−{e.qty} {e.unit}</div>
              </div>
            ))}
            {consumeRate && <div className="consume-rate">{consumeRate}</div>}
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Restock Modal ────────────────────────────────────────────────────────────

function RestockModal({
  item, onSave, onClose,
}: {
  item: Item
  onSave: (qty: number, price: number | null) => void
  onClose: () => void
}) {
  const [qty, setQty] = useState(item.qty.toString())
  const [price, setPrice] = useState(item.price?.toString() || '')

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="consume-sheet" onClick={e => e.stopPropagation()}>
        <div className="consume-handle" />
        <div className="consume-title">RESTOCK</div>
        <div className="consume-item-name">{item.name}</div>
        <div className="field-group">
          <div className="field-label">New quantity</div>
          <div className="field-row">
            <input className="field-input" type="number" min={0} value={qty} onChange={e => setQty(e.target.value)} />
            <div className="field-input" style={{ display: 'flex', alignItems: 'center', color: 'var(--t3)' }}>{item.unit}</div>
          </div>
        </div>
        <div className="field-group">
          <div className="field-label">New price (optional)</div>
          <input className="field-input" type="number" min={0} step={0.01} value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
        </div>
        <button className="btn-primary" onClick={() => onSave(parseFloat(qty) || 0, price ? parseFloat(price) : null)}>
          Confirm restock
        </button>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

function GravPackApp() {
  const [screen, setScreen] = useState<Screen>('shelf')
  const [items, setItemsState] = useState<Item[]>(loadItems)
  const [household, setHouseholdState] = useState<Household>(loadHousehold)
  const [displayName, setDisplayNameState] = useState(loadDisplayName)
  const [theme, setThemeState] = useState<ThemePreference>(loadTheme)
  const [accentColor, setAccentColorState] = useState<string>(loadAccentColor)

  useEffect(() => { applyTheme(theme) }, [theme])

  useEffect(() => {
    const option = ACCENT_OPTIONS.find(o => o.value === accentColor) ?? ACCENT_OPTIONS[0]
    applyAccentColor(option.value, option.dark)
  }, [accentColor])

  const [addModal, setAddModal] = useState<{ open: boolean; edit?: Item | null }>({ open: false })
  const [detailItem, setDetailItem] = useState<Item | null>(null)
  const [showValueBreakdown, setShowValueBreakdown] = useState(false)
  const [showRestockBreakdown, setShowRestockBreakdown] = useState(false)
  const [showItemsBreakdown, setShowItemsBreakdown] = useState(false)
  const [showLocalInfo, setShowLocalInfo] = useState(false)
  const [consumeItem, setConsumeItem] = useState<Item | null>(null)
  const [restockItem, setRestockItem] = useState<Item | null>(null)

  const setItems = useCallback((items: Item[]) => {
    setItemsState(items)
    saveItems(items)
  }, [])

  const setHousehold = useCallback((h: Household) => {
    setHouseholdState(h)
    saveHousehold(h)
  }, [])

  const setTheme = useCallback((t: ThemePreference) => {
    setThemeState(t)
    saveTheme(t)
    applyTheme(t)
  }, [])

  const setAccentColor = useCallback((option: AccentOption) => {
    setAccentColorState(option.value)
    saveAccentColor(option.value, option.dark)
    applyAccentColor(option.value, option.dark)
  }, [])

  const setDisplayName = useCallback((name: string) => {
    setDisplayNameState(name)
    saveDisplayName(name)
  }, [])

  function handleSaveItem(data: Parameters<React.ComponentProps<typeof AddItemModal>['onSave']>[0]) {
    if (data.id) {
      setItems(items.map(i => i.id === data.id ? {
        ...i,
        name: data.name, category: data.category, qty: data.qty, unit: data.unit,
        price: data.price, calories: data.calories, expiry: data.expiry, expiryType: data.expiryType,
        location: data.location, notes: data.notes,
        priceHistory: data.priceHistory ?? i.priceHistory,
      } : i))
    } else {
      const priceHistory: Item['priceHistory'] = data.price !== null
        ? [{ price: data.price!, date: new Date().toISOString().slice(0, 10) }]
        : []
      const item: Item = {
        id: newId(), created: new Date().toISOString(),
        consumeLog: [], depleted: false, priceHistory,
        ...data, price: data.price, expiry: data.expiry,
      }
      setItems([...items, item])
    }
    setAddModal({ open: false })
    setDetailItem(null)
  }

  function handleConsume(qty: number, note: string) {
    if (!consumeItem) return
    const depleted = qty >= consumeItem.qty
    setItems(items.map(i => i.id === consumeItem.id ? {
      ...i,
      qty: depleted ? 0 : i.qty - qty,
      depleted,
      consumeLog: [...i.consumeLog, { qty, unit: i.unit, date: new Date().toISOString(), note }],
    } : i))
    setConsumeItem(null)
    setDetailItem(null)
  }

  function handleRestock(qty: number, price: number | null) {
    if (!restockItem) return
    const priceHistory = price !== null
      ? [...restockItem.priceHistory, { price, date: new Date().toISOString().slice(0, 10) }]
      : restockItem.priceHistory
    setItems(items.map(i => i.id === restockItem.id ? {
      ...i, qty, price: price ?? i.price, depleted: false, priceHistory,
    } : i))
    setRestockItem(null)
    setDetailItem(null)
  }

  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleDelete(item: Item) {
    setDeletingId(item.id)
    setDetailItem(null)
    setTimeout(() => {
      setItems(items.filter(i => i.id !== item.id))
      setDeletingId(null)
    }, 520)
  }

  const tabs: { id: Screen; label: string; icon: React.ReactNode }[] = [
    { id: 'shelf', label: 'Shelf', icon: <ShelfIcon /> },
    { id: 'expiring', label: 'Expiring', icon: <ExpiringIcon /> },
    { id: 'readiness', label: 'Ready', icon: <ReadyIcon /> },
    { id: 'household', label: 'Household', icon: <HouseIcon /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
  ]

  const [showInstallBanner, setShowInstallBanner] = useState(() => {
    try {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone
      return !isStandalone
    } catch { return false }
  })

  const dismissInstallBanner = useCallback(() => {
    setShowInstallBanner(false)
  }, [])

  const hasModal = addModal.open || detailItem !== null || consumeItem !== null || restockItem !== null

  return (
    <div className="gp-app">
      <div className="status-bar" style={{ justifyContent: 'center' }}>
        <img src="/GravPack-app-logo-white.png" alt="GravPack" style={{ height: 40 }} />
      </div>

      <div className="screen-wrap">
        {screen === 'shelf' && (
          <ShelfScreen
            items={items}
            household={household}
            onItemClick={item => setDetailItem(item)}
            onRestock={item => setRestockItem(item)}
            deletingId={deletingId}
            onShowValueBreakdown={() => setShowValueBreakdown(true)}
            onShowRestockBreakdown={() => setShowRestockBreakdown(true)}
            onShowItemsBreakdown={() => setShowItemsBreakdown(true)}
            onGoToExpiring={() => setScreen('expiring')}
            onShowLocalInfo={() => setShowLocalInfo(true)}
          />
        )}
        {screen === 'expiring' && (
          <ExpiringScreen items={items} onItemClick={item => setDetailItem(item)} />
        )}
        {screen === 'readiness' && (
          <ReadinessScreen
            household={household}
            items={items}
            onGoToStrategy={() => setScreen('strategy')}
            onGoToHousehold={() => setScreen('household')}
            onGoToSettings={() => setScreen('settings')}
          />
        )}
        {screen === 'strategy' && (
          <StrategyScreen household={household} items={items} onBack={() => setScreen('readiness')} />
        )}
        {screen === 'household' && (
          <HouseholdScreen household={household} onChange={setHousehold} />
        )}
        {screen === 'settings' && (
          <SettingsScreen
            items={items}
            displayName={displayName}
            theme={theme}
            accentColor={accentColor}
            onThemeChange={setTheme}
            onAccentChange={setAccentColor}
            onDisplayNameChange={setDisplayName}
            onClearAll={() => setItems([])}
            onImport={setItems}
          />
        )}

        {hasModal && (
          <>
            {addModal.open && (
              <AddItemModal
                initial={addModal.edit}
                onSave={handleSaveItem}
                onClose={() => setAddModal({ open: false })}
              />
            )}
            {detailItem && !consumeItem && !restockItem && !addModal.open && (
              <ItemDetailModal
                item={detailItem}
                onClose={() => setDetailItem(null)}
                onEdit={() => setAddModal({ open: true, edit: detailItem })}
                onConsume={() => setConsumeItem(detailItem)}
                onDelete={() => handleDelete(detailItem)}
                onRestock={() => setRestockItem(detailItem)}
                onAdd={() => { setDetailItem(null); setAddModal({ open: true }) }}
              />
            )}
            {consumeItem && (
              <ConsumeModal item={consumeItem} onConfirm={handleConsume} onClose={() => setConsumeItem(null)} />
            )}
            {restockItem && (
              <RestockModal item={restockItem} onSave={handleRestock} onClose={() => setRestockItem(null)} />
            )}
          </>
        )}
      </div>

      {showInstallBanner && !hasModal && (
        <InstallBanner onDismiss={dismissInstallBanner} />
      )}

      <div className="tab-bar">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`tab${(screen === t.id || (screen === 'strategy' && t.id === 'readiness')) ? ' on' : ''}`}
            onClick={() => setScreen(t.id)}
          >
            <div className="tab-icon" style={{
              color: (screen === t.id || (screen === 'strategy' && t.id === 'readiness')) ? 'var(--accent)' : 'var(--t3)'
            }}>
              {t.icon}
            </div>
            <div className="tab-label">{t.label}</div>
          </button>
        ))}
      </div>

      {screen === 'shelf' && !hasModal && (
        <button className="fab" onClick={() => setAddModal({ open: true })} aria-label="Add item">
          <span className="material-icons" style={{ fontSize: 30, color: '#0d1117' }}>add</span>
        </button>
      )}

      {showValueBreakdown && (
        <ValueBreakdownModal items={items} onClose={() => setShowValueBreakdown(false)} />
      )}
      {showRestockBreakdown && (
        <RestockBreakdownModal items={items} onClose={() => setShowRestockBreakdown(false)} onItemClick={item => { setDetailItem(item); setShowRestockBreakdown(false) }} />
      )}
      {showItemsBreakdown && (
        <ItemsBreakdownModal items={items} onClose={() => setShowItemsBreakdown(false)} />
      )}
      {showLocalInfo && (
        <div className="modal-overlay" onClick={() => setShowLocalInfo(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px 0' }}>
              <div className="modal-handle" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 20 }} />
              <button className="overflow-btn" onClick={() => setShowLocalInfo(false)}>
                <span className="material-icons" style={{ fontSize: 22 }}>close</span>
              </button>
            </div>
            <div className="detail-hero" style={{ paddingBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span className="material-icons" style={{ fontSize: 28, color: 'var(--good)' }}>lock</span>
                <div className="detail-name" style={{ fontSize: 24 }}>Your data stays on your device</div>
              </div>
              <div className="detail-qty">GravPack never sends your inventory to a server.</div>
            </div>
            <div style={{ padding: '4px 20px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { icon: 'storage', title: 'Stored locally', body: "Everything lives in your browser's local storage — no account, no cloud, no syncing." },
                { icon: 'wifi_off', title: 'Works offline', body: 'Add items, check expiry dates, and view your readiness score with no internet connection.' },
                { icon: 'visibility_off', title: 'Completely private', body: 'No one can see what you have stocked. Your preparedness data is yours alone.' },
                { icon: 'download', title: 'Back up anytime', body: 'Export a CSV from Settings to keep a copy. Restore it on any device running GravPack.' },
              ].map(({ icon, title, body }) => (
                <div key={title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <span className="material-icons" style={{ fontSize: 22, color: 'var(--accent)', flexShrink: 0, marginTop: 1 }}>{icon}</span>
                  <div>
                    <div style={{ fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 700, color: 'var(--t1)', marginBottom: 3 }}>{title}</div>
                    <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--t3)', lineHeight: 1.5 }}>{body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Install Banner ───────────────────────────────────────────────────────────

function InstallBanner({ onDismiss }: { onDismiss: () => void }) {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') onDismiss()
    }
  }

  if (installed) return null

  return (
    <div className="install-banner">
      <div className="install-banner-icon">
        <img src="/app-icon-192.png" alt="GravPack" style={{ width: 44, height: 44, borderRadius: 10 }} />
      </div>
      <div className="install-banner-body">
        <div className="install-banner-title">Add to Home Screen</div>
        {isIOS ? (
          <div className="install-banner-sub">
            Tap <span className="material-icons" style={{ fontSize: 14, verticalAlign: 'middle', margin: '0 2px' }}>ios_share</span> then <strong>Add to Home Screen</strong>
          </div>
        ) : deferredPrompt ? (
          <div className="install-banner-sub">Install for offline access — no app store needed</div>
        ) : (
          <div className="install-banner-sub">Use your browser's install option to add GravPack</div>
        )}
      </div>
      {!isIOS && deferredPrompt && (
        <button className="install-banner-cta" onClick={handleInstall}>Install</button>
      )}
      <button className="install-banner-close" onClick={onDismiss}>
        <span className="material-icons" style={{ fontSize: 18 }}>close</span>
      </button>
    </div>
  )
}

// ─── Tab icons ────────────────────────────────────────────────────────────────

function ShelfIcon() { return <span className="material-icons">inventory_2</span> }
function ExpiringIcon() { return <span className="material-icons">schedule</span> }
function ReadyIcon() { return <span className="material-icons">verified_user</span> }
function HouseIcon() { return <span className="material-icons">group</span> }
function SettingsIcon() { return <span className="material-icons">settings</span> }

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/')({
  component: GravPackApp,
})
