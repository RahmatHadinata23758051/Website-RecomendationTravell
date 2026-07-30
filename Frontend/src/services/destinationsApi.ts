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

  // 3. Fallback to local static JSON dataset
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
        const regLow = query.city_or_regency.toLowerCase();
        filtered = filtered.filter((d) => String(d.city_or_regency || '').toLowerCase().includes(regLow));
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
    const response = await axios.post(`${API_BASE_URL}/planner/generate`, payload, { timeout: 4500 });
    if (response.data && (response.data.status === 'success' || response.data.itinerary)) {
      return response.data;
    }
  } catch (err) {
    // Silent fallback
  }

  // 2. Try FastAPI ML API Direct
  try {
    const fastApiRes = await axios.post('http://localhost:8000/api/v1/planner/generate', payload, { timeout: 4500 });
    if (fastApiRes.data && (fastApiRes.data.status === 'success' || fastApiRes.data.itinerary)) {
      return fastApiRes.data;
    }
  } catch (e) {
    // Silent fallback
  }

  return null;
};

export const swapPlannerSlotApi = async (payload: SwapSlotPayload): Promise<any[]> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/planner/swap-slot`, payload, { timeout: 3500 });
    if (response.data && response.data.alternatives) {
      return response.data.alternatives;
    }
  } catch (e) {
    try {
      const fastApiRes = await axios.post('http://localhost:8000/api/v1/planner/swap-slot', payload, { timeout: 3500 });
      if (fastApiRes.data && fastApiRes.data.alternatives) {
        return fastApiRes.data.alternatives;
      }
    } catch (err) {
      return [];
    }
  }
  return [];
};
