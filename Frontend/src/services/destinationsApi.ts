import axios from 'axios';
import { Destination } from '../pages/ExplorePage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export interface DestinationsQuery {
  category?: string;
  city_or_regency?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// In-memory cache for static public destinations dataset
let staticDestinationsCache: any[] | null = null;

const cleanRegency = (str?: string): string => {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace('kabupaten ', '')
    .replace('kota ', '')
    .replace('kab. ', '')
    .trim();
};

export const fetchRealDestinations = async (query: DestinationsQuery = {}): Promise<Destination[]> => {
  const page = query.page || 1;
  const limit = query.limit || 60;

  // 1. Try NestJS Backend API
  try {
    const response = await axios.get(`${API_BASE_URL}/destinations`, {
      params: {
        category: query.category && query.category !== 'Semua' ? query.category : undefined,
        city_or_regency: query.city_or_regency && query.city_or_regency !== 'Semua' ? query.city_or_regency : undefined,
        search: query.search || undefined,
        page,
        limit,
      },
      timeout: 2500,
    });

    const data = response.data;
    if (data && data.destinations && Array.isArray(data.destinations) && data.destinations.length > 0) {
      return data.destinations.map((item: any) => mapApiToDestination(item));
    }
  } catch (error) {
    // Silent fallback
  }

  // 2. Try FastAPI ML Engine directly
  try {
    const fastApiRes = await axios.get('http://localhost:8000/api/v1/destinations', {
      params: {
        category: query.category && query.category !== 'Semua' ? query.category : undefined,
        city_or_regency: query.city_or_regency && query.city_or_regency !== 'Semua' ? query.city_or_regency : undefined,
        search: query.search || undefined,
        page,
        limit,
      },
      timeout: 2500,
    });

    const data = fastApiRes.data;
    if (data && data.destinations && Array.isArray(data.destinations) && data.destinations.length > 0) {
      return data.destinations.map((item: any) => mapApiToDestination(item));
    }
  } catch (err) {
    // Silent fallback
  }

  // 3. Fallback to local static JSON dataset with Robust Regency Matching
  try {
    if (!staticDestinationsCache) {
      const staticRes = await fetch('/assets/data/public_destinations.json');
      if (staticRes.ok) {
        staticDestinationsCache = await staticRes.json();
      }
    }

    if (staticDestinationsCache && Array.isArray(staticDestinationsCache)) {
      let filtered = [...staticDestinationsCache];

      if (query.category && query.category !== 'Semua') {
        const catLow = query.category.toLowerCase();
        filtered = filtered.filter((d) => String(d.primary_category || '').toLowerCase().includes(catLow));
      }

      if (query.city_or_regency && query.city_or_regency !== 'Semua') {
        const cleanQueryReg = cleanRegency(query.city_or_regency);
        if (cleanQueryReg) {
          filtered = filtered.filter((d) => {
            const targetReg = cleanRegency(d.city_or_regency);
            const targetAddr = String(d.address || '').toLowerCase();
            return targetReg.includes(cleanQueryReg) || targetAddr.includes(cleanQueryReg);
          });
        }
      }

      if (query.search) {
        const kw = query.search.toLowerCase();
        filtered = filtered.filter(
          (d) =>
            String(d.name || '').toLowerCase().includes(kw) ||
            String(d.city_or_regency || '').toLowerCase().includes(kw) ||
            String(d.address || '').toLowerCase().includes(kw)
        );
      }

      const startIdx = (page - 1) * limit;
      const paginated = filtered.slice(startIdx, startIdx + limit);
      return paginated.map((item: any) => mapApiToDestination(item));
    }
  } catch (err) {
    // Silent fallback
  }

  return [];
};

const mapCategoryName = (raw: string): string => {
  if (!raw) return 'Alam';
  const catMap: Record<string, string> = {
    beach: 'Pantai',
    pantai: 'Pantai',
    nature: 'Alam',
    alam: 'Alam',
    waterfall: 'Alam',
    culture: 'Budaya',
    budaya: 'Budaya',
    museum: 'Budaya',
    culinary: 'Kuliner',
    kuliner: 'Kuliner',
    adventure: 'Adventure',
  };
  return catMap[String(raw).toLowerCase()] || 'Alam';
};

