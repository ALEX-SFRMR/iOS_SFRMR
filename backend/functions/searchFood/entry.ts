import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

// Multi-source food search: queries USDA FoodData Central and Open Food Facts
// in parallel (both free), merges + dedupes + relevance-ranks the results.

const NUTRIENT_IDS = { ENERGY: 1008, PROTEIN: 1003, FAT: 1004, CARBS: 1005 };

function getNutrient(nutrients, id) {
  const n = nutrients?.find(n => n.nutrientId === id);
  return n?.value || 0;
}

function tokenize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean);
}

// Relevance score built around the typed query:
// - how many query words appear in the name (exact or prefix match)
// - big bonus when the name IS / starts with / contains the exact typed phrase
// - penalty for long noisy names so close matches surface first
function scoreResult(queryTokens, name) {
  const nameTokens = tokenize(name);
  const nameSet = new Set(nameTokens);
  let hits = 0;
  for (const t of queryTokens) {
    if (nameSet.has(t)) hits += 1;
    else if (nameTokens.some(nt => nt.startsWith(t))) hits += 0.6; // typed prefix e.g. "yog" → "yogurt"
  }
  const coverage = queryTokens.length > 0 ? hits / queryTokens.length : 0;

  let score = coverage * 10;
  const joinedName = nameTokens.join(" ");
  const joinedQuery = queryTokens.join(" ");
  if (joinedName === joinedQuery) score += 6;            // exact match
  else if (joinedName.startsWith(joinedQuery)) score += 3; // name starts with the typed query
  else if (joinedName.includes(joinedQuery)) score += 2;   // typed phrase appears intact
  score -= Math.max(0, nameTokens.length - queryTokens.length) * 0.15; // noise penalty

  return { score, coverage };
}

async function searchUsda(query) {
  const apiKey = secrets.get("USDA_API_KEY") || "DEMO_KEY";
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      pageSize: 20,
      dataType: ["Branded", "Survey (FNDDS)", "SR Legacy"],
    }),
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error(`USDA ${response.status}`);
  const data = await response.json();

  return (data.foods || []).map(food => {
    const calories = getNutrient(food.foodNutrients, NUTRIENT_IDS.ENERGY);
    const protein = getNutrient(food.foodNutrients, NUTRIENT_IDS.PROTEIN);
    const fat = getNutrient(food.foodNutrients, NUTRIENT_IDS.FAT);
    const carbs = getNutrient(food.foodNutrients, NUTRIENT_IDS.CARBS);

    const servingSizeG = food.servingSize || 100;
    const servingUnit = food.servingSizeUnit || "g";
    const servingDesc = food.householdServingFullText
      || (food.servingSize ? `${food.servingSize} ${servingUnit}` : "100g");
    const scale = servingSizeG / 100;

    const brandName = food.brandName || food.brandOwner || "";
    const foodName = brandName ? `${food.description} (${brandName})` : food.description;

    return {
      name: foodName,
      serving_size_description: servingDesc,
      serving_size_grams: servingSizeG,
      calories_per_serving: Math.round(calories * scale),
      protein_g_per_serving: Math.round(protein * scale * 10) / 10,
      carbs_g_per_serving: Math.round(carbs * scale * 10) / 10,
      fat_g_per_serving: Math.round(fat * scale * 10) / 10,
      source: "USDA",
      _branded: food.dataType === "Branded",
    };
  });
}

async function searchOpenFoodFacts(query) {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
    `&search_simple=1&action=process&json=1&page_size=20` +
    `&fields=product_name,brands,nutriments,serving_size,serving_quantity`;
  const response = await fetch(url, {
    headers: { "User-Agent": "SFRMR-App/1.0 (nutrition search)" },
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error(`OFF ${response.status}`);
  const data = await response.json();

  return (data.products || [])
    .filter(p => p.product_name && p.nutriments && p.nutriments["energy-kcal_100g"] != null)
    .map(p => {
      const n = p.nutriments;
      const servingSizeG = parseFloat(p.serving_quantity) || 100;
      const servingDesc = p.serving_size || `${servingSizeG}g`;
      const scale = servingSizeG / 100;
      const brand = (p.brands || "").split(",")[0].trim();
      const foodName = brand ? `${p.product_name} (${brand})` : p.product_name;

      return {
        name: foodName,
        serving_size_description: servingDesc,
        serving_size_grams: servingSizeG,
        calories_per_serving: Math.round((n["energy-kcal_100g"] || 0) * scale),
        protein_g_per_serving: Math.round((n.proteins_100g || 0) * scale * 10) / 10,
        carbs_g_per_serving: Math.round((n.carbohydrates_100g || 0) * scale * 10) / 10,
        fat_g_per_serving: Math.round((n.fat_100g || 0) * scale * 10) / 10,
        source: "Open Food Facts",
        _branded: !!brand,
      };
    });
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query } = await req.json();
    const q = (query || "").trim();
    if (!q) return Response.json({ results: [] });

    // Query both databases in parallel; a failing/slow source never blocks the other
    const [usdaRes, offRes] = await Promise.allSettled([
      searchUsda(q),
      searchOpenFoodFacts(q),
    ]);

    const usda = usdaRes.status === "fulfilled" ? usdaRes.value : [];
    const off = offRes.status === "fulfilled" ? offRes.value : [];
    if (usdaRes.status === "rejected") console.error("USDA search failed:", usdaRes.reason?.message);
    if (offRes.status === "rejected") console.error("Open Food Facts search failed:", offRes.reason?.message);

    // Merge + dedupe by normalized name (USDA wins ties — appears first)
    const seen = new Set();
    const merged = [];
    for (const r of [...usda, ...off]) {
      const key = tokenize(r.name).join(" ");
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(r);
    }

    // Relevance ranking against the typed query; drop items matching under
    // half of the typed words so unrelated foods never clutter the list
    const queryTokens = tokenize(q);
    const allScored = merged
      .map(r => {
        const { score, coverage } = scoreResult(queryTokens, r.name);
        return { r, score: score + (r._branded ? 0.5 : 0), coverage };
      })
      .sort((a, b) => b.score - a.score);

    let scored = allScored.filter(x => x.coverage >= 0.5);
    // Fallback: nothing matched half the typed words — still show the top 5 closest
    if (scored.length === 0) scored = allScored.slice(0, 5);

    const results = scored.slice(0, 25).map(({ r }) => {
      const { _branded, ...rest } = r;
      return rest;
    });
    return Response.json({ results });
  } catch (error) {
    console.error("searchFood error:", error);
    return Response.json({ error: error.message, results: [] }, { status: 500 });
  }
}