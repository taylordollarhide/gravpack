import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
const UNITS = ["units", "cans", "bottles", "jars", "pouches", "cartons", "lbs", "oz", "gal", "packs", "boxes", "bags", "tabs", "rolls", "meals"];
const LOCATIONS = ["Pantry", "Garage", "Basement", "Closet", "Bathroom", "Bedroom", "Kitchen", "Bug-out Bag", "Vehicle", "Other"];
const CATEGORIES = ["Food", "Water", "Medical", "Power", "Tools", "Docs"];
const CAT_EMOJI = {
  Food: "soup_kitchen",
  Water: "water_drop",
  Medical: "medical_services",
  Power: "bolt",
  Tools: "construction",
  Docs: "description"
};
const DEFAULT_HOUSEHOLD = {
  adults: 2,
  kids: 0,
  seniors: 0,
  dogs: 0,
  cats: 0,
  bottled: 0,
  cans: 0,
  bob: false,
  tabs: false,
  sawyer: false,
  lifestraw: false,
  jerry: false,
  cal: 0,
  batt: 0,
  veg: false,
  infant: false,
  gen: false,
  fak: false,
  rx: false,
  rxs: false,
  mob: false
};
function loadItems() {
  try {
    const raw = localStorage.getItem("gravpack_items_v1");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveItems(items) {
  try {
    localStorage.setItem("gravpack_items_v1", JSON.stringify(items));
  } catch {
  }
}
function loadHousehold() {
  try {
    const raw = localStorage.getItem("gravpack_household_v1");
    return raw ? { ...DEFAULT_HOUSEHOLD, ...JSON.parse(raw) } : DEFAULT_HOUSEHOLD;
  } catch {
    return DEFAULT_HOUSEHOLD;
  }
}
function saveHousehold(h) {
  try {
    localStorage.setItem("gravpack_household_v1", JSON.stringify(h));
  } catch {
  }
}
function loadDisplayName() {
  try {
    return localStorage.getItem("gravpack_display_name") || "";
  } catch {
    return "";
  }
}
function saveDisplayName(name) {
  try {
    localStorage.setItem("gravpack_display_name", name);
  } catch {
  }
}
function loadLastBackup() {
  try {
    return localStorage.getItem("gravpack_last_backup") || "";
  } catch {
    return "";
  }
}
function saveLastBackup(date) {
  try {
    localStorage.setItem("gravpack_last_backup", date);
  } catch {
  }
}
function loadTheme() {
  try {
    return localStorage.getItem("gravpack_theme") || "system";
  } catch {
    return "system";
  }
}
function saveTheme(t) {
  try {
    localStorage.setItem("gravpack_theme", t);
  } catch {
  }
}
function applyTheme(t) {
  const html = document.documentElement;
  if (t === "system") {
    html.removeAttribute("data-theme");
  } else {
    html.setAttribute("data-theme", t);
  }
}
const ACCENT_OPTIONS = [
  { name: "Signal Red", value: "#E31C23", dark: "#B81017" },
  { name: "Cobalt", value: "#2563EB", dark: "#1D4ED8" },
  { name: "Emerald", value: "#059669", dark: "#047857" },
  { name: "Violet", value: "#7C3AED", dark: "#6D28D9" },
  { name: "Amber", value: "#D97706", dark: "#B45309" },
  { name: "Coral", value: "#F97316", dark: "#EA580C" },
  { name: "Teal", value: "#0D9488", dark: "#0F766E" },
  { name: "Rose", value: "#E11D48", dark: "#BE123C" }
];
function loadAccentColor() {
  try {
    return localStorage.getItem("gp_accent") || "#E31C23";
  } catch {
    return "#E31C23";
  }
}
function saveAccentColor(value, dark) {
  try {
    localStorage.setItem("gp_accent", value);
    localStorage.setItem("gp_accent2", dark);
  } catch {
  }
}
function applyAccentColor(value, dark) {
  document.documentElement.style.setProperty("--accent", value);
  document.documentElement.style.setProperty("--accent2", dark);
}
function getStorageSize() {
  try {
    let total = 0;
    for (const key of Object.keys(localStorage)) {
      total += (localStorage.getItem(key) || "").length * 2;
    }
    if (total < 1024) return `${total} B`;
    if (total < 1024 * 1024) return `${(total / 1024).toFixed(1)} KB`;
    return `${(total / (1024 * 1024)).toFixed(1)} MB`;
  } catch {
    return "—";
  }
}
function getExpiryStatus(expiry, expiryType) {
  if (!expiry) return "noexp";
  const days = Math.floor((new Date(expiry).getTime() - Date.now()) / 864e5);
  if (expiryType === "best-by") {
    if (days < 0) return "past-best-by";
    if (days < 30) return "warning";
    if (days < 365) return "good";
    return "long";
  }
  if (days < 0) return "expired";
  if (days < 30) return "critical";
  if (days < 90) return "warning";
  if (days < 365) return "good";
  return "long";
}
function getExpiryBadgeText(expiry, expiryType) {
  if (!expiry) return "No expiry";
  const days = Math.floor((new Date(expiry).getTime() - Date.now()) / 864e5);
  if (expiryType === "best-by") {
    if (days < 0) return "Past best by";
    if (days === 0) return "Best by today";
    if (days < 30) return `Best by ${days}d`;
    if (days < 90) return `Best by ${Math.floor(days / 30)}mo`;
    if (days < 365) return `Best by ${Math.floor(days / 30)}mo`;
    return `Best by ${Math.floor(days / 365)}yr+`;
  }
  if (days < 0) return "EXPIRED";
  if (days === 0) return "Today";
  if (days < 30) return `${days}d left`;
  if (days < 90) return `${Math.floor(days / 30)}mo`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}yr+`;
}
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function nameContains(item, ...terms) {
  const n = (item.name + " " + item.notes).toLowerCase();
  return terms.some((t) => n.includes(t.toLowerCase()));
}
function isActive(item) {
  return !item.depleted && getExpiryStatus(item.expiry, item.expiryType) !== "expired";
}
const WATER_GAL = {
  gal: 1,
  bottles: 0.26,
  units: 0.13,
  cases: 3.2,
  packs: 1.6,
  oz: 78e-4,
  cans: 0.26,
  lbs: 0
};
function shelfWaterGal(items) {
  return items.filter((i) => i.category === "Water" && isActive(i)).reduce((t, i) => t + i.qty * (WATER_GAL[i.unit] ?? 0.13), 0);
}
const FOOD_CAL = {
  meals: 600,
  cans: 350,
  lbs: 1600,
  boxes: 400,
  bags: 800,
  packs: 250,
  units: 300,
  rolls: 200,
  oz: 75,
  bottles: 0,
  gal: 0,
  tabs: 0
};
function shelfFoodCal(items) {
  return items.filter((i) => i.category === "Food" && isActive(i)).reduce((t, i) => t + i.qty * (i.calories ?? FOOD_CAL[i.unit] ?? 300), 0);
}
function shelfMedical(items) {
  const medItems = items.filter((i) => i.category === "Medical");
  const kitCount = medItems.filter(
    (i) => isActive(i) && nameContains(i, "first aid", "kit", "trauma", "ifak", "med kit", "medkit")
  ).length;
  const rxCount = medItems.filter(
    (i) => isActive(i) && nameContains(i, "prescription", "rx", "medication", "medicine", "antibiotic", "epipen", "insulin")
  ).length;
  const supplementCount = medItems.filter(
    (i) => isActive(i) && nameContains(i, "vitamin", "supplement", "mineral", "probiotic", "elderberry", "zinc", "magnesium", "omega", "natural", "herb", "remedy")
  ).length;
  const expiredMedCount = medItems.filter(
    (i) => !i.depleted && getExpiryStatus(i.expiry, i.expiryType) === "expired"
  ).length;
  const kitScore = Math.min(kitCount > 0 ? 40 + (kitCount - 1) * 5 : 0, 60);
  const rxScore = Math.min(rxCount * 10, 20);
  const suppScore = Math.min(supplementCount * 3, 15);
  const expiredDeduct = Math.min(expiredMedCount * 5, 20);
  const score = Math.max(0, Math.min(kitScore + rxScore + suppScore - expiredDeduct, 100));
  const parts = [];
  if (kitCount > 0) parts.push(`${kitCount} kit${kitCount > 1 ? "s" : ""} ✓`);
  if (rxCount > 0) parts.push(`${rxCount} rx item${rxCount > 1 ? "s" : ""}`);
  if (supplementCount > 0) parts.push(`${supplementCount} supplement${supplementCount > 1 ? "s" : ""}`);
  if (expiredMedCount > 0) parts.push(`${expiredMedCount} expired`);
  const detail = parts.length > 0 ? parts.join(" · ") : "no medical items on shelf";
  return { kitCount, rxCount, supplementCount, expiredMedCount, score, detail };
}
function shelfPower(items, householdBatt, householdGen) {
  const powerItems = items.filter((i) => i.category === "Power" && !i.depleted);
  const genItems = powerItems.filter((i) => nameContains(i, "generator", "gen", "genset"));
  const hasGenerator = householdGen || genItems.length > 0;
  const fuelItems = powerItems.filter(
    (i) => nameContains(i, "fuel", "gas", "gasoline", "propane", "diesel", "kerosene", "ethanol")
  );
  const validFuel = fuelItems.filter((i) => isActive(i));
  const expiredFuel = fuelItems.filter(
    (i) => !i.depleted && getExpiryStatus(i.expiry, i.expiryType) === "expired"
  );
  const generatorFuelValid = validFuel.length > 0;
  const generatorFuelExpired = expiredFuel.length > 0 && validFuel.length === 0;
  const solarItems = powerItems.filter(
    (i) => isActive(i) && nameContains(i, "solar", "goal zero", "jackery", "panel", "photovoltaic", "pv")
  );
  const hasSolar = solarItems.length > 0;
  const shelfBattItems = powerItems.filter(
    (i) => isActive(i) && nameContains(i, "battery", "power bank", "powerbank", "anker", "portable charger", "battery pack")
  );
  const batteryPackCount = Math.max(householdBatt, shelfBattItems.reduce((t, i) => t + i.qty, 0));
  let score = 0;
  score += Math.min(batteryPackCount * 18, 30);
  if (hasGenerator) {
    score += 25;
    if (generatorFuelValid) score += 15;
    else if (generatorFuelExpired) score -= 10;
    else score += 5;
  }
  if (hasSolar) score += 20;
  if (hasGenerator && hasSolar) score += 10;
  score = Math.min(Math.max(score, 0), 100);
  const parts = [];
  if (batteryPackCount > 0) parts.push(`${batteryPackCount} battery pack${batteryPackCount > 1 ? "s" : ""}`);
  if (hasGenerator) {
    if (generatorFuelValid) parts.push("generator + fuel ✓");
    else if (generatorFuelExpired) parts.push("generator · fuel expired ⚠");
    else parts.push("generator · no fuel tracked");
  }
  if (hasSolar) parts.push("solar ✓");
  const detail = parts.length > 0 ? parts.join(" · ") : "no power tracked";
  return {
    hasGenerator,
    generatorFuelValid,
    generatorFuelExpired,
    hasSolar,
    batteryPackCount,
    score,
    detail
  };
}
function calcScores(h, items = []) {
  const dailyWater = h.adults * 1 + h.seniors * 1 + h.dogs * 1 + h.cats * 0.3;
  const commercialGal = h.bottled * 6;
  const treatmentPts = h.tabs && h.sawyer ? 25 : h.sawyer ? 20 : h.lifestraw ? 15 : h.tabs ? 8 : 0;
  const personalGal = treatmentPts > 0 ? h.cans * 6 : 0;
  const bobGal = h.bob && treatmentPts > 0 ? 100 : h.bob ? 50 : 0;
  const householdWaterGal = commercialGal + personalGal + bobGal;
  const derivedWaterGal = shelfWaterGal(items);
  const totalSafeWater = Math.max(householdWaterGal, derivedWaterGal) + (householdWaterGal > 0 && derivedWaterGal > 0 ? Math.min(householdWaterGal, derivedWaterGal) * 0.5 : 0);
  const waterDays = dailyWater > 0 ? totalSafeWater / dailyWater : 0;
  const waterDayScore = Math.min(waterDays / 30, 1) * 60;
  const waterTreatScore = Math.min(treatmentPts, 25);
  const waterMobileScore = h.jerry ? 15 : 0;
  const waterScore = Math.min(Math.round(waterDayScore + waterTreatScore + waterMobileScore), 100);
  const waterSourceLabel = derivedWaterGal > 0 && householdWaterGal > 0 ? "shelf + household" : derivedWaterGal > 0 ? "from shelf" : "from household";
  const waterDetail = dailyWater > 0 ? `${waterDays.toFixed(1)}d · ${totalSafeWater.toFixed(0)} gal · ${waterSourceLabel}` : "configure household";
  const dailyCal = h.adults * 2e3 + h.kids * 1400 + h.seniors * 1600;
  const derivedTotalCal = shelfFoodCal(items);
  const householdTotalCal = h.cal * 30;
  const totalStoredCal = Math.max(householdTotalCal, derivedTotalCal) + (householdTotalCal > 0 && derivedTotalCal > 0 ? Math.min(householdTotalCal, derivedTotalCal) * 0.3 : 0);
  const foodDays = dailyCal > 0 && totalStoredCal > 0 ? totalStoredCal / dailyCal : 0;
  let foodScore = Math.min(Math.round(foodDays / 14 * 80), 80);
  if (h.veg) foodScore = Math.round(foodScore * 0.85);
  if (h.infant) foodScore = Math.max(0, foodScore - 15);
  foodScore = Math.min(foodScore, 100);
  const foodSourceLabel = derivedTotalCal > 0 && householdTotalCal > 0 ? "shelf + household" : derivedTotalCal > 0 ? "from shelf" : "from household";
  const foodDetail = dailyCal > 0 && totalStoredCal > 0 ? `${foodDays.toFixed(1)}d · ${Math.round(totalStoredCal / 1e3)}k cal · ${foodSourceLabel}` : dailyCal === 0 ? "configure household" : "no food tracked";
  const sp = shelfPower(items, h.batt, h.gen);
  let powerScore = sp.score;
  if (h.batt > 0 && sp.batteryPackCount === 0) {
    powerScore = Math.min(powerScore + h.batt * 18, 100);
  }
  powerScore = Math.min(powerScore, 100);
  const powerDetail = sp.detail !== "no power tracked" ? sp.detail : h.batt > 0 ? `${h.batt} battery pack${h.batt > 1 ? "s" : ""}` : "no power tracked";
  const sm = shelfMedical(items);
  let medScore = sm.score;
  if (h.fak && sm.kitCount === 0) medScore = Math.min(medScore + 40, 100);
  if (h.rx && h.rxs && sm.rxCount === 0) medScore = Math.min(medScore + 20, 100);
  else if (h.rx && !h.rxs && sm.rxCount === 0) medScore = Math.max(medScore - 15, 0);
  medScore = Math.min(medScore, 100);
  const medParts = [];
  if (sm.kitCount > 0) medParts.push(`${sm.kitCount} kit${sm.kitCount > 1 ? "s" : ""} ✓`);
  else if (h.fak) medParts.push("kit ✓ (household)");
  if (sm.rxCount > 0) medParts.push(`${sm.rxCount} rx ✓`);
  else if (h.rx) medParts.push(h.rxs ? "30d rx ✓" : "rx gap!");
  if (sm.supplementCount > 0) medParts.push(`${sm.supplementCount} supplement${sm.supplementCount > 1 ? "s" : ""}`);
  if (sm.expiredMedCount > 0) medParts.push(`${sm.expiredMedCount} expired ⚠`);
  const medDetail = medParts.length > 0 ? medParts.join(" · ") : "no medical tracked";
  const overall = Math.round(waterScore * 0.3 + foodScore * 0.3 + powerScore * 0.2 + medScore * 0.2);
  const coverageDays = Math.min(
    waterDays > 0 ? waterDays : Infinity,
    foodDays > 0 ? foodDays : Infinity
  );
  const finalCoverage = coverageDays === Infinity ? 0 : coverageDays;
  return {
    overall,
    water: waterScore,
    food: foodScore,
    power: powerScore,
    medical: medScore,
    coverageDays: finalCoverage,
    waterDays,
    foodDays,
    waterDetail,
    foodDetail,
    powerDetail,
    medicalDetail: medDetail,
    shelfWaterGal: derivedWaterGal,
    shelfFoodCal: derivedTotalCal,
    shelfMedicalDetail: sm.detail,
    shelfPowerDetail: sp.detail
  };
}
function scoreColor(score) {
  if (score >= 75) return "var(--good)";
  if (score >= 50) return "var(--yellow)";
  if (score >= 25) return "var(--orange)";
  return "var(--red)";
}
function buildStrategy(h, items) {
  const actions = [];
  const scores = calcScores(h, items);
  const sm = shelfMedical(items);
  const sp = shelfPower(items, h.batt, h.gen);
  const dailyWater = h.adults * 1 + h.seniors * 1 + h.dogs * 1 + h.cats * 0.3;
  const dailyCal = h.adults * 2e3 + h.kids * 1400 + h.seniors * 1600;
  const totalWaterGal = h.bottled * 6 + scores.shelfWaterGal;
  if (dailyWater > 0 && totalWaterGal < dailyWater * 3) {
    actions.push({
      priority: "urgent",
      title: "Buy bottled water cases now",
      why: "Under 3 days of safe, ready-to-use water · fastest path",
      cost: "~$1/gal · ~$18–36",
      impact: "+20–30 pts",
      category: "Water"
    });
  } else if (dailyWater > 0 && scores.waterDays < 14) {
    actions.push({
      priority: "high",
      title: "Expand bottled water to 14d coverage",
      why: `${scores.waterDays.toFixed(1)}d safe water · target 14d`,
      cost: "~$30–80",
      impact: "+10–20 pts",
      category: "Water"
    });
  }
  if (h.cans > 0 && !h.tabs && !h.sawyer && !h.lifestraw) {
    actions.push({
      priority: "urgent",
      title: "Add treatment for personal storage",
      why: "Personal cans require purification before use",
      cost: "~$8 tabs · $25 Sawyer · $20 Lifestraw",
      impact: "+15–20 pts",
      category: "Water"
    });
  }
  if (!h.tabs && !h.sawyer && !h.lifestraw && h.cans === 0) {
    actions.push({
      priority: "high",
      title: "Add water purification",
      why: "No treatment method — limits usable water options",
      cost: "~$8–25",
      impact: "+8–20 pts",
      category: "Water"
    });
  }
  if (!h.bob && dailyWater > 0 && scores.waterDays < 30) {
    actions.push({
      priority: "med",
      title: "Get a WaterBOB",
      why: "$30 = 100 gal surge capacity · fill bathtub with 24hr warning",
      cost: "~$30",
      impact: "+5–10 pts",
      category: "Water"
    });
  }
  if (!h.jerry && scores.water > 40) {
    actions.push({
      priority: "med",
      title: "Jerrycan with filter for bug-out",
      why: "Home water improving — mobile gap remains",
      cost: "~$299",
      impact: "+15 pts",
      category: "Water"
    });
  }
  if (dailyCal > 0 && scores.foodDays < 3) {
    actions.push({
      priority: "urgent",
      title: "Stock 7-day food supply",
      why: scores.shelfFoodCal > 0 ? `Shelf has ~${scores.foodDays.toFixed(1)}d of calories · under minimum` : "No food tracked on shelf · add items to see coverage",
      cost: "~$50–120",
      impact: "+20–35 pts",
      category: "Food"
    });
  } else if (dailyCal > 0 && scores.foodDays < 14) {
    actions.push({
      priority: "high",
      title: "Expand food to 14-day supply",
      why: `${scores.foodDays.toFixed(1)}d of calories tracked · target 14d+`,
      cost: "~$80–160",
      impact: "+10–20 pts",
      category: "Food"
    });
  }
  if (scores.shelfFoodCal === 0 && h.cal === 0) {
    actions.push({
      priority: "urgent",
      title: "Add food items to your shelf",
      why: "No food tracked — score cannot calculate coverage days",
      cost: "free to track",
      impact: "unlocks food score",
      category: "Food"
    });
  }
  if (h.infant) {
    actions.push({
      priority: "urgent",
      title: "Stock infant formula / baby food",
      why: "Infant flagged — specialty supply critical",
      cost: "~$40–80",
      impact: "safety critical",
      category: "Food"
    });
  }
  if (sp.batteryPackCount === 0 && h.batt === 0) {
    actions.push({
      priority: "urgent",
      title: "Buy 1 portable battery bank",
      why: "No backup power detected on shelf or household",
      cost: "~$25–35",
      impact: "+18 pts",
      category: "Power"
    });
  } else if (sp.batteryPackCount < 2 && h.batt < 2) {
    actions.push({
      priority: "high",
      title: "Add a second battery bank",
      why: "More capacity = more coverage days",
      cost: "~$25–35",
      impact: "+18 pts",
      category: "Power"
    });
  }
  if (sp.generatorFuelExpired) {
    actions.push({
      priority: "urgent",
      title: "Replace expired generator fuel",
      why: "Generator fuel on shelf is expired · generator is currently non-functional",
      cost: "varies by fuel type",
      impact: "+15 pts",
      category: "Power"
    });
  }
  if (sp.hasGenerator && !sp.generatorFuelValid && !sp.generatorFuelExpired) {
    actions.push({
      priority: "high",
      title: "Add generator fuel to your shelf",
      why: "Generator detected but no fuel tracked — log fuel with expiry date",
      cost: "varies",
      impact: "+15 pts",
      category: "Power"
    });
  }
  if (!sp.hasSolar) {
    actions.push({
      priority: "med",
      title: "Add portable solar (Goal Zero or similar)",
      why: "Infinite fuel source · complements generator and battery packs",
      cost: "~$50–300",
      impact: "+20 pts",
      category: "Power"
    });
  }
  if (!sp.hasGenerator && !h.gen && sp.batteryPackCount >= 2) {
    actions.push({
      priority: "med",
      title: "Consider a generator",
      why: "Battery banks cover phones — generator covers appliances and fuel storage",
      cost: "~$150–800",
      impact: "+25 pts",
      category: "Power"
    });
  }
  if (sm.kitCount === 0 && !h.fak) {
    actions.push({
      priority: "urgent",
      title: "Stock a first aid kit",
      why: "No kit detected on shelf or household — medical score critically low",
      cost: "~$25–60",
      impact: "+40 pts",
      category: "Medical"
    });
  }
  if (sm.expiredMedCount > 0) {
    actions.push({
      priority: "urgent",
      title: `Replace ${sm.expiredMedCount} expired medical item${sm.expiredMedCount > 1 ? "s" : ""}`,
      why: "Expired medical supplies detected on shelf",
      cost: "varies",
      impact: "+5–15 pts",
      category: "Medical"
    });
  }
  if (h.rx && !h.rxs && sm.rxCount === 0) {
    actions.push({
      priority: "urgent",
      title: "Get 30-day prescription supply",
      why: "Prescriptions flagged but no backup supply on hand or shelf",
      cost: "varies",
      impact: "+20 pts",
      category: "Medical"
    });
  }
  if (sm.supplementCount === 0) {
    actions.push({
      priority: "med",
      title: "Add vitamins and supplements to shelf",
      why: "No supplements tracked — immune support and wellness gaps",
      cost: "~$30–80",
      impact: "+10–15 pts",
      category: "Medical"
    });
  }
  if (h.mob) {
    actions.push({
      priority: "high",
      title: "Plan bug-out route for mobility needs",
      why: "Mobility limitation — evacuation planning critical",
      cost: "free",
      impact: "safety critical",
      category: "Medical"
    });
  }
  const expired = items.filter(
    (i) => !i.depleted && i.category !== "Medical" && // medical handled above
    getExpiryStatus(i.expiry, i.expiryType) === "expired"
  );
  if (expired.length > 0) {
    actions.push({
      priority: "urgent",
      title: `Replace ${expired.length} expired item${expired.length > 1 ? "s" : ""}`,
      why: expired.slice(0, 3).map((i) => i.name).join(", ") + (expired.length > 3 ? "…" : ""),
      cost: "varies",
      impact: "restore score",
      category: "Shelf"
    });
  }
  return actions;
}
function exportCSV(items) {
  const header = "id,name,category,qty,unit,price,calories,expiry,expiryType,location,notes,depleted,created";
  const rows = items.map(
    (i) => [
      i.id,
      csvEsc(i.name),
      i.category,
      i.qty,
      i.unit,
      i.price ?? "",
      i.calories ?? "",
      i.expiry ?? "",
      i.expiryType ?? "",
      csvEsc(i.location),
      csvEsc(i.notes),
      i.depleted ? "1" : "0",
      i.created
    ].join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gravpack-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  saveLastBackup((/* @__PURE__ */ new Date()).toLocaleDateString());
}
function csvEsc(s) {
  if (!s) return "";
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const vals = splitCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = (vals[i] || "").trim();
    });
    return {
      id: obj.id || Date.now().toString(),
      name: obj.name || "",
      category: obj.category || "Food",
      qty: parseFloat(obj.qty) || 0,
      unit: obj.unit || "units",
      price: obj.price ? parseFloat(obj.price) : null,
      calories: obj.calories ? parseFloat(obj.calories) : null,
      expiry: obj.expiry || null,
      expiryType: obj.expiryType || void 0,
      location: obj.location || "",
      notes: obj.notes || "",
      depleted: obj.depleted === "1",
      created: obj.created || (/* @__PURE__ */ new Date()).toISOString(),
      priceHistory: [],
      consumeLog: []
    };
  });
}
function splitCSVLine(line) {
  const result = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && !inQ) inQ = true;
    else if (c === '"' && inQ) {
      if (line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = false;
    } else if (c === "," && !inQ) {
      result.push(cur);
      cur = "";
    } else cur += c;
  }
  result.push(cur);
  return result;
}
function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function toTitleCase(s) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
function ExpiryBadge({
  expiry,
  depleted,
  expiryType
}) {
  if (depleted) return /* @__PURE__ */ jsx("span", { className: "badge-depleted", children: "DEPLETED" });
  const status = getExpiryStatus(expiry, expiryType);
  const text = getExpiryBadgeText(expiry, expiryType);
  const cls = `badge badge-${status === "noexp" ? "accent" : status}`;
  return /* @__PURE__ */ jsx("span", { className: cls, children: text });
}
function ItemCard({
  item,
  onClick,
  deleting
}) {
  return /* @__PURE__ */ jsxs("div", { className: `item-card${deleting ? " deleting" : ""}`, onClick, children: [
    /* @__PURE__ */ jsxs("div", { className: "item-left", children: [
      /* @__PURE__ */ jsx("div", { className: "item-name", children: item.name }),
      /* @__PURE__ */ jsxs("div", { className: "item-meta", children: [
        item.location && `${item.location} · `,
        item.qty,
        " ",
        item.unit,
        item.category && /* @__PURE__ */ jsxs(Fragment, { children: [
          " · ",
          /* @__PURE__ */ jsx("span", { className: "material-icons", style: {
            fontSize: 15,
            verticalAlign: "middle"
          }, children: CAT_EMOJI[item.category] }),
          " ",
          item.category
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx(ExpiryBadge, { expiry: item.expiry, depleted: item.depleted, expiryType: item.expiryType })
  ] });
}
function ValueBreakdownModal({
  items,
  onClose
}) {
  const activeItems = items.filter((i) => !i.depleted && i.price && i.qty);
  const total = activeItems.reduce((s, i) => s + i.price * i.qty, 0);
  const byCategory = CATEGORIES.map((cat) => {
    const catItems = activeItems.filter((i) => i.category === cat);
    const value = catItems.reduce((s, i) => s + i.price * i.qty, 0);
    const count = catItems.length;
    return {
      cat,
      value,
      count
    };
  }).filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  return /* @__PURE__ */ jsx("div", { className: "modal-overlay", onClick: (e) => {
    if (e.target === e.currentTarget) onClose();
  }, children: /* @__PURE__ */ jsxs("div", { className: "modal-sheet", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxs("div", { style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      padding: "12px 16px 0"
    }, children: [
      /* @__PURE__ */ jsx("button", { className: "overflow-btn", style: {
        visibility: "hidden"
      }, children: /* @__PURE__ */ jsx("span", { className: "material-icons", style: {
        fontSize: 22
      }, children: "close" }) }),
      /* @__PURE__ */ jsx("div", { className: "modal-handle", style: {
        position: "absolute",
        left: "50%",
        transform: "translateX(-50%)",
        top: 20
      } }),
      /* @__PURE__ */ jsx("button", { className: "overflow-btn", onClick: onClose, children: /* @__PURE__ */ jsx("span", { className: "material-icons", style: {
        fontSize: 22
      }, children: "close" }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "detail-hero", style: {
      paddingBottom: 8
    }, children: [
      /* @__PURE__ */ jsxs("div", { className: "detail-name", children: [
        "$",
        total.toFixed(0)
      ] }),
      /* @__PURE__ */ jsx("div", { className: "detail-qty", children: "total inventory value" })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: {
      padding: "8px 16px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 10
    }, children: [
      byCategory.map(({
        cat,
        value,
        count
      }) => {
        const pct = total > 0 ? value / total * 100 : 0;
        return /* @__PURE__ */ jsxs("div", { className: "value-breakdown-row", children: [
          /* @__PURE__ */ jsxs("div", { className: "value-breakdown-header", children: [
            /* @__PURE__ */ jsxs("div", { style: {
              display: "flex",
              alignItems: "center",
              gap: 8
            }, children: [
              /* @__PURE__ */ jsx("span", { className: "material-icons", style: {
                fontSize: 18,
                color: "var(--t3)"
              }, children: CAT_EMOJI[cat] }),
              /* @__PURE__ */ jsx("span", { className: "value-breakdown-cat", children: cat }),
              /* @__PURE__ */ jsxs("span", { className: "value-breakdown-count", children: [
                count,
                " item",
                count !== 1 ? "s" : ""
              ] })
            ] }),
            /* @__PURE__ */ jsxs("span", { className: "value-breakdown-val", children: [
              "$",
              value.toFixed(0)
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "value-breakdown-bar-track", children: /* @__PURE__ */ jsx("div", { className: "value-breakdown-bar-fill", style: {
            width: `${pct}%`
          } }) })
        ] }, cat);
      }),
      byCategory.length === 0 && /* @__PURE__ */ jsx("div", { style: {
        textAlign: "center",
        color: "var(--t3)",
        fontFamily: "var(--sans)",
        fontSize: 14,
        padding: "24px 0"
      }, children: "No priced items on shelf" })
    ] })
  ] }) });
}
function ItemsBreakdownModal({
  items,
  onClose
}) {
  const activeItems = items.filter((i) => !i.depleted);
  const total = activeItems.length;
  const byCategory = CATEGORIES.map((cat) => {
    const catItems = activeItems.filter((i) => i.category === cat);
    return {
      cat,
      count: catItems.length,
      totalQty: catItems.reduce((s, i) => s + i.qty, 0)
    };
  }).filter((r) => r.count > 0).sort((a, b) => b.count - a.count);
  return /* @__PURE__ */ jsx("div", { className: "modal-overlay", onClick: (e) => {
    if (e.target === e.currentTarget) onClose();
  }, children: /* @__PURE__ */ jsxs("div", { className: "modal-sheet", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxs("div", { style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      padding: "12px 16px 0"
    }, children: [
      /* @__PURE__ */ jsx("div", { style: {
        width: 36
      } }),
      /* @__PURE__ */ jsx("div", { className: "modal-handle", style: {
        position: "absolute",
        left: "50%",
        transform: "translateX(-50%)",
        top: 20
      } }),
      /* @__PURE__ */ jsx("button", { className: "overflow-btn", onClick: onClose, children: /* @__PURE__ */ jsx("span", { className: "material-icons", style: {
        fontSize: 22
      }, children: "close" }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "detail-hero", style: {
      paddingBottom: 8
    }, children: [
      /* @__PURE__ */ jsxs("div", { className: "detail-name", children: [
        total,
        " items"
      ] }),
      /* @__PURE__ */ jsx("div", { className: "detail-qty", children: "active inventory by category" })
    ] }),
    /* @__PURE__ */ jsx("div", { style: {
      padding: "8px 16px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 10
    }, children: byCategory.map(({
      cat,
      count,
      totalQty
    }) => {
      const pct = total > 0 ? count / total * 100 : 0;
      return /* @__PURE__ */ jsxs("div", { className: "value-breakdown-row", children: [
        /* @__PURE__ */ jsxs("div", { className: "value-breakdown-header", children: [
          /* @__PURE__ */ jsxs("div", { style: {
            display: "flex",
            alignItems: "center",
            gap: 8
          }, children: [
            /* @__PURE__ */ jsx("span", { className: "material-icons", style: {
              fontSize: 18,
              color: "var(--t3)"
            }, children: CAT_EMOJI[cat] }),
            /* @__PURE__ */ jsx("span", { className: "value-breakdown-cat", children: cat }),
            /* @__PURE__ */ jsxs("span", { className: "value-breakdown-count", children: [
              totalQty,
              " units"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("span", { className: "value-breakdown-val", children: [
            count,
            " item",
            count !== 1 ? "s" : ""
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "value-breakdown-bar-track", children: /* @__PURE__ */ jsx("div", { className: "value-breakdown-bar-fill", style: {
          width: `${pct}%`
        } }) })
      ] }, cat);
    }) })
  ] }) });
}
function RestockBreakdownModal({
  items,
  onClose,
  onItemClick
}) {
  const depleted = items.filter((i) => i.depleted);
  const byCategory = CATEGORIES.map((cat) => ({
    cat,
    items: depleted.filter((i) => i.category === cat)
  })).filter((r) => r.items.length > 0);
  return /* @__PURE__ */ jsx("div", { className: "modal-overlay", onClick: (e) => {
    if (e.target === e.currentTarget) onClose();
  }, children: /* @__PURE__ */ jsxs("div", { className: "modal-sheet", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxs("div", { style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      padding: "12px 16px 0"
    }, children: [
      /* @__PURE__ */ jsx("div", { style: {
        width: 36
      } }),
      /* @__PURE__ */ jsx("div", { className: "modal-handle", style: {
        position: "absolute",
        left: "50%",
        transform: "translateX(-50%)",
        top: 20
      } }),
      /* @__PURE__ */ jsx("button", { className: "overflow-btn", onClick: onClose, children: /* @__PURE__ */ jsx("span", { className: "material-icons", style: {
        fontSize: 22
      }, children: "close" }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "detail-hero", style: {
      paddingBottom: 8
    }, children: [
      /* @__PURE__ */ jsxs("div", { className: "detail-name", children: [
        depleted.length,
        " to restock"
      ] }),
      /* @__PURE__ */ jsx("div", { className: "detail-qty", children: "tap an item to restock it" })
    ] }),
    /* @__PURE__ */ jsx("div", { style: {
      padding: "0 0 24px"
    }, children: byCategory.map(({
      cat,
      items: catItems
    }) => /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("div", { className: "section-dot-row", children: [
        /* @__PURE__ */ jsx("span", { className: "material-icons", style: {
          fontSize: 14,
          color: "var(--t3)"
        }, children: CAT_EMOJI[cat] }),
        cat
      ] }),
      catItems.map((item) => /* @__PURE__ */ jsxs("div", { className: "item-card", style: {
        opacity: 0.85
      }, onClick: () => {
        onItemClick(item);
        onClose();
      }, children: [
        /* @__PURE__ */ jsxs("div", { className: "item-left", children: [
          /* @__PURE__ */ jsx("div", { className: "item-name", children: item.name }),
          /* @__PURE__ */ jsxs("div", { className: "item-meta", children: [
            item.location || "—",
            " · ",
            item.unit
          ] })
        ] }),
        /* @__PURE__ */ jsx("span", { className: "badge badge-depleted", children: "Depleted" })
      ] }, item.id))
    ] }, cat)) })
  ] }) });
}
function ShelfScreen({
  items,
  onItemClick,
  onRestock,
  deletingId,
  onShowValueBreakdown,
  onShowRestockBreakdown,
  onGoToExpiring
}) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const filtered = items.filter((i) => {
    if (i.depleted) return false;
    if (catFilter !== "All" && i.category !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return i.name.toLowerCase().includes(q) || i.location.toLowerCase().includes(q);
    }
    return true;
  });
  const depleted = items.filter((i) => i.depleted);
  const expired = filtered.filter((i) => getExpiryStatus(i.expiry, i.expiryType) === "expired");
  const critical = filtered.filter((i) => getExpiryStatus(i.expiry, i.expiryType) === "critical");
  const needsAttn = [...expired, ...critical];
  const good = filtered.filter((i) => !needsAttn.includes(i));
  const totalValue = items.filter((i) => !i.depleted && i.price && i.qty).reduce((s, i) => s + i.price * i.qty, 0);
  const trendItems = items.filter((i) => i.priceHistory.length >= 2);
  const totalItems = items.filter((i) => !i.depleted).length;
  const expiredCount = items.filter((i) => !i.depleted && getExpiryStatus(i.expiry, i.expiryType) === "expired").length;
  const restockCount = depleted.length;
  return /* @__PURE__ */ jsxs("div", { className: "screen", style: {
    display: "block"
  }, children: [
    /* @__PURE__ */ jsxs("div", { className: "screen-header", children: [
      /* @__PURE__ */ jsx("span", { className: "screen-title", children: "SHELF" }),
      /* @__PURE__ */ jsxs("span", { className: "local-badge", children: [
        /* @__PURE__ */ jsx("span", { className: "material-icons", style: {
          fontSize: 8,
          color: "var(--good)",
          verticalAlign: "middle"
        }, children: "circle" }),
        "LOCAL ONLY"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "stats-bar", children: [
      /* @__PURE__ */ jsxs("div", { className: "stat-card", style: {
        cursor: "pointer"
      }, onClick: onShowItemsBreakdown, children: [
        /* @__PURE__ */ jsx("div", { className: "stat-val", children: totalItems }),
        /* @__PURE__ */ jsx("div", { className: "stat-lbl", children: "Items ›" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "stat-card", style: {
        cursor: expiredCount > 0 ? "pointer" : "default"
      }, onClick: expiredCount > 0 ? onGoToExpiring : void 0, children: [
        /* @__PURE__ */ jsx("div", { className: `stat-val${expiredCount > 0 ? " danger" : ""}`, children: expiredCount }),
        /* @__PURE__ */ jsxs("div", { className: "stat-lbl", children: [
          "Expired",
          expiredCount > 0 ? " ›" : ""
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "stat-card", style: {
        cursor: restockCount > 0 ? "pointer" : "default"
      }, onClick: restockCount > 0 ? onShowRestockBreakdown : void 0, children: [
        /* @__PURE__ */ jsx("div", { className: `stat-val${restockCount > 0 ? " danger" : ""}`, children: restockCount }),
        /* @__PURE__ */ jsxs("div", { className: "stat-lbl", children: [
          "Restock",
          restockCount > 0 ? " ›" : ""
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "stat-card", style: {
        cursor: "pointer"
      }, onClick: onShowValueBreakdown, children: [
        /* @__PURE__ */ jsxs("div", { className: "stat-val", children: [
          "$",
          totalValue.toFixed(0)
        ] }),
        /* @__PURE__ */ jsx("div", { className: "stat-lbl", children: "Value ›" })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "search-wrap", children: /* @__PURE__ */ jsxs("div", { className: "search-bar", children: [
      /* @__PURE__ */ jsx("span", { className: "material-icons", style: {
        fontSize: 18,
        color: "var(--t3)"
      }, children: "search" }),
      /* @__PURE__ */ jsx("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search items..." }),
      search && /* @__PURE__ */ jsx("button", { onClick: () => setSearch(""), style: {
        background: "none",
        border: "none",
        color: "var(--t3)",
        cursor: "pointer",
        fontSize: 16,
        lineHeight: 1
      }, children: "×" })
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "filter-pills", children: ["All", ...CATEGORIES].map((c) => /* @__PURE__ */ jsxs("button", { className: `fpill${catFilter === c ? " active" : ""}`, onClick: () => setCatFilter(c), children: [
      c !== "All" && /* @__PURE__ */ jsx("span", { className: "material-icons", style: {
        fontSize: 16,
        verticalAlign: "middle",
        marginRight: 3
      }, children: CAT_EMOJI[c] }),
      c
    ] }, c)) }),
    items.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "empty-state", children: [
      /* @__PURE__ */ jsx("div", { className: "empty-title", children: "SHELF EMPTY" }),
      /* @__PURE__ */ jsxs("div", { className: "empty-sub", children: [
        "Tap + to add your first item.",
        /* @__PURE__ */ jsx("br", {}),
        "Know what you have."
      ] })
    ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      needsAttn.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "section-dot-row", children: [
          /* @__PURE__ */ jsx("div", { className: "dot", style: {
            background: "var(--red)"
          } }),
          "Needs attention"
        ] }),
        needsAttn.map((i) => /* @__PURE__ */ jsx(ItemCard, { item: i, onClick: () => onItemClick(i), deleting: deletingId === i.id }, i.id))
      ] }),
      trendItems.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("div", { className: "section-label", children: "Price trends" }),
        trendItems.map((i) => {
          const first = i.priceHistory[0].price;
          const last = i.priceHistory[i.priceHistory.length - 1].price;
          const pct = (last - first) / first * 100;
          const up = pct > 0;
          return /* @__PURE__ */ jsxs("div", { className: "trend-card", onClick: () => onItemClick(i), children: [
            /* @__PURE__ */ jsxs("div", { className: "trend-left", children: [
              /* @__PURE__ */ jsx("div", { className: "trend-name", children: i.name }),
              /* @__PURE__ */ jsxs("div", { className: "trend-meta", children: [
                i.priceHistory.length,
                " price records"
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "trend-right", children: [
              /* @__PURE__ */ jsxs("div", { className: `trend-pct ${up ? "up" : "down"}`, children: [
                up ? "↑" : "↓",
                Math.abs(pct).toFixed(0),
                "%"
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "trend-prices", children: [
                "$",
                first.toFixed(2),
                " → $",
                last.toFixed(2)
              ] })
            ] })
          ] }, i.id);
        })
      ] }),
      depleted.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "section-dot-row", children: [
          /* @__PURE__ */ jsx("div", { className: "dot", style: {
            background: "var(--yellow)"
          } }),
          "Depleted · restock needed"
        ] }),
        depleted.map((i) => /* @__PURE__ */ jsxs("div", { className: "depleted-card", onClick: () => onItemClick(i), children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("div", { className: "depleted-name", children: i.name }),
            /* @__PURE__ */ jsxs("div", { className: "depleted-meta", children: [
              i.category,
              " · ",
              i.location
            ] })
          ] }),
          /* @__PURE__ */ jsx("button", { className: "restock-btn", onClick: (e) => {
            e.stopPropagation();
            onRestock(i);
          }, children: "Restock" })
        ] }, i.id))
      ] }),
      good.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "section-dot-row", children: [
          /* @__PURE__ */ jsx("div", { className: "dot", style: {
            background: "var(--good)"
          } }),
          "Good standing"
        ] }),
        good.map((i) => /* @__PURE__ */ jsx(ItemCard, { item: i, onClick: () => onItemClick(i), deleting: deletingId === i.id }, i.id))
      ] }),
      depleted.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "section-dot-row", children: [
          /* @__PURE__ */ jsx("div", { className: "dot", style: {
            background: "var(--yellow)"
          } }),
          "Depleted · restock needed"
        ] }),
        depleted.map((i) => /* @__PURE__ */ jsxs("div", { className: "depleted-card", onClick: () => onItemClick(i), children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("div", { className: "depleted-name", children: i.name }),
            /* @__PURE__ */ jsxs("div", { className: "depleted-meta", children: [
              i.category,
              " · ",
              i.location
            ] })
          ] }),
          /* @__PURE__ */ jsx("button", { className: "restock-btn", onClick: (e) => {
            e.stopPropagation();
            onRestock(i);
          }, children: "Restock" })
        ] }, i.id))
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { style: {
      height: 16
    } })
  ] });
}
function ExpiringScreen({
  items,
  onItemClick
}) {
  const active = items.filter((i) => !i.depleted && i.expiry);
  const expired = active.filter((i) => getExpiryStatus(i.expiry, i.expiryType) === "expired");
  const pastBestBy = active.filter((i) => getExpiryStatus(i.expiry, i.expiryType) === "past-best-by");
  const critical = active.filter((i) => getExpiryStatus(i.expiry, i.expiryType) === "critical");
  const warning = active.filter((i) => getExpiryStatus(i.expiry, i.expiryType) === "warning");
  const allClear = expired.length === 0 && critical.length === 0 && warning.length === 0 && pastBestBy.length === 0;
  return /* @__PURE__ */ jsxs("div", { className: "screen", style: {
    display: "block"
  }, children: [
    /* @__PURE__ */ jsx("div", { className: "screen-header", children: /* @__PURE__ */ jsx("span", { className: "screen-title", children: "EXPIRING" }) }),
    allClear ? /* @__PURE__ */ jsxs("div", { className: "empty-state", children: [
      /* @__PURE__ */ jsx("div", { className: "empty-title", children: "ALL CLEAR" }),
      /* @__PURE__ */ jsxs("div", { className: "empty-sub", children: [
        "No items expiring soon.",
        /* @__PURE__ */ jsx("br", {}),
        "Add items with expiry dates to track them."
      ] })
    ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      expired.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "section-dot-row", children: [
          /* @__PURE__ */ jsx("div", { className: "dot", style: {
            background: "var(--red)"
          } }),
          "EXPIRED — replace now"
        ] }),
        expired.map((i) => /* @__PURE__ */ jsx(ItemCard, { item: i, onClick: () => onItemClick(i) }, i.id))
      ] }),
      critical.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "section-dot-row", children: [
          /* @__PURE__ */ jsx("div", { className: "dot", style: {
            background: "var(--orange)"
          } }),
          "CRITICAL — under 30 days"
        ] }),
        critical.map((i) => /* @__PURE__ */ jsx(ItemCard, { item: i, onClick: () => onItemClick(i) }, i.id))
      ] }),
      pastBestBy.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "section-dot-row", children: [
          /* @__PURE__ */ jsx("div", { className: "dot", style: {
            background: "var(--yellow)"
          } }),
          "PAST BEST BY — still usable"
        ] }),
        pastBestBy.map((i) => /* @__PURE__ */ jsx(ItemCard, { item: i, onClick: () => onItemClick(i) }, i.id))
      ] }),
      warning.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "section-dot-row", children: [
          /* @__PURE__ */ jsx("div", { className: "dot", style: {
            background: "var(--yellow)"
          } }),
          "WARNING — under 90 days"
        ] }),
        warning.map((i) => /* @__PURE__ */ jsx(ItemCard, { item: i, onClick: () => onItemClick(i) }, i.id))
      ] })
    ] })
  ] });
}
function ReadinessScreen({
  household,
  items,
  onGoToStrategy,
  onGoToHousehold,
  onGoToSettings
}) {
  const hasHousehold = household.adults + household.kids + household.seniors > 0;
  const scores = calcScores(household, items);
  const covPct = Math.min(scores.coverageDays / 90 * 100, 100);
  const cats = [{
    name: "Water",
    score: scores.water,
    detail: scores.waterDetail
  }, {
    name: "Food",
    score: scores.food,
    detail: scores.foodDetail
  }, {
    name: "Power",
    score: scores.power,
    detail: scores.powerDetail
  }, {
    name: "Medical",
    score: scores.medical,
    detail: scores.medicalDetail
  }];
  return /* @__PURE__ */ jsxs("div", { className: "screen", style: {
    display: "block"
  }, children: [
    /* @__PURE__ */ jsx("div", { className: "screen-header", children: /* @__PURE__ */ jsx("span", { className: "screen-title", children: "READY" }) }),
    !hasHousehold ? /* @__PURE__ */ jsxs("div", { className: "empty-state", children: [
      /* @__PURE__ */ jsx("div", { className: "empty-title", children: "set up household" }),
      /* @__PURE__ */ jsxs("div", { className: "empty-sub", children: [
        "Configure your household to see",
        /* @__PURE__ */ jsx("br", {}),
        "your readiness score."
      ] }),
      /* @__PURE__ */ jsx("button", { className: "btn-primary", style: {
        margin: "20px auto",
        display: "block",
        width: "auto",
        padding: "12px 24px"
      }, onClick: onGoToHousehold, children: "Set up household →" })
    ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs("div", { className: "score-hero", children: [
        /* @__PURE__ */ jsx("div", { className: "score-hero-lbl", children: "Overall readiness score" }),
        /* @__PURE__ */ jsxs("div", { className: "score-big-row", children: [
          /* @__PURE__ */ jsx("div", { className: "score-big", style: {
            color: scoreColor(scores.overall)
          }, children: scores.overall }),
          /* @__PURE__ */ jsxs("div", { className: "score-ctx", children: [
            scores.coverageDays > 0 ? `${scores.coverageDays.toFixed(0)}d coverage` : "—",
            /* @__PURE__ */ jsx("br", {}),
            household.adults + household.kids + household.seniors,
            " people",
            household.dogs + household.cats > 0 ? " + pets" : ""
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "bar-wrap", children: /* @__PURE__ */ jsx("div", { className: "bar-fill", style: {
          width: `${scores.overall}%`,
          background: scoreColor(scores.overall)
        } }) }),
        /* @__PURE__ */ jsx("div", { className: "score-pills", children: cats.map((c) => /* @__PURE__ */ jsxs("button", { className: "score-pill", style: {
          color: scoreColor(c.score)
        }, children: [
          c.name,
          "\n",
          c.score
        ] }, c.name)) })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "section-label", children: "Coverage days" }),
      /* @__PURE__ */ jsxs("div", { className: "days-card", children: [
        /* @__PURE__ */ jsx("div", { className: "days-row", children: /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "days-big", children: scores.coverageDays > 0 ? scores.coverageDays.toFixed(0) : "0" }),
          /* @__PURE__ */ jsx("div", { className: "days-sub", children: "days full coverage · TARGET · 30d" })
        ] }) }),
        /* @__PURE__ */ jsx("div", { className: "cov-track", children: /* @__PURE__ */ jsx("div", { className: "cov-fill", style: {
          width: `${covPct}%`
        } }) }),
        /* @__PURE__ */ jsx("div", { className: "cov-marks", children: ["0", "3d", "7d", "14d", "30d", "90d"].map((m) => /* @__PURE__ */ jsx("div", { className: "cov-mark", children: m }, m)) })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "section-label", children: "Category breakdown" }),
      /* @__PURE__ */ jsx("div", { className: "cat-grid-dash", children: cats.map((c) => /* @__PURE__ */ jsxs("div", { className: "cat-card-dash", children: [
        /* @__PURE__ */ jsx("div", { className: "ccd-name", children: c.name }),
        /* @__PURE__ */ jsx("div", { className: "ccd-score", style: {
          color: scoreColor(c.score)
        }, children: c.score }),
        /* @__PURE__ */ jsx("div", { className: "ccd-bar", children: /* @__PURE__ */ jsx("div", { className: "ccd-fill", style: {
          width: `${c.score}%`,
          background: scoreColor(c.score)
        } }) }),
        /* @__PURE__ */ jsx("div", { className: "ccd-detail", children: c.detail })
      ] }, c.name)) }),
      /* @__PURE__ */ jsx("button", { className: "btn-primary", onClick: onGoToStrategy, children: "See action plan →" }),
      /* @__PURE__ */ jsx("button", { className: "btn-ghost", onClick: onGoToHousehold, children: "Update household →" }),
      /* @__PURE__ */ jsx("button", { className: "btn-ghost", onClick: onGoToSettings, children: "Settings →" })
    ] })
  ] });
}
function HouseholdScreen({
  household,
  onChange
}) {
  function sl(key) {
    return (e) => onChange({
      ...household,
      [key]: Number(e.target.value)
    });
  }
  function tog(key) {
    return () => onChange({
      ...household,
      [key]: !household[key]
    });
  }
  return /* @__PURE__ */ jsxs("div", { className: "screen", style: {
    display: "block"
  }, children: [
    /* @__PURE__ */ jsx("div", { className: "screen-header", children: /* @__PURE__ */ jsx("span", { className: "screen-title", children: "HOUSEHOLD" }) }),
    /* @__PURE__ */ jsx("div", { className: "section-label", children: "People" }),
    /* @__PURE__ */ jsx("div", { className: "card", children: [["adults", "Adults", "2,000 cal/day", 0, 8], ["kids", "Children", "1,400 cal/day", 0, 6], ["seniors", "Seniors", "1,600 cal/day", 0, 4]].map(([k, l, s, mn, mx]) => /* @__PURE__ */ jsxs("div", { className: "sl-row", children: [
      /* @__PURE__ */ jsxs("div", { className: "sl-lbl", children: [
        l,
        /* @__PURE__ */ jsx("span", { className: "sl-sub", children: s })
      ] }),
      /* @__PURE__ */ jsx("input", { type: "range", className: "sl", min: mn, max: mx, value: household[k], onChange: sl(k) }),
      /* @__PURE__ */ jsx("div", { className: "slv", children: household[k] })
    ] }, k)) }),
    /* @__PURE__ */ jsx("div", { className: "section-label", children: "Pets" }),
    /* @__PURE__ */ jsx("div", { className: "card", children: [["dogs", "Dogs", "+1 gal/day each", 0, 4], ["cats", "Cats", "+0.3 gal/day each", 0, 4]].map(([k, l, s, mn, mx]) => /* @__PURE__ */ jsxs("div", { className: "sl-row", children: [
      /* @__PURE__ */ jsxs("div", { className: "sl-lbl", children: [
        l,
        /* @__PURE__ */ jsx("span", { className: "sl-sub", children: s })
      ] }),
      /* @__PURE__ */ jsx("input", { type: "range", className: "sl", min: mn, max: mx, value: household[k], onChange: sl(k) }),
      /* @__PURE__ */ jsx("div", { className: "slv", children: household[k] })
    ] }, k)) }),
    /* @__PURE__ */ jsx("div", { className: "section-label", children: "Water — commercial storage" }),
    /* @__PURE__ */ jsx("div", { className: "card", children: /* @__PURE__ */ jsxs("div", { className: "sl-row", children: [
      /* @__PURE__ */ jsxs("div", { className: "sl-lbl", children: [
        "Bottled cases",
        /* @__PURE__ */ jsx("span", { className: "sl-sub", children: "~6 gal / 24-pack · use as-is" })
      ] }),
      /* @__PURE__ */ jsx("input", { type: "range", className: "sl", min: 0, max: 20, value: household.bottled, onChange: sl("bottled") }),
      /* @__PURE__ */ jsx("div", { className: "slv", children: household.bottled })
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "section-label", children: "Water — personal storage" }),
    /* @__PURE__ */ jsxs("div", { className: "card", children: [
      /* @__PURE__ */ jsxs("div", { className: "sl-row", children: [
        /* @__PURE__ */ jsxs("div", { className: "sl-lbl", children: [
          "6-gal cans",
          /* @__PURE__ */ jsx("span", { className: "sl-sub", children: "Walmart / Amazon · fill at home" })
        ] }),
        /* @__PURE__ */ jsx("input", { type: "range", className: "sl", min: 0, max: 20, value: household.cans, onChange: sl("cans") }),
        /* @__PURE__ */ jsx("div", { className: "slv", children: household.cans })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "tog-row", children: [
        /* @__PURE__ */ jsxs("div", { className: "tog-lbl", children: [
          "WaterBOB",
          /* @__PURE__ */ jsx("span", { className: "tog-sub", children: "~100 gal · bathtub bag · ~$30" })
        ] }),
        /* @__PURE__ */ jsx("button", { className: `tog${household.bob ? " on" : ""}`, onClick: tog("bob"), children: /* @__PURE__ */ jsx("div", { className: "tok" }) })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "section-label", children: "Water — treatment" }),
    /* @__PURE__ */ jsx("div", { className: "card", children: [["tabs", "Purification tabs", "Aquatabs ~$8 · minimum treatment"], ["sawyer", "Sawyer filter", "~$25 · tap / stream / can rotation"], ["lifestraw", "Lifestraw", "~$20 · personal point-of-use filter"]].map(([k, l, s]) => /* @__PURE__ */ jsxs("div", { className: "tog-row", children: [
      /* @__PURE__ */ jsxs("div", { className: "tog-lbl", children: [
        l,
        /* @__PURE__ */ jsx("span", { className: "tog-sub", children: s })
      ] }),
      /* @__PURE__ */ jsx("button", { className: `tog${household[k] ? " on" : ""}`, onClick: tog(k), children: /* @__PURE__ */ jsx("div", { className: "tok" }) })
    ] }, k)) }),
    /* @__PURE__ */ jsx("div", { className: "section-label", children: "Water — mobile / bug-out" }),
    /* @__PURE__ */ jsx("div", { className: "card", children: /* @__PURE__ */ jsxs("div", { className: "tog-row", children: [
      /* @__PURE__ */ jsxs("div", { className: "tog-lbl", children: [
        "Jerrycan w/ filter",
        /* @__PURE__ */ jsx("span", { className: "tog-sub", children: "~$299 · road filtration built in" })
      ] }),
      /* @__PURE__ */ jsx("button", { className: `tog${household.jerry ? " on" : ""}`, onClick: tog("jerry"), children: /* @__PURE__ */ jsx("div", { className: "tok" }) })
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "section-label", children: "Food supply" }),
    /* @__PURE__ */ jsxs("div", { className: "card", children: [
      /* @__PURE__ */ jsxs("div", { className: "sl-row", children: [
        /* @__PURE__ */ jsxs("div", { className: "sl-lbl", children: [
          "Stored cal/day",
          /* @__PURE__ */ jsx("span", { className: "sl-sub", children: "Manual override · shelf auto-calculates" })
        ] }),
        /* @__PURE__ */ jsx("input", { type: "range", className: "sl", min: 0, max: 6e3, step: 100, value: household.cal, onChange: sl("cal") }),
        /* @__PURE__ */ jsx("div", { className: "slv", children: household.cal > 0 ? `${(household.cal / 1e3).toFixed(1)}k` : "0" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "tog-row", children: [
        /* @__PURE__ */ jsxs("div", { className: "tog-lbl", children: [
          "Vegetarian / vegan",
          /* @__PURE__ */ jsx("span", { className: "tog-sub", children: "Adjusts protein scoring" })
        ] }),
        /* @__PURE__ */ jsx("button", { className: `tog${household.veg ? " on" : ""}`, onClick: tog("veg"), children: /* @__PURE__ */ jsx("div", { className: "tok" }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "tog-row", children: [
        /* @__PURE__ */ jsxs("div", { className: "tog-lbl", children: [
          "Infant in household",
          /* @__PURE__ */ jsx("span", { className: "tog-sub", children: "Formula tracked separately" })
        ] }),
        /* @__PURE__ */ jsx("button", { className: `tog${household.infant ? " on" : ""}`, onClick: tog("infant"), children: /* @__PURE__ */ jsx("div", { className: "tok" }) })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "section-label", children: "Power" }),
    /* @__PURE__ */ jsx("div", { style: {
      padding: "0 16px 8px",
      fontFamily: "var(--mono)",
      fontSize: 11,
      color: "var(--t3)",
      lineHeight: 1.5
    }, children: "Add generators, fuel, solar, and battery packs to your shelf for automatic detection." }),
    /* @__PURE__ */ jsxs("div", { className: "card", children: [
      /* @__PURE__ */ jsxs("div", { className: "sl-row", children: [
        /* @__PURE__ */ jsxs("div", { className: "sl-lbl", children: [
          "Battery packs",
          /* @__PURE__ */ jsx("span", { className: "sl-sub", children: "Manual override · shelf auto-detects" })
        ] }),
        /* @__PURE__ */ jsx("input", { type: "range", className: "sl", min: 0, max: 5, value: household.batt, onChange: sl("batt") }),
        /* @__PURE__ */ jsx("div", { className: "slv", children: household.batt })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "tog-row", children: [
        /* @__PURE__ */ jsxs("div", { className: "tog-lbl", children: [
          "Generator",
          /* @__PURE__ */ jsx("span", { className: "tog-sub", children: "Manual override · shelf auto-detects" })
        ] }),
        /* @__PURE__ */ jsx("button", { className: `tog${household.gen ? " on" : ""}`, onClick: tog("gen"), children: /* @__PURE__ */ jsx("div", { className: "tok" }) })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "section-label", children: "Medical" }),
    /* @__PURE__ */ jsx("div", { style: {
      padding: "0 16px 8px",
      fontFamily: "var(--mono)",
      fontSize: 11,
      color: "var(--t3)",
      lineHeight: 1.5
    }, children: "Add first aid kits, medications, and supplements to your shelf for automatic detection." }),
    /* @__PURE__ */ jsx("div", { className: "card", children: [["fak", "First aid kit (stocked)", "Manual override · shelf auto-detects"], ["rx", "Prescriptions in household", "Flags 30-day supply gap"], ["rxs", "30-day rx supply ready", "All household members covered"], ["mob", "Mobility limitations", "Affects bug-out planning"]].map(([k, l, s]) => /* @__PURE__ */ jsxs("div", { className: "tog-row", children: [
      /* @__PURE__ */ jsxs("div", { className: "tog-lbl", children: [
        l,
        /* @__PURE__ */ jsx("span", { className: "tog-sub", children: s })
      ] }),
      /* @__PURE__ */ jsx("button", { className: `tog${household[k] ? " on" : ""}`, onClick: tog(k), children: /* @__PURE__ */ jsx("div", { className: "tok" }) })
    ] }, k)) }),
    /* @__PURE__ */ jsx("div", { style: {
      height: 8
    } })
  ] });
}
function StrategyScreen({
  household,
  items,
  onBack
}) {
  const scores = calcScores(household, items);
  const actions = buildStrategy(household, items);
  const urgent = actions.filter((a) => a.priority === "urgent");
  const high = actions.filter((a) => a.priority === "high");
  const med = actions.filter((a) => a.priority === "med");
  const potentialGain = Math.min(100 - scores.overall, actions.length * 8);
  return /* @__PURE__ */ jsxs("div", { className: "screen", style: {
    display: "block"
  }, children: [
    /* @__PURE__ */ jsxs("div", { className: "screen-header", children: [
      /* @__PURE__ */ jsx("span", { className: "screen-title", children: "STRATEGY" }),
      /* @__PURE__ */ jsx("button", { className: "back-btn", onClick: onBack, children: "← Readiness" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "strat-hero", children: [
      /* @__PURE__ */ jsxs("div", { className: "strat-hero-row", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "strat-score-lbl", children: "Current score" }),
          /* @__PURE__ */ jsx("div", { className: "strat-big", style: {
            color: scoreColor(scores.overall)
          }, children: scores.overall })
        ] }),
        potentialGain > 0 && /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "strat-score-lbl", children: "Potential gain" }),
          /* @__PURE__ */ jsxs("div", { className: "strat-big", style: {
            color: "var(--good)"
          }, children: [
            "+",
            potentialGain
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "bar-wrap", children: /* @__PURE__ */ jsx("div", { className: "bar-fill", style: {
        width: `${scores.overall}%`,
        background: scoreColor(scores.overall)
      } }) }),
      /* @__PURE__ */ jsx("div", { className: "strat-hint", children: "Ranked by score impact. Reads directly from your shelf." })
    ] }),
    actions.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "empty-state", children: [
      /* @__PURE__ */ jsx("div", { className: "empty-title", children: "None — clear." }),
      /* @__PURE__ */ jsx("div", { className: "empty-sub", children: "No actions needed based on your current setup." })
    ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      urgent.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "section-dot-row", children: [
          /* @__PURE__ */ jsx("div", { className: "dot", style: {
            background: "var(--red)"
          } }),
          "Critical gaps"
        ] }),
        urgent.map((a, i) => /* @__PURE__ */ jsx(StratItem, { action: a, rank: i + 1 }, i))
      ] }),
      high.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "section-dot-row", children: [
          /* @__PURE__ */ jsx("div", { className: "dot", style: {
            background: "var(--orange)"
          } }),
          "High impact"
        ] }),
        high.map((a, i) => /* @__PURE__ */ jsx(StratItem, { action: a, rank: urgent.length + i + 1 }, i))
      ] }),
      med.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "section-dot-row", children: [
          /* @__PURE__ */ jsx("div", { className: "dot", style: {
            background: "var(--yellow)"
          } }),
          "Nice to have"
        ] }),
        med.map((a, i) => /* @__PURE__ */ jsx(StratItem, { action: a, rank: urgent.length + high.length + i + 1 }, i))
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { style: {
      height: 8
    } })
  ] });
}
function StratItem({
  action,
  rank
}) {
  const cls = `strat-item ${action.priority === "urgent" ? "urgent" : action.priority === "high" ? "high" : "med"}`;
  const rankColor = action.priority === "urgent" ? "var(--red)" : action.priority === "high" ? "var(--orange)" : "var(--yellow)";
  return /* @__PURE__ */ jsxs("div", { className: cls, children: [
    /* @__PURE__ */ jsx("div", { className: "strat-rank", style: {
      color: rankColor
    }, children: rank }),
    /* @__PURE__ */ jsxs("div", { className: "strat-body", children: [
      /* @__PURE__ */ jsx("div", { className: "strat-title", children: action.title }),
      /* @__PURE__ */ jsx("div", { className: "strat-why", children: action.why }),
      /* @__PURE__ */ jsxs("div", { className: "strat-tags", children: [
        /* @__PURE__ */ jsx("span", { className: "strat-tag", style: {
          background: "var(--accent)15",
          color: "var(--accent)",
          border: "1px solid var(--accent)30"
        }, children: action.cost }),
        /* @__PURE__ */ jsx("span", { className: "strat-tag", style: {
          background: "#22c55e15",
          color: "var(--good)",
          border: "1px solid #22c55e30"
        }, children: action.impact }),
        /* @__PURE__ */ jsx("span", { className: "strat-tag", style: {
          background: "var(--bg)",
          color: "var(--t3)",
          border: "1px solid var(--bdr)"
        }, children: action.category })
      ] })
    ] })
  ] });
}
function SettingsScreen({
  items,
  displayName,
  theme,
  accentColor,
  onThemeChange,
  onAccentChange,
  onDisplayNameChange,
  onClearAll,
  onImport
}) {
  const [storageSize, setStorageSize] = useState("—");
  const [lastBackup, setLastBackup] = useState(loadLastBackup());
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef(null);
  useEffect(() => {
    setStorageSize(getStorageSize());
  }, [items]);
  function handleExport() {
    exportCSV(items);
    setLastBackup((/* @__PURE__ */ new Date()).toLocaleDateString());
  }
  function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      const parsed = parseCSV(text);
      const merged = [...items];
      for (const p of parsed) {
        const idx = merged.findIndex((i) => i.id === p.id);
        if (idx >= 0) merged[idx] = {
          ...merged[idx],
          ...p
        };
        else merged.push({
          ...p,
          id: newId(),
          priceHistory: [],
          consumeLog: [],
          created: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      onImport(merged);
    };
    reader.readAsText(file);
    e.target.value = "";
  }
  function doClear() {
    onClearAll();
    setConfirmClear(false);
  }
  return /* @__PURE__ */ jsxs("div", { className: "screen", style: {
    display: "block"
  }, children: [
    /* @__PURE__ */ jsx("div", { className: "screen-header", children: /* @__PURE__ */ jsx("span", { className: "screen-title", children: "SETTINGS" }) }),
    /* @__PURE__ */ jsx("div", { className: "section-label", children: "Appearance" }),
    /* @__PURE__ */ jsx("div", { className: "theme-grid", children: [["system", "contrast", "System"], ["dark", "dark_mode", "Dark"], ["light", "light_mode", "Light"]].map(([val, icon, label]) => /* @__PURE__ */ jsxs("button", { className: `theme-btn${theme === val ? " selected" : ""}`, onClick: () => onThemeChange(val), children: [
      /* @__PURE__ */ jsx("span", { className: "material-icons theme-icon", children: icon }),
      /* @__PURE__ */ jsx("span", { children: label })
    ] }, val)) }),
    /* @__PURE__ */ jsx("div", { className: "section-label", children: "Brand color" }),
    /* @__PURE__ */ jsx("div", { className: "accent-grid", children: ACCENT_OPTIONS.map((option) => /* @__PURE__ */ jsx("button", { className: `accent-swatch${accentColor === option.value ? " selected" : ""}`, style: {
      background: option.value
    }, onClick: () => onAccentChange(option), "aria-label": option.name, children: accentColor === option.value && /* @__PURE__ */ jsx("span", { className: "material-icons", style: {
      fontSize: 18,
      color: "#fff"
    }, children: "check" }) }, option.value)) }),
    /* @__PURE__ */ jsx("div", { className: "accent-label", children: ACCENT_OPTIONS.find((o) => o.value === accentColor)?.name ?? "Signal Red" }),
    /* @__PURE__ */ jsx("div", { className: "section-label", children: "Account" }),
    /* @__PURE__ */ jsxs("div", { className: "card", children: [
      /* @__PURE__ */ jsxs("div", { className: "detail-row", style: {
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 8
      }, children: [
        /* @__PURE__ */ jsx("div", { className: "dr-label", children: "Display name" }),
        /* @__PURE__ */ jsx("input", { className: "field-input", value: displayName, onChange: (e) => onDisplayNameChange(e.target.value), placeholder: "Your name", style: {
          marginBottom: 0
        } })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "set-row", children: [
        /* @__PURE__ */ jsx("span", { className: "set-label", children: "Account type" }),
        /* @__PURE__ */ jsx("span", { className: "badge badge-accent", children: "FREE BETA" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "set-row", children: /* @__PURE__ */ jsx("span", { style: {
        fontFamily: "var(--mono)",
        fontSize: 11,
        color: "var(--t3)",
        lineHeight: 1.5
      }, children: "Local account · no sign-in required" }) })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "section-label", children: "App" }),
    /* @__PURE__ */ jsx("div", { className: "card", children: [["Version", "1.0.0 PWA"], ["Storage", storageSize], ["Items", items.length.toString()], ["Data model", "localStorage"]].map(([l, v]) => /* @__PURE__ */ jsxs("div", { className: "set-row", children: [
      /* @__PURE__ */ jsx("span", { className: "set-label", children: l }),
      /* @__PURE__ */ jsx("span", { className: "set-val", children: v })
    ] }, l)) }),
    /* @__PURE__ */ jsx("div", { className: "section-label", children: "Data management" }),
    /* @__PURE__ */ jsxs("div", { style: {
      padding: "4px 20px 8px",
      fontFamily: "var(--mono)",
      fontSize: 11,
      color: "var(--t3)"
    }, children: [
      "Last backup · ",
      lastBackup || "Never",
      " · Recommendation: Weekly or after restocking"
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "backup-row", children: [
      /* @__PURE__ */ jsxs("button", { className: "backup-btn backup-export", onClick: handleExport, children: [
        /* @__PURE__ */ jsx("span", { className: "material-icons", style: {
          fontSize: 18,
          verticalAlign: "middle",
          marginRight: 4
        }, children: "download" }),
        "Export CSV"
      ] }),
      /* @__PURE__ */ jsxs("button", { className: "backup-btn backup-import", onClick: () => fileRef.current?.click(), children: [
        /* @__PURE__ */ jsx("span", { className: "material-icons", style: {
          fontSize: 18,
          verticalAlign: "middle",
          marginRight: 4
        }, children: "upload" }),
        "Import CSV"
      ] }),
      /* @__PURE__ */ jsx("input", { ref: fileRef, type: "file", accept: ".csv", style: {
        display: "none"
      }, onChange: handleImport })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "section-label", style: {
      color: "var(--red)"
    }, children: "Danger zone" }),
    !confirmClear ? /* @__PURE__ */ jsx("button", { className: "btn-ghost", style: {
      color: "var(--red)",
      borderColor: "#ef444430",
      margin: "0 16px 8px"
    }, onClick: () => setConfirmClear(true), children: "Clear all shelf data" }) : /* @__PURE__ */ jsxs("div", { className: "warn-box crit", style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }, children: [
      /* @__PURE__ */ jsx("div", { style: {
        fontFamily: "var(--mono)",
        fontSize: 12,
        color: "var(--red)"
      }, children: "Permanently deletes all items. Cannot be undone." }),
      /* @__PURE__ */ jsxs("div", { style: {
        display: "flex",
        gap: 8
      }, children: [
        /* @__PURE__ */ jsx("button", { style: {
          flex: 1,
          padding: "10px",
          background: "var(--red)",
          border: "none",
          borderRadius: 6,
          color: "#fff",
          cursor: "pointer",
          fontFamily: "var(--sans)",
          fontSize: 13,
          fontWeight: 600
        }, onClick: doClear, children: "Delete all" }),
        /* @__PURE__ */ jsx("button", { style: {
          flex: 1,
          padding: "10px",
          background: "var(--bg)",
          border: "1px solid var(--bdr)",
          borderRadius: 6,
          color: "var(--t2)",
          cursor: "pointer",
          fontFamily: "var(--sans)",
          fontSize: 13
        }, onClick: () => setConfirmClear(false), children: "Cancel" })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "section-label", children: "About" }),
    /* @__PURE__ */ jsx("div", { className: "card", children: [["Product", "GravPack"], ["Built for", "First responders · families"], ["Privacy", "100% local · no tracking"], ["Coming in V2", "Barcode scan · push alerts"]].map(([l, v]) => /* @__PURE__ */ jsxs("div", { className: "set-row", children: [
      /* @__PURE__ */ jsx("span", { className: "set-label", children: l }),
      /* @__PURE__ */ jsx("span", { className: "set-val", children: v })
    ] }, l)) }),
    /* @__PURE__ */ jsx("div", { style: {
      height: 8
    } })
  ] });
}
const BLANK_FORM = {
  name: "",
  category: "Food",
  qty: "",
  unit: "units",
  price: "",
  calories: "",
  expiry: "",
  expiryType: "none",
  location: "",
  notes: ""
};
const EXPIRY_PRESETS = {
  Food: [{
    label: "+3mo",
    months: 3
  }, {
    label: "+1yr",
    months: 12
  }, {
    label: "+2yr",
    months: 24
  }, {
    label: "+3yr",
    months: 36
  }],
  Water: [{
    label: "+1yr",
    months: 12
  }, {
    label: "+2yr",
    months: 24
  }, {
    label: "+5yr",
    months: 60
  }],
  Medical: [{
    label: "+3mo",
    months: 3
  }, {
    label: "+6mo",
    months: 6
  }, {
    label: "+1yr",
    months: 12
  }, {
    label: "+2yr",
    months: 24
  }],
  Power: [{
    label: "+1yr",
    months: 12
  }, {
    label: "+2yr",
    months: 24
  }, {
    label: "+5yr",
    months: 60
  }],
  Tools: [{
    label: "+1yr",
    months: 12
  }, {
    label: "+2yr",
    months: 24
  }, {
    label: "+5yr",
    months: 60
  }],
  Docs: [{
    label: "+1yr",
    months: 12
  }, {
    label: "+5yr",
    months: 60
  }, {
    label: "+10yr",
    months: 120
  }]
};
function addMonths(months) {
  const d = /* @__PURE__ */ new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}
function mapOFFCategory(tags) {
  const t = tags.join(" ").toLowerCase();
  if (/water|eau|agua/.test(t)) return "Water";
  if (/medication|drug|medicine|supplement|vitamin|pharmacy/.test(t)) return "Medical";
  return "Food";
}
function parseOFFPackaging(packaging, packagingTags) {
  const combined = [packaging || "", ...packagingTags || []].join(" ").toLowerCase();
  if (!combined.trim()) return "";
  if (/\bcan(s)?\b/.test(combined)) return "cans";
  if (/\bjar(s)?\b/.test(combined)) return "jars";
  if (/\bpouch(es)?|sachet/.test(combined)) return "pouches";
  if (/\bcarton(s)?|tetra/.test(combined)) return "cartons";
  if (/\bbox(es)?\b/.test(combined)) return "boxes";
  if (/\bbag(s)?\b/.test(combined)) return "bags";
  if (/\bbottle(s)?\b/.test(combined)) return "bottles";
  if (/\bpack(s|age)?\b/.test(combined)) return "packs";
  if (/\btab(let)?s?\b/.test(combined)) return "tabs";
  return "";
}
function parseOFFQuantity(raw) {
  if (!raw) return {
    qty: "",
    unit: ""
  };
  const m = raw.trim().match(/^([\d.]+)\s*([a-zA-Z]+)/);
  if (!m) return {
    qty: "",
    unit: ""
  };
  const num = m[1];
  const rawUnit = m[2].toLowerCase();
  const unitMap = {
    g: "oz",
    kg: "lbs",
    ml: "oz",
    l: "gal",
    lbs: "lbs",
    oz: "oz",
    fl: "oz",
    lb: "lbs"
  };
  return {
    qty: num,
    unit: unitMap[rawUnit] || "units"
  };
}
function BarcodeScanner({
  onScan,
  onClose
}) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const doneRef = useRef(false);
  const [status, setStatus] = useState("scanning");
  const [errorMsg, setErrorMsg] = useState("");
  const [scannedCode, setScannedCode] = useState("");
  function stopScanner() {
    try {
      controlsRef.current?.stop();
    } catch {
    }
  }
  function startScanner() {
    doneRef.current = false;
    const reader = new BrowserMultiFormatReader();
    reader.decodeFromConstraints({
      video: {
        facingMode: {
          ideal: "environment"
        }
      }
    }, videoRef.current, async (result, _err) => {
      if (!result || doneRef.current) return;
      doneRef.current = true;
      stopScanner();
      const code = result.getText();
      setScannedCode(code);
      setStatus("fetching");
      await lookup(code);
    }).then((controls) => {
      controlsRef.current = controls;
    }).catch(() => {
      setErrorMsg("Camera access denied or unavailable");
      setStatus("error");
    });
  }
  useEffect(() => {
    startScanner();
    return stopScanner;
  }, []);
  async function lookup(barcode) {
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await res.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        const name = p.product_name_en || p.product_name || "";
        const category = mapOFFCategory(p.categories_tags || []);
        const {
          qty,
          unit: weightUnit
        } = parseOFFQuantity(p.quantity);
        const packagingUnit = parseOFFPackaging(p.packaging, p.packaging_tags);
        const unit = packagingUnit || weightUnit;
        const brand = p.brands ? p.brands.split(",")[0].trim() : "";
        const n = p.nutriments;
        let calories = "";
        if (n) {
          const kcalPer100g = n["energy-kcal_100g"] ?? n["energy-kcal"] ?? null;
          const grams = p.quantity ? parseFloat(p.quantity) : null;
          if (kcalPer100g != null && grams != null && grams > 0) {
            calories = Math.round(kcalPer100g * grams / 100).toString();
          } else if (kcalPer100g != null) {
            calories = Math.round(kcalPer100g).toString();
          }
        }
        onScan(name ? toTitleCase(name) : "", category, qty, unit, brand, calories);
      } else {
        setErrorMsg("Product not found — enter name manually");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Could not reach product database");
      setStatus("error");
    }
  }
  return /* @__PURE__ */ jsxs("div", { className: "scanner-overlay", children: [
    /* @__PURE__ */ jsx("video", { ref: videoRef, className: "scanner-video", playsInline: true, muted: true, autoPlay: true }),
    status === "scanning" && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("div", { className: "scanner-frame" }),
      /* @__PURE__ */ jsx("div", { className: "scanner-label", children: "Align barcode inside the frame" })
    ] }),
    status === "fetching" && /* @__PURE__ */ jsxs("div", { className: "scanner-lookup-card", children: [
      /* @__PURE__ */ jsx("div", { className: "scanner-spinner" }),
      /* @__PURE__ */ jsx("div", { className: "scanner-lookup-title", children: "Barcode found" }),
      /* @__PURE__ */ jsx("div", { className: "scanner-lookup-code", children: scannedCode }),
      /* @__PURE__ */ jsx("div", { className: "scanner-lookup-sub", children: "Looking up product…" })
    ] }),
    status === "error" && /* @__PURE__ */ jsxs("div", { className: "scanner-lookup-card scanner-error-card", children: [
      /* @__PURE__ */ jsx("div", { className: "scanner-error-icon", children: "✕" }),
      /* @__PURE__ */ jsx("div", { className: "scanner-lookup-title", children: errorMsg }),
      /* @__PURE__ */ jsx("button", { className: "scanner-retry-btn", onClick: () => {
        setScannedCode("");
        setStatus("scanning");
        startScanner();
      }, children: "Try again" })
    ] }),
    /* @__PURE__ */ jsx("button", { className: "scanner-close", onClick: () => {
      stopScanner();
      onClose();
    }, children: "✕ Cancel" })
  ] });
}
function AddItemModal({
  initial,
  onSave,
  onClose
}) {
  const [step, setStep] = useState(0);
  const [showScanner, setShowScanner] = useState(false);
  const [form, setForm] = useState(() => initial ? {
    name: initial.name,
    category: initial.category,
    qty: initial.qty.toString(),
    unit: initial.unit,
    price: initial.price?.toString() || "",
    calories: initial.calories?.toString() || "",
    expiry: initial.expiry || "",
    expiryType: initial.expiry ? initial.expiryType === "best-by" ? "best-by" : "expires" : "none",
    location: initial.location,
    notes: initial.notes
  } : BLANK_FORM);
  function set(k) {
    return (e) => setForm((f) => ({
      ...f,
      [k]: e.target.value
    }));
  }
  function next() {
    if (step === 0 && !form.name.trim()) return;
    if (step < 2) setStep((s) => s + 1);
    else submit();
  }
  function submit() {
    const price = form.price ? parseFloat(form.price) : null;
    const priceHistory = initial?.priceHistory ? [...initial.priceHistory] : [];
    if (price !== null) {
      const last = priceHistory[priceHistory.length - 1];
      if (!last || last.price !== price) {
        priceHistory.push({
          price,
          date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
        });
      }
    }
    onSave({
      ...initial ? {
        id: initial.id,
        priceHistory
      } : {},
      name: form.name.trim(),
      category: form.category,
      qty: parseFloat(form.qty) || 0,
      unit: form.unit,
      price,
      calories: form.calories ? parseFloat(form.calories) : null,
      expiry: form.expiryType !== "none" ? form.expiry || null : null,
      expiryType: form.expiryType !== "none" ? form.expiryType === "best-by" ? "best-by" : "expires" : void 0,
      location: form.location,
      notes: form.notes
    });
  }
  const stepLabels = ["Name & Category", "Quantity & Price", "Location & Notes"];
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    showScanner && /* @__PURE__ */ jsx(BarcodeScanner, { onScan: (name, category, qty, unit, brand, calories) => {
      setForm((f) => ({
        ...f,
        name,
        category,
        ...qty ? {
          qty
        } : {},
        ...unit ? {
          unit
        } : {},
        ...brand ? {
          notes: brand
        } : {},
        ...calories ? {
          calories
        } : {}
      }));
      setShowScanner(false);
    }, onClose: () => setShowScanner(false) }),
    /* @__PURE__ */ jsx("div", { className: "modal-overlay", onClick: (e) => {
      if (e.target === e.currentTarget) onClose();
    }, children: /* @__PURE__ */ jsxs("div", { className: "modal-sheet", onClick: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ jsx("div", { className: "modal-handle" }),
      /* @__PURE__ */ jsx("div", { className: "modal-title", children: initial ? "Edit Item" : "Add Item" }),
      /* @__PURE__ */ jsx("div", { className: "modal-sub", children: stepLabels[step] }),
      /* @__PURE__ */ jsx("div", { className: "steps-bar", children: [0, 1, 2].map((i) => /* @__PURE__ */ jsx("div", { className: `step${i < step ? " done" : i === step ? " active" : ""}` }, i)) }),
      step === 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("button", { className: "scan-btn", onClick: () => setShowScanner(true), children: [
          /* @__PURE__ */ jsx("span", { className: "material-icons", style: {
            fontSize: 20,
            verticalAlign: "middle"
          }, children: "qr_code_scanner" }),
          " Scan barcode"
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "field-group", children: [
          /* @__PURE__ */ jsx("div", { className: "field-label", children: "Item name" }),
          /* @__PURE__ */ jsx("input", { className: "field-input", value: form.name, onChange: (e) => setForm((f) => ({
            ...f,
            name: toTitleCase(e.target.value)
          })), placeholder: "e.g. Canned Tuna" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "field-group", children: /* @__PURE__ */ jsx("div", { className: "field-label", children: "Category" }) }),
        /* @__PURE__ */ jsx("div", { className: "cat-grid-form", children: CATEGORIES.map((c) => /* @__PURE__ */ jsxs("button", { className: `cat-btn-form${form.category === c ? " selected" : ""}`, onClick: () => setForm((f) => ({
          ...f,
          category: c
        })), children: [
          /* @__PURE__ */ jsx("span", { className: "material-icons", style: {
            fontSize: 20,
            verticalAlign: "middle"
          }, children: CAT_EMOJI[c] }),
          " ",
          c
        ] }, c)) })
      ] }),
      step === 1 && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "field-group", children: [
          /* @__PURE__ */ jsx("div", { className: "field-label", children: "Quantity" }),
          /* @__PURE__ */ jsxs("div", { className: "field-row", children: [
            /* @__PURE__ */ jsx("input", { className: "field-input", type: "number", min: 0, value: form.qty, onChange: set("qty"), placeholder: "0" }),
            /* @__PURE__ */ jsx("select", { className: "field-input", value: form.unit, onChange: set("unit"), children: UNITS.map((u) => /* @__PURE__ */ jsx("option", { children: u }, u)) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "field-group", children: [
          /* @__PURE__ */ jsx("div", { className: "field-label", children: "Price per unit (optional)" }),
          /* @__PURE__ */ jsx("input", { className: "field-input", type: "number", min: 0, step: 0.01, value: form.price, onChange: set("price"), placeholder: "0.00" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "field-group", children: [
          /* @__PURE__ */ jsx("div", { className: "field-label", children: "Calories per unit (optional)" }),
          /* @__PURE__ */ jsx("input", { className: "field-input", type: "number", min: 0, value: form.calories, onChange: set("calories"), placeholder: "e.g. 350" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "field-group", children: /* @__PURE__ */ jsx("div", { className: "field-label", children: "Date type" }) }),
        /* @__PURE__ */ jsxs("div", { className: "date-type-grid", children: [
          /* @__PURE__ */ jsxs("button", { className: `date-type-btn${form.expiryType === "expires" ? " selected" : ""}`, onClick: () => setForm((f) => ({
            ...f,
            expiryType: "expires"
          })), children: [
            /* @__PURE__ */ jsx("span", { className: "material-icons dt-icon", children: "warning" }),
            /* @__PURE__ */ jsx("span", { children: "Expires" }),
            /* @__PURE__ */ jsx("span", { className: "dt-label", children: "Hard date" })
          ] }),
          /* @__PURE__ */ jsxs("button", { className: `date-type-btn${form.expiryType === "best-by" ? " selected" : ""}`, onClick: () => setForm((f) => ({
            ...f,
            expiryType: "best-by"
          })), children: [
            /* @__PURE__ */ jsx("span", { className: "material-icons dt-icon", children: "calendar_today" }),
            /* @__PURE__ */ jsx("span", { children: "Best By" }),
            /* @__PURE__ */ jsx("span", { className: "dt-label", children: "Quality" })
          ] }),
          /* @__PURE__ */ jsxs("button", { className: `date-type-btn${form.expiryType === "none" ? " selected" : ""}`, onClick: () => setForm((f) => ({
            ...f,
            expiryType: "none",
            expiry: ""
          })), children: [
            /* @__PURE__ */ jsx("span", { className: "material-icons dt-icon", children: "all_inclusive" }),
            /* @__PURE__ */ jsx("span", { children: "No Date" }),
            /* @__PURE__ */ jsx("span", { className: "dt-label", children: "Long life" })
          ] })
        ] }),
        form.expiryType !== "none" && /* @__PURE__ */ jsxs("div", { className: "field-group", children: [
          /* @__PURE__ */ jsx("div", { className: "field-label", children: form.expiryType === "best-by" ? "Best by date" : "Expiration date" }),
          /* @__PURE__ */ jsx("div", { className: "expiry-presets", children: (EXPIRY_PRESETS[form.category] || EXPIRY_PRESETS["Food"]).map((p) => /* @__PURE__ */ jsx("button", { className: `expiry-preset${form.expiry === addMonths(p.months) ? " selected" : ""}`, onClick: () => setForm((f) => ({
            ...f,
            expiry: addMonths(p.months)
          })), children: p.label }, p.label)) }),
          /* @__PURE__ */ jsx("input", { className: "field-input", type: "date", value: form.expiry, onChange: set("expiry") })
        ] })
      ] }),
      step === 2 && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "field-group", children: [
          /* @__PURE__ */ jsx("div", { className: "field-label", children: "Location" }),
          /* @__PURE__ */ jsxs("select", { className: "field-input", value: form.location, onChange: set("location"), children: [
            /* @__PURE__ */ jsx("option", { value: "", children: "Choose location" }),
            LOCATIONS.map((l) => /* @__PURE__ */ jsx("option", { children: l }, l))
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "field-group", children: [
          /* @__PURE__ */ jsx("div", { className: "field-label", children: "Notes (optional)" }),
          /* @__PURE__ */ jsx("textarea", { className: "field-input", value: form.notes, onChange: set("notes"), placeholder: "Any notes...", rows: 3, style: {
            resize: "none"
          } })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "section-label", style: {
          padding: "0 16px 8px"
        }, children: "Review" }),
        /* @__PURE__ */ jsx("div", { className: "detail-rows", style: {
          margin: "0 16px 12px"
        }, children: [["Name", form.name], ["Category", form.category], ["Qty", `${form.qty} ${form.unit}`], ["Price", form.price ? `$${form.price}` : "—"], ...form.calories ? [["Cal / unit", `${Number(form.calories).toLocaleString()} kcal`], ["Total calories", `${(parseFloat(form.calories) * (parseFloat(form.qty) || 1)).toLocaleString()} kcal`]] : [], ["Date type", form.expiryType === "best-by" ? "Best by" : form.expiryType === "expires" ? "Expires" : "No date"], ...form.expiryType !== "none" && form.expiry ? [[form.expiryType === "best-by" ? "Best by" : "Expiry", form.expiry]] : [], ["Location", form.location || "—"]].map(([l, v]) => /* @__PURE__ */ jsxs("div", { className: "detail-row", children: [
          /* @__PURE__ */ jsx("span", { className: "dr-label", children: l }),
          /* @__PURE__ */ jsx("span", { className: "dr-val", children: v })
        ] }, l)) })
      ] }),
      /* @__PURE__ */ jsx("button", { className: "btn-primary", onClick: next, disabled: step === 0 && !form.name.trim(), children: step < 2 ? "Next →" : initial ? "Save changes" : "Add to shelf" }),
      step > 0 && /* @__PURE__ */ jsx("button", { className: "btn-ghost", onClick: () => setStep((s) => s - 1), children: "← Back" }),
      /* @__PURE__ */ jsx("button", { className: "btn-ghost", onClick: onClose, children: "Cancel" })
    ] }) })
  ] });
}
function ConsumeModal({
  item,
  onConfirm,
  onClose
}) {
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  return /* @__PURE__ */ jsx("div", { className: "modal-overlay", onClick: (e) => {
    if (e.target === e.currentTarget) onClose();
  }, children: /* @__PURE__ */ jsxs("div", { className: "consume-sheet", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsx("div", { className: "consume-handle" }),
    /* @__PURE__ */ jsx("div", { className: "consume-title", children: "USE ITEM" }),
    /* @__PURE__ */ jsxs("div", { className: "consume-item-name", children: [
      item.name,
      " · ",
      item.qty,
      " ",
      item.unit,
      " available"
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "consume-qty-row", children: [
      /* @__PURE__ */ jsxs("div", { className: "consume-stepper", children: [
        /* @__PURE__ */ jsx("button", { className: "consume-step-btn", onClick: () => setQty((q) => Math.max(1, q - 1)), children: "−" }),
        /* @__PURE__ */ jsx("div", { className: "consume-step-val", children: qty }),
        /* @__PURE__ */ jsx("button", { className: "consume-step-btn", onClick: () => setQty((q) => Math.min(item.qty, q + 1)), children: "+" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "consume-of", children: [
        "of ",
        item.qty,
        " ",
        item.unit
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "consume-note", children: /* @__PURE__ */ jsx("input", { className: "field-input", value: note, onChange: (e) => setNote(e.target.value), placeholder: "e.g. dinner, camping trip..." }) }),
    /* @__PURE__ */ jsx("button", { className: "btn-primary", onClick: () => onConfirm(qty, note), children: qty >= item.qty ? "Use all — mark depleted" : "Confirm use" }),
    /* @__PURE__ */ jsx("button", { className: "btn-ghost", onClick: onClose, children: "Cancel" })
  ] }) });
}
function ItemDetailModal({
  item,
  onClose,
  onEdit,
  onConsume,
  onDelete,
  onRestock,
  onAdd
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const status = getExpiryStatus(item.expiry, item.expiryType);
  const dateLabel = item.expiryType === "best-by" ? "Best by" : "Expiration";
  let consumeRate = "";
  if (item.consumeLog.length >= 2) {
    const sorted = [...item.consumeLog].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const totalQty = sorted.reduce((s, e) => s + e.qty, 0);
    const days = (new Date(sorted[sorted.length - 1].date).getTime() - new Date(sorted[0].date).getTime()) / 864e5;
    if (days > 0) {
      const rate = totalQty / days;
      const remaining = item.qty / rate;
      consumeRate = `${rate.toFixed(2)} ${item.unit}/day · ~${remaining.toFixed(0)}d remaining`;
    }
  }
  return /* @__PURE__ */ jsx("div", { className: "modal-overlay", onClick: (e) => {
    if (e.target === e.currentTarget) onClose();
  }, children: /* @__PURE__ */ jsxs("div", { className: "modal-sheet", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxs("div", { style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      padding: "12px 16px 0",
      position: "relative"
    }, children: [
      /* @__PURE__ */ jsxs("button", { className: "overflow-btn", onClick: () => setMenuOpen((o) => !o), children: [
        /* @__PURE__ */ jsx("span", { className: "material-icons", style: {
          fontSize: 22
        }, children: "more_vert" }),
        menuOpen && /* @__PURE__ */ jsxs("div", { className: "overflow-menu", style: {
          left: 0,
          right: "auto"
        }, onClick: (e) => e.stopPropagation(), children: [
          /* @__PURE__ */ jsxs("div", { className: "overflow-menu-item", onClick: () => {
            onEdit();
            setMenuOpen(false);
          }, children: [
            /* @__PURE__ */ jsx("span", { className: "material-icons", style: {
              fontSize: 18,
              verticalAlign: "middle",
              marginRight: 6
            }, children: "edit" }),
            "Edit item"
          ] }),
          !item.depleted && /* @__PURE__ */ jsxs("div", { className: "overflow-menu-item", onClick: () => {
            onConsume();
            setMenuOpen(false);
          }, children: [
            /* @__PURE__ */ jsx("span", { className: "material-icons", style: {
              fontSize: 18,
              verticalAlign: "middle",
              marginRight: 6
            }, children: "remove_circle_outline" }),
            "Use item"
          ] }),
          item.depleted && /* @__PURE__ */ jsxs("div", { className: "overflow-menu-item", onClick: () => {
            onRestock();
            setMenuOpen(false);
          }, children: [
            /* @__PURE__ */ jsx("span", { className: "material-icons", style: {
              fontSize: 18,
              verticalAlign: "middle",
              marginRight: 6
            }, children: "refresh" }),
            "Restock"
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "overflow-menu-item danger", onClick: () => {
            onDelete();
            setMenuOpen(false);
          }, children: [
            /* @__PURE__ */ jsx("span", { className: "material-icons", style: {
              fontSize: 18,
              verticalAlign: "middle",
              marginRight: 6
            }, children: "delete_outline" }),
            "Delete"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "modal-handle", style: {
        position: "absolute",
        left: "50%",
        transform: "translateX(-50%)",
        top: 8
      } }),
      /* @__PURE__ */ jsx("button", { className: "overflow-btn", onClick: onClose, children: /* @__PURE__ */ jsx("span", { className: "material-icons", style: {
        fontSize: 22
      }, children: "close" }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "detail-hero", children: [
      /* @__PURE__ */ jsxs("div", { className: "detail-cat", children: [
        /* @__PURE__ */ jsx("span", { className: "material-icons", style: {
          fontSize: 30
        }, children: CAT_EMOJI[item.category] }),
        /* @__PURE__ */ jsx("span", { children: item.category })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "detail-name", children: item.name }),
      /* @__PURE__ */ jsxs("div", { className: "detail-qty", children: [
        item.qty,
        " ",
        item.unit,
        item.location ? ` · ${item.location}` : ""
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: `expiry-hero ${item.depleted ? "noexp" : status}`, children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { className: "expiry-date-label", children: dateLabel }),
        /* @__PURE__ */ jsx("div", { className: `expiry-date-val ${item.depleted ? "noexp" : status}`, children: item.depleted ? "DEPLETED" : item.expiry ? formatDate(item.expiry) : "No expiry date" })
      ] }),
      /* @__PURE__ */ jsx(ExpiryBadge, { expiry: item.expiry, depleted: item.depleted, expiryType: item.expiryType })
    ] }),
    item.calories && /* @__PURE__ */ jsxs("div", { className: "calorie-hero", children: [
      /* @__PURE__ */ jsxs("div", { className: "calorie-hero-block", children: [
        /* @__PURE__ */ jsx("div", { className: "calorie-hero-val", children: (item.calories * item.qty).toLocaleString() }),
        /* @__PURE__ */ jsx("div", { className: "calorie-hero-lbl", children: "total kcal" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "calorie-hero-divider" }),
      /* @__PURE__ */ jsxs("div", { className: "calorie-hero-block", children: [
        /* @__PURE__ */ jsx("div", { className: "calorie-hero-val", children: item.calories.toLocaleString() }),
        /* @__PURE__ */ jsxs("div", { className: "calorie-hero-lbl", children: [
          "kcal / ",
          item.unit.replace(/s$/, "")
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "calorie-hero-divider" }),
      /* @__PURE__ */ jsxs("div", { className: "calorie-hero-block", children: [
        /* @__PURE__ */ jsx("div", { className: "calorie-hero-val", children: item.qty }),
        /* @__PURE__ */ jsx("div", { className: "calorie-hero-lbl", children: item.unit })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "detail-rows", children: [["Location", item.location || "—"], ["Quantity", `${item.qty} ${item.unit}`], ["Price / unit", item.price ? `$${item.price.toFixed(2)}` : "—"], ["Total value", item.price && item.qty ? `$${(item.price * item.qty).toFixed(2)}` : "—"], ...item.calories ? [["Cal / unit", `${item.calories.toLocaleString()} kcal`], ["Total calories", `${(item.calories * item.qty).toLocaleString()} kcal`]] : [], ["Category", item.category], ["Added", formatDate(item.created)], ...item.notes ? [["Notes", item.notes]] : []].map(([l, v]) => /* @__PURE__ */ jsxs("div", { className: "detail-row", children: [
      /* @__PURE__ */ jsx("span", { className: "dr-label", children: l }),
      /* @__PURE__ */ jsx("span", { className: "dr-val", children: v })
    ] }, l)) }),
    !item.depleted && /* @__PURE__ */ jsxs("div", { className: "action-row", children: [
      /* @__PURE__ */ jsx("button", { className: "action-btn", onClick: onAdd, children: "Add item" }),
      /* @__PURE__ */ jsx("button", { className: "action-btn", style: {
        background: "#22c55e15",
        borderColor: "#22c55e30",
        color: "var(--good)"
      }, onClick: onConsume, children: "Use item" })
    ] }),
    item.depleted && /* @__PURE__ */ jsx("button", { className: "btn-primary", onClick: onRestock, children: "Restock item" }),
    item.priceHistory.length >= 2 && /* @__PURE__ */ jsxs("div", { className: "price-history", children: [
      /* @__PURE__ */ jsxs("div", { className: "price-history-head", children: [
        /* @__PURE__ */ jsx("span", { className: "price-history-title", children: "Price history" }),
        /* @__PURE__ */ jsxs("span", { style: {
          fontFamily: "var(--mono)",
          fontSize: 11,
          color: "var(--t3)"
        }, children: [
          item.priceHistory.length,
          " records"
        ] })
      ] }),
      item.priceHistory.map((r, i) => {
        const prev = item.priceHistory[i - 1];
        const delta = prev ? (r.price - prev.price) / prev.price * 100 : 0;
        const cls = i === 0 ? "price-same" : delta > 0 ? "price-up" : delta < 0 ? "price-down" : "price-same";
        return /* @__PURE__ */ jsxs("div", { className: "price-row", children: [
          /* @__PURE__ */ jsx("span", { className: "price-row-date", children: formatDate(r.date) }),
          /* @__PURE__ */ jsxs("span", { className: "price-row-val", children: [
            "$",
            r.price.toFixed(2)
          ] }),
          /* @__PURE__ */ jsx("span", { className: `price-row-delta ${cls}`, children: i === 0 ? "base" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%` })
        ] }, i);
      })
    ] }),
    item.consumeLog.length > 0 && /* @__PURE__ */ jsxs("div", { className: "consume-log", children: [
      /* @__PURE__ */ jsxs("div", { className: "consume-log-head", children: [
        /* @__PURE__ */ jsx("span", { className: "consume-log-title", children: "Consumption log" }),
        /* @__PURE__ */ jsxs("span", { style: {
          fontFamily: "var(--mono)",
          fontSize: 11,
          color: "var(--t3)"
        }, children: [
          item.consumeLog.length,
          " entries"
        ] })
      ] }),
      item.consumeLog.slice(-5).reverse().map((e, i) => /* @__PURE__ */ jsxs("div", { className: "consume-log-row", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "consume-log-date", children: formatDate(e.date) }),
          e.note && /* @__PURE__ */ jsx("div", { className: "consume-log-note", children: e.note })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "consume-log-amt", children: [
          "−",
          e.qty,
          " ",
          e.unit
        ] })
      ] }, i)),
      consumeRate && /* @__PURE__ */ jsx("div", { className: "consume-rate", children: consumeRate })
    ] })
  ] }) });
}
function RestockModal({
  item,
  onSave,
  onClose
}) {
  const [qty, setQty] = useState(item.qty.toString());
  const [price, setPrice] = useState(item.price?.toString() || "");
  return /* @__PURE__ */ jsx("div", { className: "modal-overlay", onClick: (e) => {
    if (e.target === e.currentTarget) onClose();
  }, children: /* @__PURE__ */ jsxs("div", { className: "consume-sheet", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsx("div", { className: "consume-handle" }),
    /* @__PURE__ */ jsx("div", { className: "consume-title", children: "RESTOCK" }),
    /* @__PURE__ */ jsx("div", { className: "consume-item-name", children: item.name }),
    /* @__PURE__ */ jsxs("div", { className: "field-group", children: [
      /* @__PURE__ */ jsx("div", { className: "field-label", children: "New quantity" }),
      /* @__PURE__ */ jsxs("div", { className: "field-row", children: [
        /* @__PURE__ */ jsx("input", { className: "field-input", type: "number", min: 0, value: qty, onChange: (e) => setQty(e.target.value) }),
        /* @__PURE__ */ jsx("div", { className: "field-input", style: {
          display: "flex",
          alignItems: "center",
          color: "var(--t3)"
        }, children: item.unit })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "field-group", children: [
      /* @__PURE__ */ jsx("div", { className: "field-label", children: "New price (optional)" }),
      /* @__PURE__ */ jsx("input", { className: "field-input", type: "number", min: 0, step: 0.01, value: price, onChange: (e) => setPrice(e.target.value), placeholder: "0.00" })
    ] }),
    /* @__PURE__ */ jsx("button", { className: "btn-primary", onClick: () => onSave(parseFloat(qty) || 0, price ? parseFloat(price) : null), children: "Confirm restock" }),
    /* @__PURE__ */ jsx("button", { className: "btn-ghost", onClick: onClose, children: "Cancel" })
  ] }) });
}
function GravPackApp() {
  const [screen, setScreen] = useState("shelf");
  const [items, setItemsState] = useState(loadItems);
  const [household, setHouseholdState] = useState(loadHousehold);
  const [displayName, setDisplayNameState] = useState(loadDisplayName);
  const [theme, setThemeState] = useState(loadTheme);
  const [accentColor, setAccentColorState] = useState(loadAccentColor);
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  useEffect(() => {
    const option = ACCENT_OPTIONS.find((o) => o.value === accentColor) ?? ACCENT_OPTIONS[0];
    applyAccentColor(option.value, option.dark);
  }, [accentColor]);
  const [addModal, setAddModal] = useState({
    open: false
  });
  const [detailItem, setDetailItem] = useState(null);
  const [showValueBreakdown, setShowValueBreakdown] = useState(false);
  const [showRestockBreakdown, setShowRestockBreakdown] = useState(false);
  const [showItemsBreakdown, setShowItemsBreakdown] = useState(false);
  const [consumeItem, setConsumeItem] = useState(null);
  const [restockItem, setRestockItem] = useState(null);
  const setItems = useCallback((items2) => {
    setItemsState(items2);
    saveItems(items2);
  }, []);
  const setHousehold = useCallback((h) => {
    setHouseholdState(h);
    saveHousehold(h);
  }, []);
  const setTheme = useCallback((t) => {
    setThemeState(t);
    saveTheme(t);
    applyTheme(t);
  }, []);
  const setAccentColor = useCallback((option) => {
    setAccentColorState(option.value);
    saveAccentColor(option.value, option.dark);
    applyAccentColor(option.value, option.dark);
  }, []);
  const setDisplayName = useCallback((name) => {
    setDisplayNameState(name);
    saveDisplayName(name);
  }, []);
  function handleSaveItem(data) {
    if (data.id) {
      setItems(items.map((i) => i.id === data.id ? {
        ...i,
        name: data.name,
        category: data.category,
        qty: data.qty,
        unit: data.unit,
        price: data.price,
        calories: data.calories,
        expiry: data.expiry,
        expiryType: data.expiryType,
        location: data.location,
        notes: data.notes,
        priceHistory: data.priceHistory ?? i.priceHistory
      } : i));
    } else {
      const priceHistory = data.price !== null ? [{
        price: data.price,
        date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
      }] : [];
      const item = {
        id: newId(),
        created: (/* @__PURE__ */ new Date()).toISOString(),
        consumeLog: [],
        depleted: false,
        priceHistory,
        ...data,
        price: data.price,
        expiry: data.expiry
      };
      setItems([...items, item]);
    }
    setAddModal({
      open: false
    });
    setDetailItem(null);
  }
  function handleConsume(qty, note) {
    if (!consumeItem) return;
    const depleted = qty >= consumeItem.qty;
    setItems(items.map((i) => i.id === consumeItem.id ? {
      ...i,
      qty: depleted ? 0 : i.qty - qty,
      depleted,
      consumeLog: [...i.consumeLog, {
        qty,
        unit: i.unit,
        date: (/* @__PURE__ */ new Date()).toISOString(),
        note
      }]
    } : i));
    setConsumeItem(null);
    setDetailItem(null);
  }
  function handleRestock(qty, price) {
    if (!restockItem) return;
    const priceHistory = price !== null ? [...restockItem.priceHistory, {
      price,
      date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
    }] : restockItem.priceHistory;
    setItems(items.map((i) => i.id === restockItem.id ? {
      ...i,
      qty,
      price: price ?? i.price,
      depleted: false,
      priceHistory
    } : i));
    setRestockItem(null);
    setDetailItem(null);
  }
  const [deletingId, setDeletingId] = useState(null);
  function handleDelete(item) {
    setDeletingId(item.id);
    setDetailItem(null);
    setTimeout(() => {
      setItems(items.filter((i) => i.id !== item.id));
      setDeletingId(null);
    }, 520);
  }
  const tabs = [{
    id: "shelf",
    label: "Shelf",
    icon: /* @__PURE__ */ jsx(ShelfIcon, {})
  }, {
    id: "expiring",
    label: "Expiring",
    icon: /* @__PURE__ */ jsx(ExpiringIcon, {})
  }, {
    id: "readiness",
    label: "Ready",
    icon: /* @__PURE__ */ jsx(ReadyIcon, {})
  }, {
    id: "household",
    label: "Household",
    icon: /* @__PURE__ */ jsx(HouseIcon, {})
  }, {
    id: "settings",
    label: "Settings",
    icon: /* @__PURE__ */ jsx(SettingsIcon, {})
  }];
  const [showInstallBanner, setShowInstallBanner] = useState(() => {
    try {
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
      return !isStandalone;
    } catch {
      return false;
    }
  });
  const dismissInstallBanner = useCallback(() => {
    setShowInstallBanner(false);
  }, []);
  const hasModal = addModal.open || detailItem !== null || consumeItem !== null || restockItem !== null;
  return /* @__PURE__ */ jsxs("div", { className: "gp-app", children: [
    /* @__PURE__ */ jsxs("div", { className: "status-bar", children: [
      (() => {
        const scores = calcScores(household, items);
        const foodDays = Math.floor(scores.foodDays ?? 0);
        const activeItems = items.filter((i) => !i.depleted).length;
        return /* @__PURE__ */ jsxs("div", { style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 1
        }, children: [
          /* @__PURE__ */ jsx("span", { style: {
            fontFamily: "var(--disp)",
            fontSize: 16,
            fontWeight: 800,
            color: "var(--t3)",
            lineHeight: 1
          }, children: foodDays > 0 ? `${foodDays}d food` : `${activeItems} items` }),
          /* @__PURE__ */ jsx("span", { style: {
            fontFamily: "var(--sans)",
            fontSize: 10,
            color: "var(--t3)",
            textTransform: "uppercase",
            letterSpacing: ".05em"
          }, children: foodDays > 0 ? `${activeItems} items` : "on shelf" })
        ] });
      })(),
      /* @__PURE__ */ jsx("img", { src: "/GravPack-app-logo-white.png", alt: "GravPack", style: {
        height: 40
      } }),
      /* @__PURE__ */ jsxs("span", { style: {
        display: "flex",
        gap: 4
      }, children: [
        /* @__PURE__ */ jsx("span", { className: "material-icons", style: {
          fontSize: 20
        }, children: "bolt" }),
        /* @__PURE__ */ jsx("span", { className: "material-icons", style: {
          fontSize: 20
        }, children: "lock" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "screen-wrap", children: [
      screen === "shelf" && /* @__PURE__ */ jsx(ShelfScreen, { items, onItemClick: (item) => setDetailItem(item), onRestock: (item) => setRestockItem(item), deletingId, onShowValueBreakdown: () => setShowValueBreakdown(true), onShowRestockBreakdown: () => setShowRestockBreakdown(true), onShowItemsBreakdown: () => setShowItemsBreakdown(true), onGoToExpiring: () => setScreen("expiring") }),
      screen === "expiring" && /* @__PURE__ */ jsx(ExpiringScreen, { items, onItemClick: (item) => setDetailItem(item) }),
      screen === "readiness" && /* @__PURE__ */ jsx(ReadinessScreen, { household, items, onGoToStrategy: () => setScreen("strategy"), onGoToHousehold: () => setScreen("household"), onGoToSettings: () => setScreen("settings") }),
      screen === "strategy" && /* @__PURE__ */ jsx(StrategyScreen, { household, items, onBack: () => setScreen("readiness") }),
      screen === "household" && /* @__PURE__ */ jsx(HouseholdScreen, { household, onChange: setHousehold }),
      screen === "settings" && /* @__PURE__ */ jsx(SettingsScreen, { items, displayName, theme, accentColor, onThemeChange: setTheme, onAccentChange: setAccentColor, onDisplayNameChange: setDisplayName, onClearAll: () => setItems([]), onImport: setItems }),
      hasModal && /* @__PURE__ */ jsxs(Fragment, { children: [
        addModal.open && /* @__PURE__ */ jsx(AddItemModal, { initial: addModal.edit, onSave: handleSaveItem, onClose: () => setAddModal({
          open: false
        }) }),
        detailItem && !consumeItem && !restockItem && !addModal.open && /* @__PURE__ */ jsx(ItemDetailModal, { item: detailItem, onClose: () => setDetailItem(null), onEdit: () => setAddModal({
          open: true,
          edit: detailItem
        }), onConsume: () => setConsumeItem(detailItem), onDelete: () => handleDelete(detailItem), onRestock: () => setRestockItem(detailItem), onAdd: () => {
          setDetailItem(null);
          setAddModal({
            open: true
          });
        } }),
        consumeItem && /* @__PURE__ */ jsx(ConsumeModal, { item: consumeItem, onConfirm: handleConsume, onClose: () => setConsumeItem(null) }),
        restockItem && /* @__PURE__ */ jsx(RestockModal, { item: restockItem, onSave: handleRestock, onClose: () => setRestockItem(null) })
      ] })
    ] }),
    showInstallBanner && !hasModal && /* @__PURE__ */ jsx(InstallBanner, { onDismiss: dismissInstallBanner }),
    /* @__PURE__ */ jsx("div", { className: "tab-bar", children: tabs.map((t) => /* @__PURE__ */ jsxs("button", { className: `tab${screen === t.id || screen === "strategy" && t.id === "readiness" ? " on" : ""}`, onClick: () => setScreen(t.id), children: [
      /* @__PURE__ */ jsx("div", { className: "tab-icon", style: {
        color: screen === t.id || screen === "strategy" && t.id === "readiness" ? "var(--accent)" : "var(--t3)"
      }, children: t.icon }),
      /* @__PURE__ */ jsx("div", { className: "tab-label", children: t.label })
    ] }, t.id)) }),
    screen === "shelf" && !hasModal && /* @__PURE__ */ jsx("button", { className: "fab", onClick: () => setAddModal({
      open: true
    }), "aria-label": "Add item", children: /* @__PURE__ */ jsx("span", { className: "material-icons", style: {
      fontSize: 30,
      color: "#0d1117"
    }, children: "add" }) }),
    showValueBreakdown && /* @__PURE__ */ jsx(ValueBreakdownModal, { items, onClose: () => setShowValueBreakdown(false) }),
    showRestockBreakdown && /* @__PURE__ */ jsx(RestockBreakdownModal, { items, onClose: () => setShowRestockBreakdown(false), onItemClick: (item) => {
      setDetailItem(item);
      setShowRestockBreakdown(false);
    } }),
    showItemsBreakdown && /* @__PURE__ */ jsx(ItemsBreakdownModal, { items, onClose: () => setShowItemsBreakdown(false) })
  ] });
}
function InstallBanner({
  onDismiss
}) {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const {
        outcome
      } = await deferredPrompt.userChoice;
      if (outcome === "accepted") onDismiss();
    }
  };
  if (installed) return null;
  return /* @__PURE__ */ jsxs("div", { className: "install-banner", children: [
    /* @__PURE__ */ jsx("div", { className: "install-banner-icon", children: /* @__PURE__ */ jsx("img", { src: "/app-icon-192.png", alt: "GravPack", style: {
      width: 44,
      height: 44,
      borderRadius: 10
    } }) }),
    /* @__PURE__ */ jsxs("div", { className: "install-banner-body", children: [
      /* @__PURE__ */ jsx("div", { className: "install-banner-title", children: "Add to Home Screen" }),
      isIOS ? /* @__PURE__ */ jsxs("div", { className: "install-banner-sub", children: [
        "Tap ",
        /* @__PURE__ */ jsx("span", { className: "material-icons", style: {
          fontSize: 14,
          verticalAlign: "middle",
          margin: "0 2px"
        }, children: "ios_share" }),
        " then ",
        /* @__PURE__ */ jsx("strong", { children: "Add to Home Screen" })
      ] }) : deferredPrompt ? /* @__PURE__ */ jsx("div", { className: "install-banner-sub", children: "Install for offline access — no app store needed" }) : /* @__PURE__ */ jsx("div", { className: "install-banner-sub", children: "Use your browser's install option to add GravPack" })
    ] }),
    !isIOS && deferredPrompt && /* @__PURE__ */ jsx("button", { className: "install-banner-cta", onClick: handleInstall, children: "Install" }),
    /* @__PURE__ */ jsx("button", { className: "install-banner-close", onClick: onDismiss, children: /* @__PURE__ */ jsx("span", { className: "material-icons", style: {
      fontSize: 18
    }, children: "close" }) })
  ] });
}
function ShelfIcon() {
  return /* @__PURE__ */ jsx("span", { className: "material-icons", children: "inventory_2" });
}
function ExpiringIcon() {
  return /* @__PURE__ */ jsx("span", { className: "material-icons", children: "schedule" });
}
function ReadyIcon() {
  return /* @__PURE__ */ jsx("span", { className: "material-icons", children: "verified_user" });
}
function HouseIcon() {
  return /* @__PURE__ */ jsx("span", { className: "material-icons", children: "group" });
}
function SettingsIcon() {
  return /* @__PURE__ */ jsx("span", { className: "material-icons", children: "settings" });
}
export {
  GravPackApp as component
};
