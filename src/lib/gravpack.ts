// ─── Types ───────────────────────────────────────────────────────────────────

export type Category = 'Food' | 'Water' | 'Medical' | 'Power' | 'Tools' | 'Docs'
export type Screen = 'shelf' | 'expiring' | 'readiness' | 'household' | 'strategy' | 'settings'
export type ExpiryType = 'expires' | 'best-by'
export type ExpiryStatus = 'expired' | 'critical' | 'warning' | 'good' | 'long' | 'noexp' | 'past-best-by'

export interface PriceRecord {
  price: number
  date: string
}

export interface ConsumeEntry {
  qty: number
  unit: string
  date: string
  note: string
}

export interface Item {
  id: string
  name: string
  category: Category
  qty: number
  unit: string
  price: number | null
  priceHistory: PriceRecord[]
  expiry: string | null
  expiryType?: ExpiryType
  location: string
  notes: string
  depleted: boolean
  consumeLog: ConsumeEntry[]
  created: string
}

export interface Household {
  adults: number
  kids: number
  seniors: number
  dogs: number
  cats: number
  bottled: number  // commercial sealed water cases (~6 gal each)
  cans: number     // 6-gal food-grade cans
  bob: boolean     // WaterBOB ~100 gal
  tabs: boolean    // Aquatabs purification
  sawyer: boolean  // Sawyer filter
  lifestraw: boolean
  jerry: boolean   // Jerrycan with filter
  cal: number      // stored calories per day
  batt: number     // portable battery packs
  veg: boolean     // vegetarian/vegan
  infant: boolean
  gen: boolean     // generator
  fak: boolean     // first aid kit
  rx: boolean      // prescriptions in household
  rxs: boolean     // 30-day rx supply ready
  mob: boolean     // mobility limitations
}

export interface Scores {
  overall: number
  water: number
  food: number
  power: number
  medical: number
  coverageDays: number
  waterDays: number
  foodDays: number
  waterDetail: string
  foodDetail: string
  powerDetail: string
  medicalDetail: string
}

