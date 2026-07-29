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

export const fetchRealDestinations = async (query: DestinationsQuery = {}): Promise<Destination[] | null> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/destinations`, {
      params: {
        category: query.category && query.category !== 'Semua' ? query.category : undefined,
        city_or_regency: query.city_or_regency && query.city_or_regency !== 'Semua' ? query.city_or_regency : undefined,
        search: query.search || undefined,
        page: query.page || 1,
        limit: query.limit || 60,
      },
      timeout: 4000,
    });

    const data = response.data;
    if (data && data.destinations && Array.isArray(data.destinations) && data.destinations.length > 0) {
      return data.destinations.map((item: any) => mapApiToDestination(item));
    }
  } catch (error) {
    console.warn('[API Client] Backend API unreachable, falling back to local dataset proxy', error);
  }

  // Direct FastAPI Fallback if NestJS proxy is not running
  try {
    const fastApiRes = await axios.get('http://localhost:8000/api/v1/destinations', {
      params: {
        category: query.category && query.category !== 'Semua' ? query.category : undefined,
        city_or_regency: query.city_or_regency && query.city_or_regency !== 'Semua' ? query.city_or_regency : undefined,
        search: query.search || undefined,
        page: query.page || 1,
        limit: query.limit || 60,
      },
      timeout: 4000,
    });

    const data = fastApiRes.data;
    if (data && data.destinations && Array.isArray(data.destinations) && data.destinations.length > 0) {
      return data.destinations.map((item: any) => mapApiToDestination(item));
    }
  } catch (err) {
    console.warn('[API Client] Direct FastAPI unreachable', err);
  }

  return null;
};

export const mapApiToDestination = (item: any): Destination => {
  const catMap: Record<string, 'Pantai' | 'Alam' | 'Budaya' | 'Kuliner' | 'Adventure'> = {
    beach: 'Pantai',
    pantai: 'Pantai',
    nature: 'Alam',
    alam: 'Alam',
    mountain: 'Alam',
    waterfall: 'Alam',
    forest: 'Alam',
    culture: 'Budaya',
    budaya: 'Budaya',
    museum: 'Budaya',
    culinary: 'Kuliner',
    kuliner: 'Kuliner',
    adventure: 'Adventure',
  };

  const catRaw = String(item.primary_category || '').toLowerCase();
  const primaryCategory = catMap[catRaw] || 'Alam';

  const priceText = item.price_min_idr && item.price_min_idr > 0
    ? `Rp ${Number(item.price_min_idr).toLocaleString('id-ID')} / orang`
    : 'Gratis (Parkir Terjangkau)';

  return {
    id: item.canonical_id || `dest-${Math.random()}`,
    name: item.name,
    location: item.address || item.city_or_regency || 'Lampung',
    regency: item.city_or_regency || 'Lampung',
    category: primaryCategory,
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
