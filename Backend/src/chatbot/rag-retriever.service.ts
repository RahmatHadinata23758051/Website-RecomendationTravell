import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';

export interface DestinationFact {
  id: string;
  name: string;
  location: string;
  regency: string;
  category: string;
  rating: number;
  price: string;
  numericPrice: number;
  duration: string;
  hours: string;
  description: string;
  facilities: string[];
}

@Injectable()
export class RagRetrieverService implements OnModuleInit {
  private readonly logger = new Logger(RagRetrieverService.name);
  private destinationsPool: DestinationFact[] = [];

  private readonly regencyAliasMap: Record<string, string> = {
    'bandar lampung': 'Kota Bandar Lampung',
    'bdl': 'Kota Bandar Lampung',
    'pesawaran': 'Kabupaten Pesawaran',
    'pesisir barat': 'Kabupaten Pesisir Barat',
    'krui': 'Kabupaten Pesisir Barat',
    'tanggamus': 'Kabupaten Tanggamus',
    'lampung selatan': 'Kabupaten Lampung Selatan',
    'lamsel': 'Kabupaten Lampung Selatan',
    'lampung timur': 'Kabupaten Lampung Timur',
    'lamtim': 'Kabupaten Lampung Timur',
    'lampung barat': 'Kabupaten Lampung Barat',
    'lambar': 'Kabupaten Lampung Barat',
    'way kanan': 'Kabupaten Way Kanan',
    'metro': 'Kota Metro',
    'pringsewu': 'Kabupaten Pringsewu',
    'tulang bawang barat': 'Kabupaten Tulang Bawang Barat',
    'tubaba': 'Kabupaten Tulang Bawang Barat',
    'tulang bawang': 'Kabupaten Tulang Bawang',
    'mesuji': 'Kabupaten Mesuji',
    'lampung tengah': 'Kabupaten Lampung Tengah',
    'lampung utara': 'Kabupaten Lampung Utara',
  };

  private readonly categories = ['Pantai', 'Alam', 'Budaya', 'Kuliner', 'Adventure'];

  onModuleInit() {
    this.loadDestinationsData();
  }

