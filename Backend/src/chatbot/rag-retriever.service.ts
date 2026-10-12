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
  highlight: string;
  facilities: string[];
}

interface ScoredDestination {
  destination: DestinationFact;
  score: number;
}

@Injectable()
export class RagRetrieverService implements OnModuleInit {
  private readonly logger = new Logger(RagRetrieverService.name);
  private destinationsPool: DestinationFact[] = [];
  private dataLoaded = false;

  private readonly regencyAliasMap: Record<string, string> = {
    'bandar lampung': 'Kota Bandar Lampung',
    bdl: 'Kota Bandar Lampung',
    pesawaran: 'Kabupaten Pesawaran',
    'pesisir barat': 'Kabupaten Pesisir Barat',
    krui: 'Kabupaten Pesisir Barat',
    tanggamus: 'Kabupaten Tanggamus',
    'lampung selatan': 'Kabupaten Lampung Selatan',
    lamsel: 'Kabupaten Lampung Selatan',
    'lampung timur': 'Kabupaten Lampung Timur',
    lamtim: 'Kabupaten Lampung Timur',
    'lampung barat': 'Kabupaten Lampung Barat',
    lambar: 'Kabupaten Lampung Barat',
    liwa: 'Kabupaten Lampung Barat',
    'way kanan': 'Kabupaten Way Kanan',
    metro: 'Kota Metro',
    pringsewu: 'Kabupaten Pringsewu',
    'tulang bawang barat': 'Kabupaten Tulang Bawang Barat',
    tubaba: 'Kabupaten Tulang Bawang Barat',
    'tulang bawang': 'Kabupaten Tulang Bawang',
    mesuji: 'Kabupaten Mesuji',
    'lampung tengah': 'Kabupaten Lampung Tengah',
    lamteng: 'Kabupaten Lampung Tengah',
    'lampung utara': 'Kabupaten Lampung Utara',
    lamut: 'Kabupaten Lampung Utara',
  };

  private readonly categoryAliases: Record<string, string> = {
    pantai: 'Pantai',
    beach: 'Pantai',
    laut: 'Pantai',
    snorkeling: 'Pantai',
    surfing: 'Pantai',
    alam: 'Alam',
    nature: 'Alam',
    mountain: 'Alam',
    gunung: 'Alam',
    waterfall: 'Alam',
    air: 'Alam',
    terjun: 'Alam',
    taman: 'Alam',
    park: 'Alam',
    agrotourism: 'Alam',
    agrowisata: 'Alam',
    hill: 'Alam',
    bukit: 'Alam',
    budaya: 'Budaya',
    culture: 'Budaya',
    history: 'Budaya',
    sejarah: 'Budaya',
    museum: 'Budaya',
    kuliner: 'Kuliner',
    culinary: 'Kuliner',
    makanan: 'Kuliner',
    makan: 'Kuliner',
    restoran: 'Kuliner',
    resto: 'Kuliner',
    cafe: 'Kuliner',
    kopi: 'Kuliner',
    seruit: 'Kuliner',
    adventure: 'Adventure',
    petualangan: 'Adventure',
    wahana: 'Adventure',
    waterpark: 'Adventure',
  };

  private readonly stopWords = new Set([
    'yang', 'dan', 'atau', 'untuk', 'dengan', 'dari', 'di', 'ke', 'ini',
    'itu', 'ada', 'tempat', 'wisata', 'destinasi', 'rekomendasi', 'tolong',
    'dong', 'saya', 'mau', 'ingin', 'paling', 'bagus', 'terbaik', 'sekitar',
    'kabupaten', 'kota', 'lampung', 'harga', 'tiket', 'buka', 'jam',
  ]);

  onModuleInit() {
    this.loadDestinationsData();
  }

