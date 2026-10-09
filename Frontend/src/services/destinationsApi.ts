import { Destination } from '../pages/ExplorePage';
import { apiClient } from '../lib/api';

export interface DestinationsQuery {
  category?: string;
  city_or_regency?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
  price_status?: 'all' | 'free' | 'paid';
  sort_by?: 'rating' | 'reviews_count' | 'name' | 'price_min_idr' | 'popular';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface DestinationsQueryResult {
  destinations: Destination[];
  fallbackSuggestions: Destination[];
  totalItems: number;
  totalPages: number;
}

export const fetchRealDestinationsWithDetails = async (
  query: DestinationsQuery = {},
): Promise<DestinationsQueryResult> => {
  const page = query.page || 1;
  const limit = query.limit || 20;

  // 1. Try NestJS Backend API
  try {
    const response = await apiClient.get('/destinations', {
      params: {
        category: query.category && query.category !== 'Semua' ? query.category : undefined,
        city_or_regency: query.city_or_regency && query.city_or_regency !== 'Semua' ? query.city_or_regency : undefined,
        search: query.search || undefined,
        min_price: query.min_price,
        max_price: query.max_price,
        price_status: query.price_status,
        sort_by: query.sort_by,
        sort_order: query.sort_order,
        page,
        limit,
      },
      timeout: 3000,
    });

    const data = response.data;
    if (data && data.destinations && Array.isArray(data.destinations)) {
      const destinations = data.destinations.map((item: any) => mapApiToDestination(item));
      return {
        destinations,
        fallbackSuggestions: [],
        totalItems: data.total_items || destinations.length,
        totalPages: data.total_pages || 1,
      };
    }
  } catch (error) {
    // When backend fails, return clean empty result rather than pretending successful live results
  }

  return {
    destinations: [],
    fallbackSuggestions: [],
    totalItems: 0,
    totalPages: 0,
  };
};

export const fetchRealDestinations = async (query: DestinationsQuery = {}): Promise<Destination[]> => {
  const result = await fetchRealDestinationsWithDetails(query);
  return result.destinations;
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

export const generateSmartPriceLabel = (item: any): { text: string; num: number } => {
  const rawCategory = String(item.primary_category || '').toLowerCase();
  const rawName = String(item.name || '').toLowerCase();
  const priceVal = Number(item.price_min_idr || 0);

  // 1. Free / Public Landmarks (Taman, Tugu, Alun-Alun, Hutan Kota, Embung)
  if (
    rawCategory.match(/park|forest|history|other/) ||
    rawName.match(/taman|tugu|alun|hutan kota|embung|lapangan|masjid|islamic center/)
  ) {
    if (priceVal <= 10000 || priceVal === 25000) {
      return { text: 'Gratis / Terjangkau ($)', num: 5000 };
    }
  }

  // 2. Premium / Island / Resort / Waterpark
  if (
    rawCategory.match(/resort|waterpark|theme_park/) ||
    rawName.match(/pahawang|kiluan|krui|resort|waterpark|dolphins|diving|villa/)
  ) {
    const cost = priceVal > 30000 && priceVal !== 25000 ? priceVal : 85000;
    return { text: `Wisata Premium ($$$) ~ Rp ${cost.toLocaleString('id-ID')}`, num: cost };
  }

  // 3. Culinary / Resto / Cafe
  if (rawCategory.match(/kuliner|culinary|resto|makanan|café|cafe/) || rawName.match(/sate|pempek|pindang|cafe|kopi|resto/)) {
    const cost = priceVal > 20000 && priceVal !== 25000 ? priceVal : 35000;
    return { text: `Kuliner / Resto ($$) ~ Rp ${cost.toLocaleString('id-ID')}`, num: cost };
  }

  // 4. Standard Tourism (Beach, Waterfall, Mountain, Culture)
  const cost = priceVal > 0 && priceVal !== 25000 ? priceVal : 20000;
  return { text: `Estimasi Masuk ($$) ~ Rp ${cost.toLocaleString('id-ID')}`, num: cost };
};

const getStableDestinationId = (item: any): string => {
  const source = String(item.canonical_id || item.name || JSON.stringify(item));
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash) + source.charCodeAt(index);
    hash |= 0;
  }
  return `dest-${Math.abs(hash).toString(36)}`;
};

export const mapApiToDestination = (item: any): Destination => {
  const primaryCategory = mapCategoryName(item.primary_category);
  const smartPrice = generateSmartPriceLabel(item);

  return {
    id: getStableDestinationId(item),
    name: item.name,
    location: item.address || item.city_or_regency || 'Lampung',
    regency: item.city_or_regency || 'Lampung',
    category: primaryCategory as any,
    rating: item.rating || 0,
    reviews: item.reviews_count || 0,
    price: smartPrice.text,
    numericPrice: smartPrice.num,
    duration: '2-3 jam',
    hours: '08:00 - 17:00 WIB',
    image: item.image_url || '/assets/images/heroes/hero-pahawang-bg.png',
    coords: [
      item.latitude && !isNaN(item.latitude) ? Number(item.latitude) : -5.4292,
      item.longitude && !isNaN(item.longitude) ? Number(item.longitude) : 105.2611,
    ],
    description: item.description || '',
    facilities: Array.isArray(item.facilities) ? item.facilities : [],
    aiReason: '',
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
  // Try NestJS Backend API
  try {
    const response = await apiClient.post('/planner/generate', payload, { timeout: 3500 });
    if (response.data && (response.data.status === 'success' || response.data.itinerary)) {
      return response.data;
    }
  } catch (err) {
    // When backend fails, return clean null/empty result rather than pretending successful live results
  }

  return null;
};

export const swapPlannerSlotApi = async (payload: SwapSlotPayload): Promise<any[]> => {
  try {
    const response = await apiClient.post('/planner/swap-slot', payload, { timeout: 3500 });
    if (response.data && Array.isArray(response.data.alternatives)) {
      return response.data.alternatives;
    }
  } catch (e) {
    // When backend fails, return clean empty list
  }

  return [];
};