  public loadDestinationsData(): DestinationFact[] {
    if (this.destinationsPool.length > 0) {
      return this.destinationsPool;
    }

    try {
      const posiblesPaths = [
        path.join(process.cwd(), '..', 'Frontend', 'public', 'assets', 'data', 'public_destinations.json'),
        path.join(process.cwd(), '..', 'Frontend', 'public', 'data', 'destinations.json'),
        path.join(process.cwd(), '..', 'Frontend', 'public', 'public_destinations.json'),
        path.join(process.cwd(), 'public', 'assets', 'data', 'public_destinations.json'),
        path.join(__dirname, '..', '..', '..', 'Frontend', 'public', 'assets', 'data', 'public_destinations.json'),
      ];

      let rawData = '';
      for (const p of posiblesPaths) {
        if (fs.existsSync(p)) {
          rawData = fs.readFileSync(p, 'utf-8');
          this.logger.log(`[RAG RETRIEVER] Loaded destinations dataset from: ${p}`);
          break;
        }
      }

      if (rawData) {
        const parsed = JSON.parse(rawData);
        this.destinationsPool = parsed
          .filter((item: any) => {
            const nameLower = (item.name || '').toLowerCase().trim();
            
            // Filter out non-attractions strictly
            const isNonTourist =
              nameLower === 'wisata' ||
              nameLower === 'destinasi wisata' ||
              nameLower.startsWith('lampung') ||
              nameLower.startsWith('wisata alam') ||
              nameLower.includes('tour') ||
              nameLower.includes('travel') ||
              nameLower.includes('biro') ||
              nameLower.includes('mepo') ||
              nameLower.includes('rental') ||
              nameLower.includes('tugu selamat') ||
              nameLower.includes('gapura selamat') ||
              nameLower.includes('spbu') ||
              nameLower.includes('terminal');

            return !isNonTourist;
          })
          .map((item: any) => ({
            id: item.canonical_id || item.id || item.canonicalId || `dest-${Math.random()}`,
            name: item.name || 'Destinasi Wisata Lampung',
            location: item.address || item.location || item.city_or_regency || 'Lampung',
            regency: item.city_or_regency || item.regency || 'Kota Bandar Lampung',
            category: item.primary_category || item.category || 'Alam',
            rating: item.rating || 4.5,
            price: item.price || (item.price_min_idr ? `Rp ${item.price_min_idr.toLocaleString('id-ID')}` : 'Terjangkau ($)'),
            numericPrice: item.numericPrice || item.price_min_idr || 0,
            duration: item.duration || '1-2 jam',
            hours: item.hours || '08:00 - 17:00 WIB',
            description: item.description || item.summary || 'Destinasi wisata unggulan di Lampung.',
            facilities: Array.isArray(item.facilities) ? item.facilities : ['Spot Foto', 'Parkir', 'Toilet'],
          }));
        this.logger.log(`[RAG RETRIEVER] Indexed ${this.destinationsPool.length} clean tourist destinations.`);
      }
    } catch (err) {
      this.logger.error(`[RAG RETRIEVER] Failed to load dataset: ${err.message}`);
    }

    if (this.destinationsPool.length === 0) {
      this.logger.warn(`[RAG RETRIEVER] Using Seed Pool fallback.`);
      this.destinationsPool = [
        {
          id: 'seed-1',
          name: 'Puncak Mas Bandar Lampung',
          location: 'Kemiling, Kota Bandar Lampung',
          regency: 'Kota Bandar Lampung',
          category: 'Alam',
          rating: 4.8,
          price: 'Rp 20.000',
          numericPrice: 20000,
          duration: '2-3 jam',
          hours: '08:00 - 22:00 WIB',
          description: 'Wisata perbukitan populer di Bandar Lampung dengan wahana foto rumah pohon & pemandangan kota.',
          facilities: ['Rumah Pohon', 'Spot Foto', 'Kantin', 'Parkir'],
        },
        {
          id: 'seed-2',
          name: 'Museum Negeri Lampung Ruwa Jurai',
          location: 'Rajabasa, Kota Bandar Lampung',
          regency: 'Kota Bandar Lampung',
          category: 'Budaya',
          rating: 4.7,
          price: 'Rp 5.000',
          numericPrice: 5000,
          duration: '1-2 jam',
          hours: '08:00 - 15:00 WIB',
          description: 'Museum kebudayaan tertua di Lampung berisi koleksi benda bersejarah, meriam antik & pakaian adat Siger.',
          facilities: ['Pemandu', 'Koleksi Bersejarah', 'Toilet', 'Parkir'],
        },
        {
          id: 'seed-3',
          name: 'Pulau Pahawang Snorkeling Spot',
          location: 'Kecamatan Marga Punduh, Kabupaten Pesawaran',
          regency: 'Kabupaten Pesawaran',
          category: 'Pantai',
          rating: 4.9,
          price: 'Rp 150.000 (Paket Boat & Alat)',
          numericPrice: 150000,
          duration: '1 Hari',
          hours: '07:00 - 16:00 WIB',
          description: 'Destinasi bahari kelas dunia tempat snorkeling terbaik melihat terumbu karang alami & ekosistem Ikan Nemo.',
          facilities: ['Boat', 'Alat Snorkeling', 'Kamera Underwater', 'Homestay'],
        },
        {
          id: 'seed-4',
          name: 'Pantai Sari Ringgung',
          location: 'Padang Cermin, Kabupaten Pesawaran',
          regency: 'Kabupaten Pesawaran',
          category: 'Pantai',
          rating: 4.7,
          price: 'Rp 20.000',
          numericPrice: 20000,
          duration: '3-4 jam',
          hours: '06:00 - 18:00 WIB',
          description: 'Pantai pasir putih populer dengan atraksi Pasir Timbul di tengah laut & wahana olahraga air.',
          facilities: ['Pasir Timbul', 'Restoran Apung', 'Gazebo', 'Parkir'],
        },
      ];
    }

    return this.destinationsPool;
  }