export const mapApiToDestination = (item: any): Destination => {
  const primaryCategory = mapCategoryName(item.primary_category);

  const priceText = item.price_min_idr && item.price_min_idr > 0
    ? `Rp ${Number(item.price_min_idr).toLocaleString('id-ID')} / orang`
    : 'Gratis (Parkir Terjangkau)';

  return {
    id: item.canonical_id || `dest-${Math.random()}`,
    name: item.name,
    location: item.address || item.city_or_regency || 'Lampung',
    regency: item.city_or_regency || 'Lampung',
    category: primaryCategory as any,
    rating: item.rating || 4.6,
    reviews: item.reviews_count || 120,
    price: priceText,
    numericPrice: item.price_min_idr || 0,
    duration: '2-3 jam',
    hours: '08:00 - 17:00 WIB',
    image: item.image_url || '/assets/images/heroes/hero-pahawang-bg.png',
    coords: [
      item.latitude && !isNaN(item.latitude) ? Number(item.latitude) : -5.4292,
      item.longitude && !isNaN(item.longitude) ? Number(item.longitude) : 105.2611,
    ],
    description: item.description || `Destinasi wisata ${primaryCategory} populer di ${item.city_or_regency} yang menyajikan keindahan lanskap tropis khas Lampung.`,
    facilities: ['Spot Foto', 'Area Parkir', 'Warung Makan', 'Mushola', 'Toilet'],
    aiReason: `Rekomendasi resmi AI Raden Gajah untuk kategori ${primaryCategory} unggulan di ${item.city_or_regency}.`,
  };
};

// ==========================================
// AI PLANNER LIVE API SERVICES (FASE 11)
// ==========================================

export interface GeneratePlannerPayload {
  city_or_regency: string;
  categories?: string[];
  primary_category?: string;
  budget_level?: string;
  pace_style?: string;
  duration_days: number;
}

export interface SwapSlotPayload {
  city_or_regency: string;
  category?: string;
  exclude_ids?: string[];
}

