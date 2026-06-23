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
  calories: number | null
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
  bottled: number
  cans: number
  bob: boolean
  tabs: boolean
  sawyer: boolean
  lifestraw: boolean
  jerry: boolean
  cal: number
  batt: number
  veg: boolean
  infant: boolean
  gen: boolean
  fak: boolean
  rx: boolean
  rxs: boolean
  mob: boolean
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
  shelfWaterGal: number
  shelfFoodCal: number
  shelfMedicalDetail: string
  shelfPowerDetail: string
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

export const UNITS = ['units', 'cans', 'bottles', 'jars', 'pouches', 'cartons', 'lbs', 'oz', 'gal', 'packs', 'boxes', 'bags', 'tabs', 'rolls', 'meals']
export const LOCATIONS = ['Pantry', 'Garage', 'Basement', 'Closet', 'Bathroom', 'Bedroom', 'Kitchen', 'Bug-out Bag', 'Vehicle', 'Other']
export const CATEGORIES: Category[] = ['Food', 'Water', 'Medical', 'Power', 'Tools', 'Docs']
export const CAT_EMOJI: Record<Category, string> = {
  Food: 'soup_kitchen', Water: 'water_drop', Medical: 'medical_services', Power: 'bolt', Tools: 'construction', Docs: 'description'
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


// ─── Theme helpers ────────────────────────────────────────────────────────────

export type ThemePreference = 'system' | 'dark' | 'light'

export function loadTheme(): ThemePreference {
  try { return (localStorage.getItem('gravpack_theme') as ThemePreference) || 'system' } catch { return 'system' }
}

export function saveTheme(t: ThemePreference): void {
  try { localStorage.setItem('gravpack_theme', t) } catch {}
}

export function applyTheme(t: ThemePreference): void {
  const html = document.documentElement
  if (t === 'system') {
    html.removeAttribute('data-theme')
  } else {
    html.setAttribute('data-theme', t)
  }
}

// ─── Accent color ─────────────────────────────────────────────────────────────

export interface AccentOption {
  name: string
  value: string
  dark: string
}

export const ACCENT_OPTIONS: AccentOption[] = [
  { name: 'Signal Red',  value: '#E31C23', dark: '#B81017' },
  { name: 'Cobalt',      value: '#2563EB', dark: '#1D4ED8' },
  { name: 'Emerald',     value: '#059669', dark: '#047857' },
  { name: 'Violet',      value: '#7C3AED', dark: '#6D28D9' },
  { name: 'Amber',       value: '#D97706', dark: '#B45309' },
  { name: 'Coral',       value: '#F97316', dark: '#EA580C' },
  { name: 'Teal',        value: '#0D9488', dark: '#0F766E' },
  { name: 'Rose',        value: '#E11D48', dark: '#BE123C' },
]

export function loadAccentColor(): string {
  try { return localStorage.getItem('gp_accent') || '#E31C23' } catch { return '#E31C23' }
}

export function saveAccentColor(value: string, dark: string): void {
  try {
    localStorage.setItem('gp_accent', value)
    localStorage.setItem('gp_accent2', dark)
  } catch {}
}

export function applyAccentColor(value: string, dark: string): void {
  document.documentElement.style.setProperty('--accent', value)
  document.documentElement.style.setProperty('--accent2', dark)
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
    return `Best by ${Math.floor(days / 365)}yr+`
  }
  if (days < 0) return 'EXPIRED'
  if (days === 0) return 'Today'
  if (days < 30) return `${days}d left`
  if (days < 90) return `${Math.floor(days / 30)}mo`
  if (days < 365) return `${Math.floor(days / 30)}mo`
  return `${Math.floor(days / 365)}yr+`
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Name matching helpers ────────────────────────────────────────────────────

function nameContains(item: Item, ...terms: string[]): boolean {
  const n = (item.name + ' ' + item.notes).toLowerCase()
  return terms.some(t => n.includes(t.toLowerCase()))
}

function isActive(item: Item): boolean {
  return !item.depleted && getExpiryStatus(item.expiry, item.expiryType) !== 'expired'
}

// ─── Shelf → water ────────────────────────────────────────────────────────────

const WATER_GAL: Record<string, number> = {
  gal: 1, bottles: 0.26, units: 0.13, cases: 3.2,
  packs: 1.6, oz: 0.0078, cans: 0.26, lbs: 0,
}

export function shelfWaterGal(items: Item[]): number {
  return items
    .filter(i => i.category === 'Water' && isActive(i))
    .reduce((t, i) => t + i.qty * (WATER_GAL[i.unit] ?? 0.13), 0)
}

// ─── Shelf → food ────────────────────────────────────────────────────────────

const FOOD_CAL: Record<string, number> = {
  meals: 600, cans: 350, lbs: 1600, boxes: 400,
  bags: 800, packs: 250, units: 300, rolls: 200,
  oz: 75, bottles: 0, gal: 0, tabs: 0,
}

export function shelfFoodCal(items: Item[]): number {
  return items
    .filter(i => i.category === 'Food' && isActive(i))
    .reduce((t, i) => t + i.qty * (i.calories ?? FOOD_CAL[i.unit] ?? 300), 0)
}

// ─── Shelf → medical ─────────────────────────────────────────────────────────

export interface ShelfMedical {
  kitCount: number        // stocked first aid / trauma kits
  rxCount: number         // prescription / medication items
  supplementCount: number // vitamins, supplements, natural remedies
  expiredMedCount: number // expired medical items (deduct)
  score: number
  detail: string
}

export function shelfMedical(items: Item[]): ShelfMedical {
  const medItems = items.filter(i => i.category === 'Medical')

  const kitCount = medItems.filter(i =>
    isActive(i) && nameContains(i, 'first aid', 'kit', 'trauma', 'ifak', 'med kit', 'medkit')
  ).length

  const rxCount = medItems.filter(i =>
    isActive(i) && nameContains(i, 'prescription', 'rx', 'medication', 'medicine', 'antibiotic', 'epipen', 'insulin')
  ).length

  const supplementCount = medItems.filter(i =>
    isActive(i) && nameContains(i, 'vitamin', 'supplement', 'mineral', 'probiotic', 'elderberry', 'zinc', 'magnesium', 'omega', 'natural', 'herb', 'remedy')
  ).length

  const expiredMedCount = medItems.filter(i =>
    !i.depleted && getExpiryStatus(i.expiry, i.expiryType) === 'expired'
  ).length

  // Score calculation
  // Kits: first kit = 40pts, each additional = 5pts (max 60)
  const kitScore = Math.min(kitCount > 0 ? 40 + (kitCount - 1) * 5 : 0, 60)
  // Rx: tracked rx items = 20pts
  const rxScore = Math.min(rxCount * 10, 20)
  // Supplements: meaningful but lower weight
  const suppScore = Math.min(supplementCount * 3, 15)
  // Expired deduction
  const expiredDeduct = Math.min(expiredMedCount * 5, 20)

  const score = Math.max(0, Math.min(kitScore + rxScore + suppScore - expiredDeduct, 100))

  const parts: string[] = []
  if (kitCount > 0) parts.push(`${kitCount} kit${kitCount > 1 ? 's' : ''} ✓`)
  if (rxCount > 0) parts.push(`${rxCount} rx item${rxCount > 1 ? 's' : ''}`)
  if (supplementCount > 0) parts.push(`${supplementCount} supplement${supplementCount > 1 ? 's' : ''}`)
  if (expiredMedCount > 0) parts.push(`${expiredMedCount} expired`)
  const detail = parts.length > 0 ? parts.join(' · ') : 'no medical items on shelf'

  return { kitCount, rxCount, supplementCount, expiredMedCount, score, detail }
}

// ─── Shelf → power ───────────────────────────────────────────────────────────

export interface ShelfPower {
  hasGenerator: boolean
  generatorFuelValid: boolean   // fuel on shelf, not expired
  generatorFuelExpired: boolean // fuel on shelf but expired
  hasSolar: boolean             // solar charger / panel
  batteryPackCount: number      // power banks from shelf
  score: number
  detail: string
}

export function shelfPower(items: Item[], householdBatt: number, householdGen: boolean): ShelfPower {
  const powerItems = items.filter(i => i.category === 'Power' && !i.depleted)

  // Generator detection
  const genItems = powerItems.filter(i => nameContains(i, 'generator', 'gen', 'genset'))
  const hasGenerator = householdGen || genItems.length > 0

  // Fuel detection — check for valid and expired separately
  const fuelItems = powerItems.filter(i =>
    nameContains(i, 'fuel', 'gas', 'gasoline', 'propane', 'diesel', 'kerosene', 'ethanol')
  )
  const validFuel = fuelItems.filter(i => isActive(i))
  const expiredFuel = fuelItems.filter(i =>
    !i.depleted && getExpiryStatus(i.expiry, i.expiryType) === 'expired'
  )
  const generatorFuelValid = validFuel.length > 0
  const generatorFuelExpired = expiredFuel.length > 0 && validFuel.length === 0

  // Solar detection
  const solarItems = powerItems.filter(i =>
    isActive(i) && nameContains(i, 'solar', 'goal zero', 'jackery', 'panel', 'photovoltaic', 'pv')
  )
  const hasSolar = solarItems.length > 0

  // Battery packs from shelf
  const shelfBattItems = powerItems.filter(i =>
    isActive(i) && nameContains(i, 'battery', 'power bank', 'powerbank', 'anker', 'portable charger', 'battery pack')
  )
  const batteryPackCount = Math.max(householdBatt, shelfBattItems.reduce((t, i) => t + i.qty, 0))

  // Score
  let score = 0

  // Battery packs: 18pts each up to 30
  score += Math.min(batteryPackCount * 18, 30)

  // Generator
  if (hasGenerator) {
    score += 25
    if (generatorFuelValid) score += 15       // fuel confirmed on shelf
    else if (generatorFuelExpired) score -= 10 // expired fuel = liability
    else score += 5                            // generator but no fuel tracked
  }

  // Solar: 20pts + infinite fuel bonus
  if (hasSolar) score += 20

  // Bonus for having both generator and solar (full redundancy)
  if (hasGenerator && hasSolar) score += 10

  score = Math.min(Math.max(score, 0), 100)

  const parts: string[] = []
  if (batteryPackCount > 0) parts.push(`${batteryPackCount} battery pack${batteryPackCount > 1 ? 's' : ''}`)
  if (hasGenerator) {
    if (generatorFuelValid) parts.push('generator + fuel ✓')
    else if (generatorFuelExpired) parts.push('generator · fuel expired ⚠')
    else parts.push('generator · no fuel tracked')
  }
  if (hasSolar) parts.push('solar ✓')
  const detail = parts.length > 0 ? parts.join(' · ') : 'no power tracked'

  return {
    hasGenerator, generatorFuelValid, generatorFuelExpired,
    hasSolar, batteryPackCount, score, detail
  }
}

// ─── Scoring engine ───────────────────────────────────────────────────────────

export function calcScores(h: Household, items: Item[] = []): Scores {
  const dailyWater = h.adults * 1 + h.seniors * 1 + h.dogs * 1 + h.cats * 0.3

  // ── Water ──
  const commercialGal = h.bottled * 6
  const treatmentPts = (h.tabs && h.sawyer) ? 25 : h.sawyer ? 20 : h.lifestraw ? 15 : h.tabs ? 8 : 0
  const personalGal = treatmentPts > 0 ? h.cans * 6 : 0
  const bobGal = (h.bob && treatmentPts > 0) ? 100 : h.bob ? 50 : 0
  const householdWaterGal = commercialGal + personalGal + bobGal
  const derivedWaterGal = shelfWaterGal(items)
  const totalSafeWater = Math.max(householdWaterGal, derivedWaterGal) +
    (householdWaterGal > 0 && derivedWaterGal > 0 ? Math.min(householdWaterGal, derivedWaterGal) * 0.5 : 0)

  const waterDays = dailyWater > 0 ? totalSafeWater / dailyWater : 0
  const waterDayScore = Math.min(waterDays / 30, 1) * 60
  const waterTreatScore = Math.min(treatmentPts, 25)
  const waterMobileScore = h.jerry ? 15 : 0
  const waterScore = Math.min(Math.round(waterDayScore + waterTreatScore + waterMobileScore), 100)

  const waterSourceLabel = derivedWaterGal > 0 && householdWaterGal > 0
    ? 'shelf + household' : derivedWaterGal > 0 ? 'from shelf' : 'from household'
  const waterDetail = dailyWater > 0
    ? `${waterDays.toFixed(1)}d · ${totalSafeWater.toFixed(0)} gal · ${waterSourceLabel}`
    : 'configure household'

  // ── Food ──
  const dailyCal = h.adults * 2000 + h.kids * 1400 + h.seniors * 1600
  const derivedTotalCal = shelfFoodCal(items)
  const householdTotalCal = h.cal * 30
  const totalStoredCal = Math.max(householdTotalCal, derivedTotalCal) +
    (householdTotalCal > 0 && derivedTotalCal > 0 ? Math.min(householdTotalCal, derivedTotalCal) * 0.3 : 0)

  const foodDays = dailyCal > 0 && totalStoredCal > 0 ? totalStoredCal / dailyCal : 0
  let foodScore = Math.min(Math.round((foodDays / 14) * 80), 80)
  if (h.veg) foodScore = Math.round(foodScore * 0.85)
  if (h.infant) foodScore = Math.max(0, foodScore - 15)
  foodScore = Math.min(foodScore, 100)

  const foodSourceLabel = derivedTotalCal > 0 && householdTotalCal > 0
    ? 'shelf + household' : derivedTotalCal > 0 ? 'from shelf' : 'from household'
  const foodDetail = dailyCal > 0 && totalStoredCal > 0
    ? `${foodDays.toFixed(1)}d · ${Math.round(totalStoredCal / 1000)}k cal · ${foodSourceLabel}`
    : dailyCal === 0 ? 'configure household' : 'no food tracked'

  // ── Power (shelf-aware) ──
  const sp = shelfPower(items, h.batt, h.gen)
  // Blend: household toggle adds base generator pts if not already detected on shelf
  let powerScore = sp.score
  // If household has batt slider but shelf doesn't detect packs, use household value
  if (h.batt > 0 && sp.batteryPackCount === 0) {
    powerScore = Math.min(powerScore + h.batt * 18, 100)
  }
  powerScore = Math.min(powerScore, 100)
  const powerDetail = sp.detail !== 'no power tracked'
    ? sp.detail
    : h.batt > 0 ? `${h.batt} battery pack${h.batt > 1 ? 's' : ''}` : 'no power tracked'

  // ── Medical (shelf-aware) ──
  const sm = shelfMedical(items)
  // Blend with household toggles
  let medScore = sm.score
  // Household fak toggle adds base if shelf has no kits detected
  if (h.fak && sm.kitCount === 0) medScore = Math.min(medScore + 40, 100)
  // Household rx flags
  if (h.rx && h.rxs && sm.rxCount === 0) medScore = Math.min(medScore + 20, 100)
  else if (h.rx && !h.rxs && sm.rxCount === 0) medScore = Math.max(medScore - 15, 0)
  medScore = Math.min(medScore, 100)

  // Build medical detail merging shelf + household
  const medParts: string[] = []
  if (sm.kitCount > 0) medParts.push(`${sm.kitCount} kit${sm.kitCount > 1 ? 's' : ''} ✓`)
  else if (h.fak) medParts.push('kit ✓ (household)')
  if (sm.rxCount > 0) medParts.push(`${sm.rxCount} rx ✓`)
  else if (h.rx) medParts.push(h.rxs ? '30d rx ✓' : 'rx gap!')
  if (sm.supplementCount > 0) medParts.push(`${sm.supplementCount} supplement${sm.supplementCount > 1 ? 's' : ''}`)
  if (sm.expiredMedCount > 0) medParts.push(`${sm.expiredMedCount} expired ⚠`)
  const medDetail = medParts.length > 0 ? medParts.join(' · ') : 'no medical tracked'

  // ── Overall ──
  const overall = Math.round(waterScore * 0.3 + foodScore * 0.3 + powerScore * 0.2 + medScore * 0.2)
  const coverageDays = Math.min(
    waterDays > 0 ? waterDays : Infinity,
    foodDays > 0 ? foodDays : Infinity
  )
  const finalCoverage = coverageDays === Infinity ? 0 : coverageDays

  return {
    overall, water: waterScore, food: foodScore, power: powerScore, medical: medScore,
    coverageDays: finalCoverage, waterDays, foodDays,
    waterDetail, foodDetail, powerDetail, medicalDetail: medDetail,
    shelfWaterGal: derivedWaterGal, shelfFoodCal: derivedTotalCal,
    shelfMedicalDetail: sm.detail, shelfPowerDetail: sp.detail,
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
  const scores = calcScores(h, items)
  const sm = shelfMedical(items)
  const sp = shelfPower(items, h.batt, h.gen)
  const dailyWater = h.adults * 1 + h.seniors * 1 + h.dogs * 1 + h.cats * 0.3
  const dailyCal = h.adults * 2000 + h.kids * 1400 + h.seniors * 1600

  // ── Water ──
  const totalWaterGal = (h.bottled * 6) + scores.shelfWaterGal
  if (dailyWater > 0 && totalWaterGal < dailyWater * 3) {
    actions.push({
      priority: 'urgent', title: 'Buy bottled water cases now',
      why: 'Under 3 days of safe, ready-to-use water · fastest path',
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
      cost: '~$8 tabs · $25 Sawyer · $20 Lifestraw', impact: '+15–20 pts', category: 'Water'
    })
  }

  if (!h.tabs && !h.sawyer && !h.lifestraw && h.cans === 0) {
    actions.push({
      priority: 'high', title: 'Add water purification',
      why: 'No treatment method — limits usable water options',
      cost: '~$8–25', impact: '+8–20 pts', category: 'Water'
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

  // ── Food ──
  if (dailyCal > 0 && scores.foodDays < 3) {
    actions.push({
      priority: 'urgent', title: 'Stock 7-day food supply',
      why: scores.shelfFoodCal > 0
        ? `Shelf has ~${scores.foodDays.toFixed(1)}d of calories · under minimum`
        : 'No food tracked on shelf · add items to see coverage',
      cost: '~$50–120', impact: '+20–35 pts', category: 'Food'
    })
  } else if (dailyCal > 0 && scores.foodDays < 14) {
    actions.push({
      priority: 'high', title: 'Expand food to 14-day supply',
      why: `${scores.foodDays.toFixed(1)}d of calories tracked · target 14d+`,
      cost: '~$80–160', impact: '+10–20 pts', category: 'Food'
    })
  }

  if (scores.shelfFoodCal === 0 && h.cal === 0) {
    actions.push({
      priority: 'urgent', title: 'Add food items to your shelf',
      why: 'No food tracked — score cannot calculate coverage days',
      cost: 'free to track', impact: 'unlocks food score', category: 'Food'
    })
  }

  if (h.infant) {
    actions.push({
      priority: 'urgent', title: 'Stock infant formula / baby food',
      why: 'Infant flagged — specialty supply critical',
      cost: '~$40–80', impact: 'safety critical', category: 'Food'
    })
  }

  // ── Power ──
  if (sp.batteryPackCount === 0 && h.batt === 0) {
    actions.push({
      priority: 'urgent', title: 'Buy 1 portable battery bank',
      why: 'No backup power detected on shelf or household',
      cost: '~$25–35', impact: '+18 pts', category: 'Power'
    })
  } else if (sp.batteryPackCount < 2 && h.batt < 2) {
    actions.push({
      priority: 'high', title: 'Add a second battery bank',
      why: 'More capacity = more coverage days',
      cost: '~$25–35', impact: '+18 pts', category: 'Power'
    })
  }

  if (sp.generatorFuelExpired) {
    actions.push({
      priority: 'urgent', title: 'Replace expired generator fuel',
      why: 'Generator fuel on shelf is expired · generator is currently non-functional',
      cost: 'varies by fuel type', impact: '+15 pts', category: 'Power'
    })
  }

  if (sp.hasGenerator && !sp.generatorFuelValid && !sp.generatorFuelExpired) {
    actions.push({
      priority: 'high', title: 'Add generator fuel to your shelf',
      why: 'Generator detected but no fuel tracked — log fuel with expiry date',
      cost: 'varies', impact: '+15 pts', category: 'Power'
    })
  }

  if (!sp.hasSolar) {
    actions.push({
      priority: 'med', title: 'Add portable solar (Goal Zero or similar)',
      why: 'Infinite fuel source · complements generator and battery packs',
      cost: '~$50–300', impact: '+20 pts', category: 'Power'
    })
  }

  if (!sp.hasGenerator && !h.gen && sp.batteryPackCount >= 2) {
    actions.push({
      priority: 'med', title: 'Consider a generator',
      why: 'Battery banks cover phones — generator covers appliances and fuel storage',
      cost: '~$150–800', impact: '+25 pts', category: 'Power'
    })
  }

  // ── Medical ──
  if (sm.kitCount === 0 && !h.fak) {
    actions.push({
      priority: 'urgent', title: 'Stock a first aid kit',
      why: 'No kit detected on shelf or household — medical score critically low',
      cost: '~$25–60', impact: '+40 pts', category: 'Medical'
    })
  }

  if (sm.expiredMedCount > 0) {
    actions.push({
      priority: 'urgent', title: `Replace ${sm.expiredMedCount} expired medical item${sm.expiredMedCount > 1 ? 's' : ''}`,
      why: 'Expired medical supplies detected on shelf',
      cost: 'varies', impact: '+5–15 pts', category: 'Medical'
    })
  }

  if (h.rx && !h.rxs && sm.rxCount === 0) {
    actions.push({
      priority: 'urgent', title: 'Get 30-day prescription supply',
      why: 'Prescriptions flagged but no backup supply on hand or shelf',
      cost: 'varies', impact: '+20 pts', category: 'Medical'
    })
  }

  if (sm.supplementCount === 0) {
    actions.push({
      priority: 'med', title: 'Add vitamins and supplements to shelf',
      why: 'No supplements tracked — immune support and wellness gaps',
      cost: '~$30–80', impact: '+10–15 pts', category: 'Medical'
    })
  }

  if (h.mob) {
    actions.push({
      priority: 'high', title: 'Plan bug-out route for mobility needs',
      why: 'Mobility limitation — evacuation planning critical',
      cost: 'free', impact: 'safety critical', category: 'Medical'
    })
  }

  // ── Expired items ──
  const expired = items.filter(i =>
    !i.depleted && i.category !== 'Medical' && // medical handled above
    getExpiryStatus(i.expiry, i.expiryType) === 'expired'
  )
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
  const header = 'id,name,category,qty,unit,price,calories,expiry,expiryType,location,notes,depleted,created'
  const rows = items.map(i =>
    [i.id, csvEsc(i.name), i.category, i.qty, i.unit,
      i.price ?? '', i.calories ?? '', i.expiry ?? '', i.expiryType ?? '', csvEsc(i.location), csvEsc(i.notes),
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
      calories: obj.calories ? parseFloat(obj.calories) : null,
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
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"' && !inQ) inQ = true
    else if (c === '"' && inQ) {
      if (line[i + 1] === '"') { cur += '"'; i++ }
      else inQ = false
    } else if (c === ',' && !inQ) { result.push(cur); cur = '' }
    else cur += c
  }
  result.push(cur)
  return result
}