  public retrieveRelevantFacts(query: string, targetRegency?: string, targetCategory?: string): DestinationFact[] {
    const pool = this.loadDestinationsData();
    if (!pool || pool.length === 0) {
      return [];
    }

    const lowerQuery = query.toLowerCase();

    // 1. Detect Regency via Alias Map
    let detectedRegency = targetRegency;
    if (!detectedRegency || detectedRegency === 'Semua' || detectedRegency === 'PILIH') {
      for (const [alias, fullReg] of Object.entries(this.regencyAliasMap)) {
        if (lowerQuery.includes(alias)) {
          detectedRegency = fullReg;
          break;
        }
      }
    }

    // 2. Detect Category & Intent
    let detectedCategory = targetCategory;
    const isFoodIntent = /(kuliner|kuliiner|kulinr|kulineran|makan|mkan|mkn|makanan|resto|restoran|seruit|warung)/i.test(lowerQuery);
    const isBeachIntent = /(pantai|pntai|pantaii|laut|snorkeling|surfing|beach)/i.test(lowerQuery);

    if (isFoodIntent) {
      detectedCategory = 'Kuliner';
    } else if (isBeachIntent) {
      detectedCategory = 'Pantai';
    } else if (!detectedCategory || detectedCategory === 'Semua') {
      for (const cat of this.categories) {
        if (lowerQuery.includes(cat.toLowerCase())) {
          detectedCategory = cat;
          break;
        }
      }
    }

    // 3. Strict Filter by Regency if detected
    let candidates = pool;
    if (detectedRegency) {
      const regClean = detectedRegency.toLowerCase().replace(/(kabupaten|kota)\s+/, '');
      candidates = pool.filter((dest) => {
        const dReg = dest.regency.toLowerCase();
        const dLoc = dest.location.toLowerCase();
        return dReg.includes(regClean) || dLoc.includes(regClean);
      });

      if (candidates.length === 0) {
        candidates = pool;
      }
    }

    // 4. Score candidates
    const scored = candidates.map((dest) => {
      let score = 0;
      const lowerName = dest.name.toLowerCase();
      const lowerCat = dest.category.toLowerCase();
      const lowerDesc = dest.description.toLowerCase();

      // Direct name match
      if (lowerQuery.includes(lowerName) || lowerName.includes(lowerQuery)) {
        score += 50;
      }

      // Category match
      if (detectedCategory && lowerCat.includes(detectedCategory.toLowerCase())) {
        score += 30;
      }

      // Keyword match (avoiding common stop words)
      const queryWords = lowerQuery.split(/\s+/).filter((w) => w.length > 3 && w !== 'wisata' && w !== 'rekomendasi' && w !== 'pantai');
      for (const word of queryWords) {
        if (lowerName.includes(word)) score += 15;
        if (lowerDesc.includes(word)) score += 5;
      }

      // Rating boost
      score += (dest.rating || 4.0) * 2;

      return { dest, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 6).map((s) => s.dest);
  }

  public buildRagContextPrompt(query: string, regency?: string, category?: string): string {
    const facts = this.retrieveRelevantFacts(query, regency, category);
    if (facts.length === 0) {
      return 'TIDAK ADA FAKTA SPESIFIK DALAM DATABASE. Gunakan pengetahuan umum pariwisata Lampung.';
    }

    const factsText = facts
      .map(
        (f, idx) =>
          `[FAKTA ${idx + 1}] ID: "${f.id}" | Nama: "${f.name}" | Kabupaten/Kota: "${f.regency}" | Kategori: "${f.category}" | Rating: ${f.rating}★ | Harga Tiket: ${f.price} | Jam Buka: ${f.hours} | Fasilitas: ${f.facilities.join(', ')} | Deskripsi: ${f.description}`,
      )
      .join('\n');

    return `FAKTA TERVERIFIKASI DATABASE DESTINASI WISATA LAMPUNG:\n${factsText}`;
  }
}