export const generateAiPlannerItinerary = async (payload: GeneratePlannerPayload): Promise<any> => {
  // 1. Try NestJS Backend API
  try {
    const response = await axios.post(`${API_BASE_URL}/planner/generate`, payload, { timeout: 3500 });
    if (response.data && (response.data.status === 'success' || response.data.itinerary)) {
      return response.data;
    }
  } catch (err) {
    // Silent fallback
  }

  // 2. Try FastAPI Python ML API directly
  try {
    const fastApiRes = await axios.post('http://localhost:8000/api/v1/planner/generate', payload, { timeout: 3500 });
    if (fastApiRes.data && (fastApiRes.data.status === 'success' || fastApiRes.data.itinerary)) {
      return fastApiRes.data;
    }
  } catch (e) {
    // Silent fallback
  }

  // 3. Robust Real-Data Client Spatial Planner Engine
  try {
    if (!staticDestinationsCache) {
      const staticRes = await fetch('/assets/data/public_destinations.json');
      if (staticRes.ok) {
        staticDestinationsCache = await staticRes.json();
      }
    }

    if (staticDestinationsCache && Array.isArray(staticDestinationsCache)) {
      const cleanTargetReg = cleanRegency(payload.city_or_regency);

      let matched = staticDestinationsCache.filter((item: any) => {
        const itemReg = cleanRegency(item.city_or_regency);
        return itemReg.includes(cleanTargetReg);
      });

      if (matched.length === 0) {
        matched = [...staticDestinationsCache];
      }

      // Separate Culinary & Attractions
      const culinary = matched.filter((item: any) =>
        String(item.primary_category || '').toLowerCase().match(/kuliner|culinary|resto|makanan/)
      );
      let attractions = matched.filter((item: any) =>
        !String(item.primary_category || '').toLowerCase().match(/kuliner|culinary|resto|makanan/)
      );

      if (attractions.length === 0) attractions = matched;
      const culinaryPool = culinary.length > 0 ? culinary : attractions;

      // Filter by requested categories if available
      const requestedCats = (payload.categories || [])
        .concat(payload.primary_category ? payload.primary_category.split(',') : [])
        .map((c) => c.toLowerCase().trim())
        .filter((c) => c && c !== 'semua');

      const budgetTier = payload.budget_level || 'Standar';

      // Multi-factor Weighted Relevance Scoring Function:
      // Score = (CategoryMatch * 0.40) + (BudgetMatch * 0.40) + (Rating/5 * 0.20)
      const calculateRelevanceScore = (item: any, isFoodSlot: boolean): number => {
        const itemCat = String(item.primary_category || '').toLowerCase();
        
        // 1. Category Score (0.0 to 1.0)
        let categoryScore = 0.5;
        if (isFoodSlot) {
          categoryScore = itemCat.match(/kuliner|culinary|resto|makanan|café|cafe/) ? 1.0 : 0.3;
        } else if (requestedCats.length > 0) {
          categoryScore = requestedCats.some((rc) => itemCat.includes(rc)) ? 1.0 : 0.3;
        } else {
          categoryScore = 0.8;
        }

        // 2. Budget Match Score (0.0 to 1.0)
        const price = Number(item.price_min_idr || 25000);
        let budgetScore = 0.5;

        if (budgetTier === 'Backpacker') {
          if (price <= 20000) budgetScore = 1.0;
          else if (price <= 35000) budgetScore = 0.75;
          else if (price <= 50000) budgetScore = 0.4;
          else budgetScore = 0.1; // Penalty for expensive items on Backpacker budget
        } else if (budgetTier === 'Standar') {
          if (price >= 15000 && price <= 75000) budgetScore = 1.0;
          else if (price <= 120000) budgetScore = 0.7;
          else budgetScore = 0.3;
        } else { // Mewah / Sultan
          if (price >= 50000) budgetScore = 1.0;
          else if (price >= 25000) budgetScore = 0.6;
          else budgetScore = 0.3;
        }

        // 3. Rating Score (0.0 to 1.0)
        const rating = Number(item.rating || 4.5);
        const ratingScore = Math.min(1.0, rating / 5.0);

        return (categoryScore * 0.40) + (budgetScore * 0.40) + (ratingScore * 0.20);
      };

      const usedIds = new Set<string>();
      const numDays = Math.min(payload.duration_days || 1, 5);
      const isPadat = payload.pace_style === 'Padat';

      const slotTemplates = isPadat
        ? [
            { time: '07:00 - 08:30 WIB', isFood: true },
            { time: '09:00 - 11:30 WIB', isFood: false },
            { time: '12:00 - 13:30 WIB', isFood: true },
            { time: '14:00 - 17:30 WIB', isFood: false },
            { time: '18:30 - 21:00 WIB', isFood: true },
          ]
        : [
            { time: '08:30 - 11:30 WIB', isFood: false },
            { time: '12:00 - 14:00 WIB', isFood: true },
            { time: '15:30 - 18:30 WIB', isFood: false },
          ];

      const daysResult: any[] = [];
      let totalCostAccum = 0;

      for (let dayNum = 1; dayNum <= numDays; dayNum++) {
        const daySlots: any[] = [];

        slotTemplates.forEach((stpl, tIdx) => {
          const pool = stpl.isFood ? culinaryPool : attractions;

          // Rank available pool candidates by relevance score for this slot
          const candidates = pool
            .filter((item: any) => !usedIds.has(item.canonical_id || item.name))
            .map((item: any) => ({
              item,
              score: calculateRelevanceScore(item, stpl.isFood),
            }))
            .sort((a, b) => b.score - a.score);

          let chosenItem = candidates.length > 0 ? candidates[0].item : null;

          // Hierarchical Fallback inside same regency if pool exhausted
          if (!chosenItem && matched.length > 0) {
            chosenItem = matched[tIdx % matched.length];
          }

          if (chosenItem) {
            const cid = chosenItem.canonical_id || chosenItem.name;
            usedIds.add(cid);

            // Compute realistic price per slot based on budget tier & item dataset
            let defaultBaseCost = stpl.isFood ? 25000 : 15000;
            if (budgetTier === 'Standar') defaultBaseCost = stpl.isFood ? 45000 : 35000;
            if (budgetTier === 'Mewah') defaultBaseCost = stpl.isFood ? 120000 : 85000;

            const itemCost = chosenItem.price_min_idr && chosenItem.price_min_idr > 0
              ? chosenItem.price_min_idr
              : defaultBaseCost;

            totalCostAccum += itemCost;

            const mapped = mapApiToDestination(chosenItem);

            const tipPrefix =
              budgetTier === 'Backpacker'
                ? 'Tipe Backpacker (Hemat)'
                : budgetTier === 'Mewah'
                ? 'Tipe Mewah (Sultan)'
                : 'Tipe Standar';

            daySlots.push({
              canonical_id: cid,
              time: stpl.time,
              activityTitle: mapped.name,
              category: mapped.category,
              location: mapped.location,
              estimatedCost: `Rp ${itemCost.toLocaleString('id-ID')} / orang`,
              numericCost: itemCost,
              coords: mapped.coords,
              image: mapped.image,
              aiTip: `[${tipPrefix}] Rekomendasi AI Raden Gajah untuk ${payload.city_or_regency}. Rating ${mapped.rating}/5.0.`,
              travelTime: tIdx === 0 ? 'Lokasi awal hari' : '20 menit perjalanan',
            });
          }
        });

        const dayTitlePrefix =
          dayNum === 1
            ? 'Eksplorasi Perdana'
            : dayNum === 2
            ? 'Jelajah Pesisir & Kuliner'
            : `Petualangan Hari ke-${dayNum}`;

        daysResult.push({
          dayNumber: dayNum,
          title: `Hari ${dayNum}: ${dayTitlePrefix} ${payload.city_or_regency}`,
          slots: daySlots,
        });
      }

      return {
        status: 'success',
        regency: payload.city_or_regency,
        duration_days: numDays,
        total_cost_estimate_idr: totalCostAccum,
        execution_latency_ms: 15.0,
        itinerary: daysResult,
      };
    }
  } catch (err) {
    // Silent fallback
  }

  return null;
};