export interface StrategyAction {
  priority: 'urgent' | 'high' | 'med'
  title: string
  why: string
  cost: string
  impact: string
  category: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const UNITS = ['units', 'cans', 'bottles', 'lbs', 'oz', 'gal', 'packs', 'boxes', 'bags', 'tabs', 'rolls', 'meals']
export const LOCATIONS = ['Pantry', 'Garage', 'Basement', 'Closet', 'Bathroom', 'Bedroom', 'Kitchen', 'Bug-out Bag', 'Vehicle', 'Other']
export const CATEGORIES: Category[] = ['Food', 'Water', 'Medical', 'Power', 'Tools', 'Docs']
export const CAT_EMOJI: Record<Category, string> = {
  Food: '🥫', Water: '💧', Medical: '💊', Power: '🔋', Tools: '🔦', Docs: '📄'
}

export const DEFAULT_HOUSEHOLD: Household = {
  adults: 2, kids: 0, seniors: 0,
  dogs: 0, cats: 0,
  bottled: 0, cans: 0,
  bob: false, tabs: false, sawyer: false, lifestraw: false, jerry: false,
  cal: 0, batt: 0,
  veg: false, infant: false, gen: false,
  fak: false, rx: false, rxs: false, mob: false,
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

export function loadItems(): Item[] {
  try {
    const raw = localStorage.getItem('gravpack_items_v1')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveItems(items: Item[]): void {
  try { localStorage.setItem('gravpack_items_v1', JSON.stringify(items)) } catch {}
}

export function loadHousehold(): Household {
  try {
    const raw = localStorage.getItem('gravpack_household_v1')
    return raw ? { ...DEFAULT_HOUSEHOLD, ...JSON.parse(raw) } : DEFAULT_HOUSEHOLD
  } catch { return DEFAULT_HOUSEHOLD }
}

export function saveHousehold(h: Household): void {
  try { localStorage.setItem('gravpack_household_v1', JSON.stringify(h)) } catch {}
}

export function loadDisplayName(): string {
  try { return localStorage.getItem('gravpack_display_name') || '' } catch { return '' }
}

export function saveDisplayName(name: string): void {
  try { localStorage.setItem('gravpack_display_name', name) } catch {}
}

export function loadLastBackup(): string {
  try { return localStorage.getItem('gravpack_last_backup') || '' } catch { return '' }
}

export function saveLastBackup(date: string): void {
  try { localStorage.setItem('gravpack_last_backup', date) } catch {}
}

export function getStorageSize(): string {
  try {
    let total = 0
    for (const key of Object.keys(localStorage)) {
      total += (localStorage.getItem(key) || '').length * 2
    }
    if (total < 1024) return `${total} B`
    if (total < 1024 * 1024) return `${(total / 1024).toFixed(1)} KB`
    return `${(total / (1024 * 1024)).toFixed(1)} MB`
  } catch { return '—' }
}

// ─── Expiry helpers ───────────────────────────────────────────────────────────

export function getExpiryStatus(expiry: string | null, expiryType?: ExpiryType): ExpiryStatus {
  if (!expiry) return 'noexp'
  const days = Math.floor((new Date(expiry).getTime() - Date.now()) / 86400000)
  if (expiryType === 'best-by') {
    if (days < 0) return 'past-best-by'
    if (days < 30) return 'warning'
    if (days < 90) return 'good'
    if (days < 365) return 'good'
    return 'long'
  }
  if (days < 0) return 'expired'
  if (days < 30) return 'critical'
  if (days < 90) return 'warning'
  if (days < 365) return 'good'
  return 'long'
}

export function getExpiryBadgeText(expiry: string | null, expiryType?: ExpiryType): string {
  if (!expiry) return 'No expiry'
  const days = Math.floor((new Date(expiry).getTime() - Date.now()) / 86400000)
  if (expiryType === 'best-by') {
    if (days < 0) return 'Past best by'
    if (days === 0) return 'Best by today'
    if (days < 30) return `Best by ${days}d`
    if (days < 90) return `Best by ${Math.floor(days / 30)}mo`
    if (days < 365) return `Best by ${Math.floor(days / 30)}mo`
    const yrs = Math.floor(days / 365)
    return `Best by ${yrs}yr+`
  }
  if (days < 0) return 'EXPIRED'
  if (days === 0) return 'Today'
  if (days < 30) return `${days}d left`
  if (days < 90) return `${Math.floor(days / 30)}mo`
  if (days < 365) return `${Math.floor(days / 30)}mo`
  const yrs = Math.floor(days / 365)
  return `${yrs}yr+`
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Scoring engine ───────────────────────────────────────────────────────────

export function calcScores(h: Household): Scores {
  const totalPeople = h.adults + h.kids + h.seniors
  const dailyWater = h.adults * 1 + h.seniors * 1 + h.dogs * 1 + h.cats * 0.3

  // Water scoring
  const commercialGal = h.bottled * 6
  const treatmentPts = (h.tabs && h.sawyer) ? 25 : h.sawyer ? 20 : h.lifestraw ? 15 : h.tabs ? 8 : 0
  const personalGal = treatmentPts > 0 ? h.cans * 6 : 0
  const bobGal = (h.bob && treatmentPts > 0) ? 100 : h.bob ? 50 : 0
  const totalSafeWater = commercialGal + personalGal + bobGal
  const waterDays = dailyWater > 0 ? totalSafeWater / dailyWater : 0
  const waterDayScore = Math.min(waterDays / 30, 1) * 60
  const waterTreatScore = Math.min(treatmentPts, 25)
  const waterMobileScore = h.jerry ? 15 : 0
  const waterScore = Math.min(Math.round(waterDayScore + waterTreatScore + waterMobileScore), 100)

  const waterDetail = dailyWater > 0
    ? `${waterDays.toFixed(1)}d safe water · ${totalSafeWater.toFixed(0)} gal`
    : 'configure household'

  // Food scoring
  const dailyCal = h.adults * 2000 + h.kids * 1400 + h.seniors * 1600
  const foodDays = dailyCal > 0 && h.cal > 0 ? h.cal / dailyCal : 0
  let foodScore = Math.min(Math.round((foodDays / 14) * 80), 80)
  if (h.veg) foodScore = Math.round(foodScore * 0.85)
  if (h.infant) foodScore = Math.max(0, foodScore - 15)
  foodScore = Math.min(foodScore, 100)

  const foodDetail = dailyCal > 0
    ? `${foodDays.toFixed(1)}d calories · ${h.cal.toLocaleString()} cal/day stored`
    : 'configure household'

  // Power scoring
  const powerScore = Math.min(h.batt * 18 + (h.gen ? 30 : 0), 100)
  const powerDetail = `${h.batt} battery pack${h.batt !== 1 ? 's' : ''}${h.gen ? ' + generator' : ''}`

  // Medical scoring
  let medScore = 0
  if (h.fak) medScore += 50
  if (h.rx && h.rxs) medScore += 40
  else if (h.rx && !h.rxs) medScore = Math.max(medScore - 20, 0)
  if (!h.fak && !h.rx) medScore = 0
  medScore = Math.min(medScore, 100)

  const medDetail = [
    h.fak ? 'first aid kit ✓' : 'no first aid kit',
    h.rx ? (h.rxs ? '30d rx ✓' : 'rx gap!') : ''
  ].filter(Boolean).join(' · ')

  // Overall (weighted)
  const overall = Math.round(waterScore * 0.3 + foodScore * 0.3 + powerScore * 0.2 + medScore * 0.2)
  const coverageDays = Math.min(waterDays, foodDays > 0 ? foodDays : waterDays)

  return {
    overall, water: waterScore, food: foodScore, power: powerScore, medical: medScore,
    coverageDays, waterDays, foodDays,
    waterDetail, foodDetail, powerDetail, medicalDetail: medDetail,
  }
}

export function scoreColor(score: number): string {
  if (score >= 75) return 'var(--good)'
  if (score >= 50) return 'var(--yellow)'
  if (score >= 25) return 'var(--orange)'
  return 'var(--red)'
}

// ─── Strategy engine ──────────────────────────────────────────────────────────

export function buildStrategy(h: Household, items: Item[]): StrategyAction[] {
  const actions: StrategyAction[] = []
  const scores = calcScores(h)
  const dailyWater = h.adults * 1 + h.seniors * 1 + h.dogs * 1 + h.cats * 0.3
  const dailyCal = h.adults * 2000 + h.kids * 1400 + h.seniors * 1600

  // Water actions
  const commercialGal = h.bottled * 6
  if (dailyWater > 0 && commercialGal < dailyWater * 3) {
    actions.push({
      priority: 'urgent', title: 'Buy bottled water cases now',
      why: `Under 3 days of safe, ready-to-use water · fastest path`,
      cost: '~$1/gal · ~$18–36', impact: '+20–30 pts', category: 'Water'
    })
  } else if (dailyWater > 0 && scores.waterDays < 14) {
    actions.push({
      priority: 'high', title: 'Expand bottled water to 14d coverage',
      why: `${scores.waterDays.toFixed(1)}d safe water · target 14d`,
      cost: '~$30–80', impact: '+10–20 pts', category: 'Water'
    })
  }

  if (h.cans > 0 && !h.tabs && !h.sawyer && !h.lifestraw) {
    actions.push({
      priority: 'urgent', title: 'Add treatment for personal storage',
      why: 'Personal cans require purification before use',
      cost: '~$8 tabs · $25 Sawyer', impact: '+15–20 pts', category: 'Water'
    })
  }

  if (!h.tabs && !h.sawyer && !h.lifestraw && h.cans === 0) {
    actions.push({
      priority: 'high', title: 'Add water purification',
      why: 'No treatment method — limits usable water options',
      cost: '~$8–25', impact: '+8–20 pts', category: 'Water'
    })
  }

  if (h.cans === 0 && h.bottled < 5) {
    actions.push({
      priority: 'high', title: 'Add 6-gal food-grade cans',
      why: 'Reusable personal storage — fill from tap, treat before use',
      cost: '~$8–12/can at Walmart', impact: '+5–15 pts', category: 'Water'
    })
  }

  if (!h.bob && dailyWater > 0 && scores.waterDays < 30) {
    actions.push({
      priority: 'med', title: 'Get a WaterBOB',
      why: '$30 = 100 gal surge capacity · fill bathtub with 24hr warning',
      cost: '~$30', impact: '+5–10 pts', category: 'Water'
    })
  }

  if (!h.jerry && scores.water > 40) {
    actions.push({
      priority: 'med', title: 'Jerrycan with filter for bug-out',
      why: 'Home water improving — mobile gap remains',
      cost: '~$299', impact: '+15 pts', category: 'Water'
    })
  }

  // Food actions
  if (dailyCal > 0 && scores.foodDays < 3) {
    actions.push({
      priority: 'urgent', title: 'Stock 7-day food supply',
      why: `${scores.foodDays.toFixed(1)}d calories stored · under minimum`,
      cost: '~$50–120', impact: '+20–35 pts', category: 'Food'
    })
  } else if (dailyCal > 0 && scores.foodDays < 14) {
    actions.push({
      priority: 'high', title: 'Expand food to 14-day supply',
      why: `${scores.foodDays.toFixed(1)}d of calories · target 14d+`,
      cost: '~$80–160', impact: '+10–20 pts', category: 'Food'
    })
  }

  if (h.infant) {
    actions.push({
      priority: 'urgent', title: 'Stock infant formula / baby food',
      why: 'Infant flagged — specialty supply critical',
      cost: '~$40–80', impact: 'safety critical', category: 'Food'
    })
  }

  // Power actions
  if (h.batt === 0) {
    actions.push({
      priority: 'urgent', title: 'Buy 1 portable battery bank',
      why: 'No backup power — critical gap',
      cost: '~$25–35', impact: '+18 pts', category: 'Power'
    })
  } else if (h.batt < 2) {
    actions.push({
      priority: 'high', title: 'Add a second battery bank',
      why: 'More capacity = more coverage days',
      cost: '~$25–35', impact: '+18 pts', category: 'Power'
    })
  }

  if (!h.gen && h.batt >= 2) {
    actions.push({
      priority: 'med', title: 'Consider a generator',
      why: 'Battery banks cover phones — generator covers everything',
      cost: '~$150–500', impact: '+30 pts', category: 'Power'
    })
  }

  // Medical actions
  if (!h.fak) {
    actions.push({
      priority: 'urgent', title: 'Stock a first aid kit',
      why: 'No kit — medical score critically low',
      cost: '~$25–60', impact: '+50 pts', category: 'Medical'
    })
  }

  if (h.rx && !h.rxs) {
    actions.push({
      priority: 'urgent', title: 'Get 30-day prescription supply',
      why: 'Prescriptions flagged but no backup supply on hand',
      cost: 'varies', impact: '+40 pts', category: 'Medical'
    })
  }

  if (h.mob) {
    actions.push({
      priority: 'high', title: 'Plan bug-out route for mobility needs',
      why: 'Mobility limitation — evacuation planning critical',
      cost: 'free', impact: 'safety critical', category: 'Medical'
    })
  }

  // Expired item actions
  const expired = items.filter(i => !i.depleted && getExpiryStatus(i.expiry, i.expiryType) === 'expired')
  if (expired.length > 0) {
    actions.push({
      priority: 'urgent',
      title: `Replace ${expired.length} expired item${expired.length > 1 ? 's' : ''}`,
      why: expired.slice(0, 3).map(i => i.name).join(', ') + (expired.length > 3 ? '…' : ''),
      cost: 'varies', impact: 'restore score', category: 'Shelf'
    })
  }

  return actions
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────

export function exportCSV(items: Item[]): void {
  const header = 'id,name,category,qty,unit,price,expiry,expiryType,location,notes,depleted,created'
  const rows = items.map(i =>
    [i.id, csvEsc(i.name), i.category, i.qty, i.unit,
      i.price ?? '', i.expiry ?? '', i.expiryType ?? '', csvEsc(i.location), csvEsc(i.notes),
      i.depleted ? '1' : '0', i.created
    ].join(',')
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `gravpack-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
  saveLastBackup(new Date().toLocaleDateString())
}

function csvEsc(s: string): string {
  if (!s) return ''
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function parseCSV(text: string): Partial<Item>[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',')
  return lines.slice(1).map(line => {
    const vals = splitCSVLine(line)
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h.trim()] = (vals[i] || '').trim() })
    return {
      id: obj.id || Date.now().toString(),
      name: obj.name || '',
      category: (obj.category as Category) || 'Food',
      qty: parseFloat(obj.qty) || 0,
      unit: obj.unit || 'units',
      price: obj.price ? parseFloat(obj.price) : null,
      expiry: obj.expiry || null,
      expiryType: (obj.expiryType as ExpiryType) || undefined,
      location: obj.location || '',
      notes: obj.notes || '',
      depleted: obj.depleted === '1',
      created: obj.created || new Date().toISOString(),
      priceHistory: [],
      consumeLog: [],
    }
  })
}

function splitCSVLine(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"' && !inQ) { inQ = true }
    else if (c === '"' && inQ) {
      if (line[i + 1] === '"') { cur += '"'; i++ }
      else inQ = false
    } else if (c === ',' && !inQ) { result.push(cur); cur = '' }
    else cur += c
  }
  result.push(cur)
  return result
}