  public loadDestinationsData(): DestinationFact[] {
    if (this.dataLoaded) return this.destinationsPool;
    this.dataLoaded = true;

    const datasetPaths = [
      path.join(process.cwd(), '..', 'Frontend', 'public', 'assets', 'data', 'public_destinations.json'),
      path.join(process.cwd(), '..', 'Frontend', 'public', 'data', 'destinations.json'),
      path.join(process.cwd(), '..', 'Frontend', 'public', 'public_destinations.json'),
      path.join(process.cwd(), 'public', 'assets', 'data', 'public_destinations.json'),
      path.join(__dirname, '..', '..', '..', 'Frontend', 'public', 'assets', 'data', 'public_destinations.json'),
    ];

    try {
      const datasetPath = datasetPaths.find((candidate) => fs.existsSync(candidate));
      if (datasetPath) {
        const parsed = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
        const rows = Array.isArray(parsed) ? parsed : parsed.destinations || parsed.data || [];
        this.destinationsPool = rows
          .filter((item: any) => this.isTouristDestination(item))
          .map((item: any, index: number) => this.toDestinationFact(item, index));

        this.logger.log(`[RAG RETRIEVER] Indexed ${this.destinationsPool.length} destinations from ${datasetPath}.`);
      }
    } catch (error) {
      this.logger.error(`[RAG RETRIEVER] Failed to load destination dataset: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (this.destinationsPool.length === 0) {
      this.logger.warn('[RAG RETRIEVER] Dataset unavailable; no synthetic fallback — returning empty pool.');
    }
    return this.destinationsPool;
  }

  private isTouristDestination(item: any): boolean {
    const name = String(item?.name || '').trim();
    if (!name || name.length < 3) return false;
    // Strict guard: ensure name contains alphanumeric letters (exclude emoji-only or symbols)
    if (!/[a-zA-Z0-9]/.test(name)) return false;

    const nameLower = name.toLowerCase();
    return ![
      'wisata', 'destinasi wisata', 'tour', 'travel', 'biro', 'rental',
      'mepo', 'spbu', 'terminal', 'tugu selamat', 'gapura selamat',
    ].some((excluded) => nameLower === excluded || nameLower.includes(excluded));
  }

  private isCulinary(name: string, description: string, rawCategory: string): boolean {
    const lowerName = name.toLowerCase();
    const lowerDesc = (description || '').toLowerCase();
    const culinaryKeywords = /(kopi|resto|restaurant|restoran|cafe|café|kuliner|warung|seruit|pempek|pindang|sate|bakso|lesehan|dapur|sambal|makan|food)/i;
    return (
      rawCategory.includes('culinary') ||
      rawCategory.includes('kuliner') ||
      culinaryKeywords.test(lowerName) ||
      culinaryKeywords.test(lowerDesc)
    );
  }

  private toDestinationFact(item: any, index: number): DestinationFact {
    const rawCategory = String(item.primary_category || item.category || 'alam').toLowerCase();
    const name = String(item.name).trim();
    let category = this.categoryAliases[rawCategory] || this.categoryAliases[rawCategory.replace(/[-_]/g, ' ')] || 'Alam';
    if (this.isCulinary(name, item.description, rawCategory)) {
      category = 'Kuliner';
    }

    const regency = String(item.city_or_regency || item.regency || '').trim();
    const location = String(item.address || item.location || regency).trim();
    const numericPrice = this.knownPrice(item);
    const description = String(item.description || item.summary || '').trim() || 'Deskripsi belum tersedia.';
    const highlight = this.buildHighlight(category, description);

    return {
      id: String(item.canonical_id || item.id || `dest-${index + 1}`),
      name,
      location,
      regency,
      category,
      rating: this.toRating(item.rating),
      price: this.formatPrice(numericPrice),
      numericPrice,
      duration: String(item.duration || 'Tidak tersedia'),
      hours: String(item.hours || item.opening_hours || 'Jam buka tidak tersedia'),
      description,
      highlight,
      facilities: Array.isArray(item.facilities) ? item.facilities.map(String) : [],
    };
  }

  private toRating(value: unknown): number {
    const rating = Number(value);
    return Number.isFinite(rating) && rating > 0 ? Math.min(5, Math.max(0, rating)) : 0;
  }

  /**
   * Returns the price only when the source carries a real value. The scraped
   * catalog stamps every row with a constant placeholder (25000), which is not
   * a verified price, so it is treated as unknown (0).
   */
  private knownPrice(item: any): number {
    const source = Number(item.numericPrice ?? item.price_min_idr ?? 0);
    if (!Number.isFinite(source) || source <= 0 || source === 25000) return 0;
    return source;
  }

  private formatPrice(price: number): string {
    if (price === 0) return 'Harga belum tersedia';
    return `Rp ${price.toLocaleString('id-ID')}`;
  }

  private buildHighlight(category: string, description: string): string {
    const shortDescription = description.replace(/\s+/g, ' ').trim();
    return shortDescription.length > 180 ? shortDescription.slice(0, 177) + '...' :
      shortDescription || 'Highlight belum tersedia.';
  }

  public retrieveRelevantFacts(query: string, targetRegency?: string, targetCategory?: string): DestinationFact[] {
    const pool = this.loadDestinationsData();
    if (!pool.length) return [];

    const normalizedQuery = this.normalize(query);
    const queryTokens = this.tokens(normalizedQuery);
    const detectedRegency = this.detectRegency(normalizedQuery, targetRegency);
    const detectedCategory = this.detectCategory(normalizedQuery, targetCategory);
    const budget = this.extractBudget(normalizedQuery);

    let candidates = pool;
    if (detectedRegency) {
      const regencyKey = this.normalize(detectedRegency).replace(/^(kabupaten|kota)\s+/, '');
      const filteredByReg = pool.filter((destination) => {
        const regency = this.normalize(destination.regency);
        const location = this.normalize(destination.location);
        return regency.includes(regencyKey) || location.includes(regencyKey);
      });
      if (filteredByReg.length > 0) {
        candidates = filteredByReg;
      }
    }

    if (detectedCategory) {
      const filteredByCat = candidates.filter(
        (destination) => this.normalize(destination.category) === this.normalize(detectedCategory),
      );
      if (filteredByCat.length > 0) {
        candidates = filteredByCat;
      }
    }

    const scored = candidates
      .map((destination): ScoredDestination => ({
        destination,
        score: this.scoreDestination(destination, normalizedQuery, queryTokens, detectedRegency, detectedCategory, budget),
      }))
      .filter(({ score }) => score > 0);

    scored.sort((left, right) => right.score - left.score || right.destination.rating - left.destination.rating);

    // When a budget is specified, prioritize items with known prices within budget.
    // If no prices are known, fall back to relevance-scored items rather than an empty list.
    const knownWithinBudget = budget
      ? scored.filter(({ destination }) => destination.numericPrice > 0 && destination.numericPrice <= budget)
      : [];
    const result = knownWithinBudget.length ? knownWithinBudget : scored;
    return result.slice(0, 6).map(({ destination }) => destination);
  }

  private detectRegency(query: string, targetRegency?: string): string {
    if (targetRegency && !['semua', 'pilih'].includes(this.normalize(targetRegency))) {
      return this.regencyAliasMap[this.normalize(targetRegency)] || targetRegency;
    }
    const aliases = Object.keys(this.regencyAliasMap).sort((a, b) => b.length - a.length);
    const found = aliases.find((alias) => query.includes(alias));
    return found ? this.regencyAliasMap[found] : '';
  }

  private detectCategory(query: string, targetCategory?: string): string {
    if (targetCategory && this.normalize(targetCategory) !== 'semua') {
      return this.categoryAliases[this.normalize(targetCategory)] || targetCategory;
    }
    const aliases = Object.keys(this.categoryAliases).sort((a, b) => b.length - a.length);
    const found = aliases.find((alias) => query.includes(alias));
    return found ? this.categoryAliases[found] : '';
  }

  private scoreDestination(
    destination: DestinationFact,
    query: string,
    queryTokens: string[],
    regency: string,
    category: string,
    budget?: number,
  ): number {
    const name = this.normalize(destination.name);
    if (!name) return 0;

    const location = this.normalize(destination.location);
    const description = this.normalize(`${destination.description} ${destination.highlight}`);
    const destinationCategory = this.normalize(destination.category);
    const destinationRegency = this.normalize(destination.regency);

    let matchCount = 0;
    let relevanceScore = 0;

    // Exact or phrase matches
    if (name.length >= 3) {
      if (name === query) {
        relevanceScore += 100;
        matchCount++;
      } else if (query.includes(name)) {
        relevanceScore += 80;
        matchCount++;
      } else if (name.includes(query) && query.length >= 4) {
        relevanceScore += 50;
        matchCount++;
      }
    }

    if (regency) {
      const cleanReg = this.normalize(regency).replace(/^(kabupaten|kota)\s+/, '');
      if (destinationRegency.includes(cleanReg) || location.includes(cleanReg)) {
        relevanceScore += 30;
        matchCount++;
      }
    }

    if (category && destinationCategory === this.normalize(category)) {
      relevanceScore += 35;
      matchCount++;
    }

    // Only match against budget if price is actually known (> 0)
    if (budget && destination.numericPrice > 0 && destination.numericPrice <= budget) {
      relevanceScore += 10;
      matchCount++;
    }

    // Token-based matching
    const nameTokens = name.split(' ').filter((t) => t.length >= 2);
    for (const token of queryTokens) {
      if (this.stopWords.has(token) || token.length < 3) continue;

      if (name.includes(token)) {
        relevanceScore += 25;
        matchCount++;
      } else if (location.includes(token)) {
        relevanceScore += 10;
        matchCount++;
      } else if (description.includes(token)) {
        relevanceScore += 5;
        matchCount++;
      } else {
        // Fast fuzzy check on name tokens
        const sim = this.closestTokenSimilarity(token, nameTokens);
        if (sim >= 0.72) {
          relevanceScore += 20;
          matchCount++;
        }
      }
    }

    // If query has no distinct non-stopwords (e.g. "wisata lampung" or ""), allow general exploration
    if (queryTokens.length === 0) {
      matchCount = 1;
      relevanceScore = 10;
    }

    // If query specified tokens/intent but nothing matched, disqualify
    if (matchCount === 0 || relevanceScore <= 0) {
      return 0;
    }

    let finalScore = relevanceScore + destination.rating * 2;
    if (/(malam|sore|siang)/.test(query) && /18|19|20|21|22/.test(destination.hours)) finalScore += 8;
    if (/(murah|hemat|gratis|terjangkau)/.test(query) && destination.numericPrice > 0 && destination.numericPrice <= 50000) finalScore += 8;

    return finalScore;
  }

  private extractBudget(query: string): number | undefined {
    const match =
      query.match(/(?:dibawah|di bawah|maksimal|max|budget)\s*(?:rp\s*)?([\d.,]+)\s*(ribu|rb|k|juta)?/i) ||
      query.match(/rp\s*([\d.,]+)\s*(ribu|rb|k|juta)?/i);
    if (!match) return undefined;
    let amount = Number(match[1].replace(/[.,]/g, ''));
    const unit = (match[2] || '').toLowerCase();
    if (unit === 'ribu' || unit === 'rb' || unit === 'k') amount *= 1000;
    if (unit === 'juta') amount *= 1_000_000;
    return Number.isFinite(amount) ? amount : undefined;
  }

  private normalize(value: string): string {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private tokens(value: string): string[] {
    return value.split(' ').filter((token) => token.length >= 3 && !this.stopWords.has(token));
  }

  private closestTokenSimilarity(queryToken: string, destinationTokens: string[]): number {
    let maxSim = 0;
    const qLen = queryToken.length;

    for (const token of destinationTokens) {
      const tLen = token.length;
      if (Math.abs(qLen - tLen) > 2) continue;

      const distance = this.levenshtein(queryToken, token);
      const sim = 1 - distance / Math.max(qLen, tLen);
      if (sim > maxSim) maxSim = sim;
    }
    return maxSim;
  }

  private levenshtein(left: string, right: string): number {
    const lLen = left.length;
    const rLen = right.length;
    if (left === right) return 0;
    if (lLen === 0) return rLen;
    if (rLen === 0) return lLen;

    const row = Array.from({ length: rLen + 1 }, (_, index) => index);
    for (let i = 1; i <= lLen; i += 1) {
      let previous = row[0];
      row[0] = i;
      for (let j = 1; j <= rLen; j += 1) {
        const current = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (left[i - 1] === right[j - 1] ? 0 : 1));
        previous = current;
      }
    }
    return row[rLen];
  }

  public buildRagContextPrompt(query: string, regency?: string, category?: string): string {
    const facts = this.retrieveRelevantFacts(query, regency, category);
    if (!facts.length) {
      return 'TIDAK ADA FAKTA SPESIFIK DALAM DATABASE. Jangan mengarang nama, harga, rating, atau jam buka; minta pengguna memperjelas kabupaten atau kategori.';
    }

    const factsText = facts
      .map((fact, index) =>
        [
          `[FAKTA ${index + 1}] ID: "${fact.id}"`,
          `Nama: "${fact.name}"`,
          `Kabupaten/Kota: "${fact.regency}"`,
          `Kategori: "${fact.category}"`,
          `Rating: ${fact.rating > 0 ? fact.rating + '★' : 'belum tersedia'}`,
          `Harga: ${fact.price}`,
          `Jam buka: ${fact.hours}`,
          `Highlight: ${fact.highlight}`,
          `Lokasi: ${fact.location}`,
        ].join(' | '),
      )
      .join('\n');

    return `FAKTA TERVERIFIKASI DATABASE DESTINASI WISATA LAMPUNG (gunakan hanya fakta ini untuk detail destinasi).\nATURAN FAKTA:\n- Jika Harga berbunyi "Harga belum tersedia", sampaikan harga belum tersedia; JANGAN mengarang atau mengestimasi angka harga.\n- Jika Rating berbunyi "belum tersedia", jangan mengarang nilai rating.\n- Jika Jam buka berbunyi "Jam buka tidak tersedia", sampaikan jam buka tidak diketahui.\n- Jika Highlight berbunyi "Highlight belum tersedia.", jangan mengarang deskripsi singkat.\n- Gunakan HANYA fakta di bawah; dilarang mengarang tempat, harga, rating, jam buka, atau fasilitas lain.\n\n${factsText}`;
  }
}
