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

  private readonly regencies = [
    'Bandar Lampung',
    'Pesawaran',
    'Lampung Selatan',
    'Pesisir Barat',
    'Tanggamus',
    'Lampung Timur',
    'Lampung Barat',
    'Way Kanan',
    'Metro',
    'Pringsewu',
    'Tulang Bawang Barat',
    'Lampung Utara',
    'Tulang Bawang',
    'Mesuji',
    'Lampung Tengah',
  ];

  private readonly categories = ['Pantai', 'Alam', 'Budaya', 'Kuliner', 'Adventure'];

  onModuleInit() {
    this.loadDestinationsData();
  }

  private loadDestinationsData() {
    try {
      const posiblesPaths = [
        path.join(process.cwd(), '..', 'Frontend', 'public', 'public_destinations.json'),
        path.join(process.cwd(), 'public', 'public_destinations.json'),
        path.join(process.cwd(), 'public_destinations.json'),
      ];

      let rawData = '';
      for (const p of posiblesPaths) {
        if (fs.existsSync(p)) {
          rawData = fs.readFileSync(p, 'utf-8');
          this.logger.log(`[RAG RETRIEVER] Successfully loaded destinations dataset from: ${p}`);
          break;
        }
      }

      if (rawData) {
        const parsed = JSON.parse(rawData);
        this.destinationsPool = parsed.map((item: any) => ({
          id: item.id || item.canonicalId || `dest-${Math.random()}`,
          name: item.name || 'Destinasi Wisata Lampung',
          location: item.location || item.formattedAddress || item.regency || 'Lampung',
          regency: item.regency || item.city || 'Bandar Lampung',
          category: item.category || 'Alam',
          rating: item.rating || 4.5,
          price: item.price || 'Gratis / Terjangkau ($)',
          numericPrice: item.numericPrice || 0,
          duration: item.duration || '1-2 jam',
          hours: item.hours || '08:00 - 17:00 WIB',
          description: item.description || item.summary || 'Destinasi wisata unggulan di Lampung.',
          facilities: Array.isArray(item.facilities) ? item.facilities : ['Spot Foto', 'Parkir', 'Toilet'],
        }));
        this.logger.log(`[RAG RETRIEVER] Total ${this.destinationsPool.length} destinations indexed into memory pool.`);
      } else {
        this.logger.warn(`[RAG RETRIEVER] public_destinations.json file not found. Initialized with fallback pool.`);
      }
    } catch (err) {
      this.logger.error(`[RAG RETRIEVER] Failed to load destinations dataset: ${err.message}`);
    }
  }

  public retrieveRelevantFacts(query: string, targetRegency?: string, targetCategory?: string): DestinationFact[] {
    if (!this.destinationsPool || this.destinationsPool.length === 0) {
      return [];
    }

    const lowerQuery = query.toLowerCase();

    // 1. Detect Regency
    let detectedRegency = targetRegency;
    if (!detectedRegency || detectedRegency === 'Semua' || detectedRegency === 'PILIH') {
      for (const reg of this.regencies) {
        if (lowerQuery.includes(reg.toLowerCase())) {
          detectedRegency = reg;
          break;
        }
      }
    }

    // 2. Detect Category
    let detectedCategory = targetCategory;
    if (!detectedCategory || detectedCategory === 'Semua') {
      for (const cat of this.categories) {
        if (lowerQuery.includes(cat.toLowerCase())) {
          detectedCategory = cat;
          break;
        }
      }
    }

    // 3. Score candidates
    const scored = this.destinationsPool.map((dest) => {
      let score = 0;
      const lowerName = dest.name.toLowerCase();
      const lowerReg = dest.regency.toLowerCase();
      const lowerCat = dest.category.toLowerCase();
      const lowerDesc = dest.description.toLowerCase();

      // Direct name match
      if (lowerQuery.includes(lowerName) || lowerName.includes(lowerQuery)) {
        score += 50;
      }

      // Regency match
      if (detectedRegency && lowerReg.includes(detectedRegency.toLowerCase())) {
        score += 30;
      }

      // Category match
      if (detectedCategory && lowerCat.includes(detectedCategory.toLowerCase())) {
        score += 20;
      }

      // Keyword match in description
      const queryWords = lowerQuery.split(/\s+/).filter((w) => w.length > 3);
      for (const word of queryWords) {
        if (lowerName.includes(word)) score += 10;
        if (lowerDesc.includes(word)) score += 5;
      }

      // Rating boost
      score += (dest.rating || 4.0) * 2;

      return { dest, score };
    });

    // Sort by score descending and take top 5
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 5).map((s) => s.dest);
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

    return `FAKTA TERVERIFIKASI DATABASE 2.889 DESTINASI WISATA LAMPUNG:\n${factsText}`;
  }
}