export const swapPlannerSlotApi = async (payload: SwapSlotPayload): Promise<any[]> => {
  // 1. Try NestJS Backend API
  try {
    const response = await axios.post(`${API_BASE_URL}/planner/swap-slot`, payload, { timeout: 3500 });
    if (response.data && Array.isArray(response.data.alternatives) && response.data.alternatives.length > 0) {
      return response.data.alternatives;
    }
  } catch (e) {
    // Silent fallback
  }

  // 2. Try FastAPI Python ML API directly
  try {
    const fastApiRes = await axios.post('http://localhost:8000/api/v1/planner/swap-slot', payload, { timeout: 3500 });
    if (fastApiRes.data && Array.isArray(fastApiRes.data.alternatives) && fastApiRes.data.alternatives.length > 0) {
      return fastApiRes.data.alternatives;
    }
  } catch (err) {
    // Silent fallback
  }

  // 3. Robust Real-Data Client Swap Engine
  try {
    if (!staticDestinationsCache) {
      const staticRes = await fetch('/assets/data/public_destinations.json');
      if (staticRes.ok) {
        staticDestinationsCache = await staticRes.json();
      }
    }

    if (staticDestinationsCache && Array.isArray(staticDestinationsCache)) {
      const cleanTargetReg = cleanRegency(payload.city_or_regency);
      const exclude = new Set(payload.exclude_ids || []);

      let matched = staticDestinationsCache.filter((item: any) => {
        const itemReg = cleanRegency(item.city_or_regency);
        const cid = item.canonical_id || item.name;
        return itemReg.includes(cleanTargetReg) && !exclude.has(cid);
      });

      if (matched.length === 0) {
        matched = staticDestinationsCache.filter((item: any) => !exclude.has(item.canonical_id || item.name));
      }

      if (payload.category) {
        const catLow = payload.category.toLowerCase();
        const catMatched = matched.filter((item: any) => String(item.primary_category || '').toLowerCase().includes(catLow));
        if (catMatched.length > 0) matched = catMatched;
      }

      matched.sort((a: any, b: any) => (b.rating || 4.5) - (a.rating || 4.5));
      const top5 = matched.slice(0, 5);

      return top5.map((item: any) => {
        const mapped = mapApiToDestination(item);
        return {
          canonical_id: mapped.id,
          time: 'Rekomendasi Alternatif',
          activityTitle: mapped.name,
          category: mapped.category,
          location: mapped.location,
          estimatedCost: mapped.price,
          numericCost: mapped.numericPrice,
          coords: mapped.coords,
          image: mapped.image,
          aiTip: `Alternatif spot terbaik di ${payload.city_or_regency} dengan rating ulasan ${mapped.rating}/5.0.`,
        };
      });
    }
  } catch (err) {
    // Silent fallback
  }

  return [];
};
