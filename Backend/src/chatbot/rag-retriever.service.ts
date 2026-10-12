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

interface SemanticDocument {
  id: string;
  termFrequency: Map<string, number>;
  length: number;
}

@Injectable()
export class RagRetrieverService implements OnModuleInit {
  private readonly logger = new Logger(RagRetrieverService.name);
  private destinationsPool: DestinationFact[] = [];
  private dataLoaded = false;

  // BM25 semantic index structures (in-process)
  private readonly documentFrequency = new Map<string, number>();
  private readonly semanticDocs = new Map<string, SemanticDocument>();
  private avgDocLength = 0;
  private corpusSize = 0;

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

  // Indonesian light stemmer: zero-dependency and domain-tuned. It strips the
  // most common derivational prefixes/suffixes so morphological variants such
  // as "berpasir" (pasir), "menyelam" (selam) or "menginap" (inap) collapse to
  // the same BM25 term. Deliberately conservative: it never stems a token below
  // three characters and never touches the protected domain vocabulary below.
  private readonly indoPrefixes = [
    'memper', 'menge', 'meng', 'meny', 'mem', 'men', 'me',
    'peng', 'peny', 'pem', 'pen',
    'ber', 'bel', 'be',
    'ter', 'tel', 'te',
    'per', 'pel', 'pe',
    'di', 'ke', 'se',
  ].sort((a, b) => b.length - a.length); // longest prefix first

  private readonly indoSuffixes = [
    'kannya', 'annya', 'kan', 'nya', 'wan', 'wati', 'an', 'i',
  ].sort((a, b) => b.length - a.length); // longest suffix first

  // Words that must never be reduced further: core tourism vocabulary whose
  // trailing "an"/"i" is part of the root, not a suffix.
  private readonly protectedStems = new Set([
    'pengunjung', 'pendaki', 'penyelam', 'pemandu', 'penginapan',
    'pengelola', 'perairan', 'pesisir', 'gunung', 'pantai', 'danau',
    'pulau', 'bukit', 'sungai', 'seruit', 'lampung', 'pahawang',
    'krui', 'liwa', 'teluk', 'kiluan', 'way', 'kanan', 'mesuji',
  ]);

  // Domain overrides applied before rule-based stripping, for irregular verbs
  // whose rule-based stem would be wrong ("menyelam" -> "yelam").
  private readonly domainStemOverrides = new Map<string, string>([
    ['berpasir', 'pasir'],
    ['berair', 'air'],
    ['berselancar', 'selancar'],
    ['menyelam', 'selam'],
    ['penyelaman', 'selam'],
    ['mengunjungi', 'kunjungi'],
    ['menginap', 'inap'],
    ['menikmati', 'nikmati'],
    ['membeli', 'beli'],
    ['memakan', 'makan'],
    ['minum', 'minum'],
    ['mendaki', 'daki'],
  ]);

  /**
   * Forces an in-place reload of the destination dataset and rebuilds the BM25
   * semantic index. Intended to be called when an administrator promotes a new
   * submission or when dataset files on disk change.
   */
  public refreshIndex(): DestinationFact[] {
    this.logger.log('[RAG RETRIEVER] Triggering manual/event-driven index refresh...');
    this.dataLoaded = false;
    this.destinationsPool = [];
    this.documentFrequency.clear();
    this.semanticDocs.clear();
    this.corpusSize = 0;
    this.avgDocLength = 0;
    return this.loadDestinationsData();
  }

  /**
   * Adds or replaces a destination that was just approved and synchronized to
   * the ML catalog. This is intentionally fed by the verified submission payload
   * rather than by synthetic data or a second network read, so chatbot retrieval
   * becomes current immediately even though the static frontend catalog changes
   * only on the next data release.
   */
  public upsertDestination(destination: Record<string, unknown>): DestinationFact {
    this.loadDestinationsData();
    const fact = this.toDestinationFact(destination, this.destinationsPool.length);
    const existingIndex = this.destinationsPool.findIndex((item) => item.id === fact.id);

    if (existingIndex >= 0) {
      this.destinationsPool[existingIndex] = fact;
    } else {
      this.destinationsPool.push(fact);
    }

    this.buildSemanticIndex();
    this.logger.log(`[RAG RETRIEVER] Upserted approved destination ${fact.id}; indexed ${this.destinationsPool.length} destinations.`);
    return fact;
  }

  /**
   * Loads the approved crowdsourced catalog overlay from the ML engine store and
   * merges it with the static catalog. The overlay is stored as a JSON file
   * (default path: Machine-Learning/Data/consolidated/approved_catalog_submissions.json)
   * which can be overridden via the CATALOG_SUBMISSIONS_PATH environment variable.
   *
   * Deduplication is by canonical_id: if an overlay record shares the same
   * canonical_id as a static catalog entry, the static entry wins to preserve
   * data provenance. Only truly new destinations are appended.
   */
  private mergeApprovedCatalogOverlay(): void {
    const overlayPath = this.resolveCatalogOverlayPath();
    if (!overlayPath || !fs.existsSync(overlayPath)) {
      this.logger.debug('[RAG RETRIEVER] No approved catalog overlay found; using static catalog only.');
      return;
    }

    try {
      const raw = JSON.parse(fs.readFileSync(overlayPath, 'utf-8'));
      const records = Array.isArray(raw) ? raw : raw.records || [];

      const existingIds = new Set(this.destinationsPool.map((d) => d.id));
      const overlayFacts: DestinationFact[] = [];

      for (const record of records) {
        const canonicalId = String(record?.canonical_id || record?.id || '').trim();
        if (!canonicalId || existingIds.has(canonicalId)) continue;

        // Map overlay record to the same schema as the static catalog.
        const mapped: Record<string, unknown> = {
          canonical_id: canonicalId,
          name: record.name,
          primary_category: record.primary_category,
          category: record.category,
          city_or_regency: record.city_or_regency,
          address: record.address,
          district: record.district,
          village: record.village,
          latitude: record.latitude,
          longitude: record.longitude,
          description: record.description,
          image_url: record.image_url,
          facilities: record.facilities,
          opening_hours: record.opening_hours,
          price_min_idr: record.price_min_idr,
          price_max_idr: record.price_max_idr,
          price_status: record.price_status,
          operational_status: record.operational_status,
          review_count: record.review_count,
          review_rating_mean: record.review_rating_mean,
        };

        const fact = this.toDestinationFact(mapped, this.destinationsPool.length + overlayFacts.length);
        overlayFacts.push(fact);
        existingIds.add(canonicalId);
      }

      if (overlayFacts.length > 0) {
        this.destinationsPool.push(...overlayFacts);
        this.logger.log(`[RAG RETRIEVER] Merged ${overlayFacts.length} approved catalog overlay entries.`);
      }
    } catch (error) {
      this.logger.warn(`[RAG RETRIEVER] Failed to load approved catalog overlay: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Resolves the path to the approved catalog overlay JSON.
   * Priority: CATALOG_SUBMISSIONS_PATH env var -> package-relative default.
   */
  private resolveCatalogOverlayPath(): string | null {
    const configured = process.env.CATALOG_SUBMISSIONS_PATH;
    if (configured) {
      return path.resolve(configured);
    }
    // Default: relative to this compiled file (dist/chatbot/rag-retriever.service.js)
    // Goes up to project root, then into Machine-Learning/Data/consolidated/
    const projectRoot = path.join(__dirname, '..', '..', '..', '..');
    const defaultPath = path.join(projectRoot, 'Machine-Learning', 'Data', 'consolidated', 'approved_catalog_submissions.json');
    return defaultPath;
  }

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
    } else {
      this.mergeApprovedCatalogOverlay();
      this.buildSemanticIndex();
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
    const name = this.sanitizeCatalogText(String(item.name || ''), 300);
    let category = this.categoryAliases[rawCategory] || this.categoryAliases[rawCategory.replace(/[-_]/g, ' ')] || 'Alam';
    if (this.isCulinary(name, item.description, rawCategory)) {
      category = 'Kuliner';
    }

    const regency = String(item.city_or_regency || item.regency || '').trim();
    const location = String(item.address || item.location || regency).trim();
    const numericPrice = this.knownPrice(item);
    const description = this.sanitizeCatalogText(String(item.description || item.summary || ''), 2000) || 'Deskripsi belum tersedia.';
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
      facilities: Array.isArray(item.facilities)
        ? item.facilities.map((facility: unknown) => this.sanitizeCatalogText(String(facility), 120)).filter(Boolean)
        : [],
    };
  }

  /**
   * Defensive cleanup for scraped catalog text before it enters the BM25 index
   * or the LLM prompt: removes control characters, collapses whitespace, caps
   * length, and neutralises prompt-injection markers (role headers, instruction
   * overrides, markdown fences). Only text is changed; no content is invented.
   */
  private sanitizeCatalogText(value: string, maxLength: number): string {
    const injectionPatterns: RegExp[] = [
      /ignore (all |any )?(previous|above|prior) (instructions?|prompts?)/gi,
      /abaikan (semua |seluruh )?(instruksi|perintah)( sebelumnya)?/gi,
      /\b(system|assistant|user)\s*:/gi,
      /```+/g,
      /#{2,}/g,
    ];

    let cleaned = value
      .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\ufeff]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    for (const pattern of injectionPatterns) {
      cleaned = cleaned.replace(pattern, ' ');
    }

    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned.length > maxLength ? cleaned.slice(0, maxLength).trim() : cleaned;
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

  /**
   * Builds an in-process BM25 index over name, category, regency, location,
   * description, highlight and facilities. Pure local computation: no external
   * service, no embedding API, deterministic and offline.
   */
  private buildSemanticIndex(): void {
    this.documentFrequency.clear();
    this.semanticDocs.clear();

    let totalLength = 0;
    this.destinationsPool.forEach((destination) => {
      const text = [
        destination.name,
        destination.name,            // name is the strongest signal: repeat once
        destination.category,
        destination.regency,
        destination.location,
        destination.description,
        destination.highlight,
        ...destination.facilities,
      ].join(' ');

      const tokens = this.semanticTokens(text);
      const termFrequency = new Map<string, number>();
      tokens.forEach((token) => termFrequency.set(token, (termFrequency.get(token) || 0) + 1));
      termFrequency.forEach((_, term) => {
        this.documentFrequency.set(term, (this.documentFrequency.get(term) || 0) + 1);
      });

      this.semanticDocs.set(destination.id, { id: destination.id, termFrequency, length: tokens.length });
      totalLength += tokens.length;
    });

    this.corpusSize = this.destinationsPool.length;
    this.avgDocLength = this.corpusSize ? totalLength / this.corpusSize : 0;
    this.logger.log(`[RAG SEMANTIC] BM25 index built: ${this.corpusSize} docs, ${this.documentFrequency.size} terms.`);
  }

  private semanticTokens(value: string): string[] {
    return this.normalize(value)
      .split(' ')
      .filter((token) => token.length >= 3 && !this.stopWords.has(token))
      .map((token) => this.indoStem(token))
      .filter((token) => token.length >= 3);
  }

  /**
   * Conservative Indonesian stemmer. Applies domain overrides first, then strips
   * at most one derivational prefix and one suffix. The stem is only accepted
   * when it keeps at least three characters; otherwise the original is kept.
   */
  private indoStem(token: string): string {
    if (this.protectedStems.has(token)) return token;

    const override = this.domainStemOverrides.get(token);
    if (override) return override;

    let stem = token;

    const prefix = this.indoPrefixes.find(
      (candidate) => stem.startsWith(candidate) && stem.length - candidate.length >= 3,
    );
    if (prefix) stem = stem.slice(prefix.length);

    const suffix = this.indoSuffixes.find(
      (candidate) => stem.endsWith(candidate) && stem.length - candidate.length >= 3,
    );
    if (suffix) stem = stem.slice(0, stem.length - suffix.length);

    return stem.length >= 3 ? stem : token;
  }

  /**
   * Okapi BM25 ranking over the in-process index. Returns destinations with a
   * positive score, best first. Scores are not normalized and are only used for
   * ordering within the hybrid fusion.
   */
  public semanticSearch(query: string, limit = 20): DestinationFact[] {
    const pool = this.loadDestinationsData();
    if (!pool.length || !this.corpusSize) return [];

    const queryTerms = [...new Set(this.semanticTokens(query))];
    if (!queryTerms.length) return [];

    const k1 = 1.2;
    const b = 0.75;
    const scored: ScoredDestination[] = [];

    for (const destination of pool) {
      const doc = this.semanticDocs.get(destination.id);
      if (!doc) continue;

      let score = 0;
      for (const term of queryTerms) {
        const tf = doc.termFrequency.get(term);
        if (!tf) continue;
        const df = this.documentFrequency.get(term) || 0;
        const idf = Math.log(1 + (this.corpusSize - df + 0.5) / (df + 0.5));
        const norm = tf + k1 * (1 - b + (b * doc.length) / (this.avgDocLength || 1));
        score += idf * ((tf * (k1 + 1)) / norm);
      }

      if (score > 0) scored.push({ destination, score });
    }

    scored.sort((left, right) => right.score - left.score);
    return scored.slice(0, limit).map(({ destination }) => destination);
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
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score);

    // Hybrid fusion: combine the keyword/fuzzy ranking with the BM25 semantic
    // ranking using Reciprocal Rank Fusion. RRF is scale-agnostic, so the two
    // systems (raw keyword score vs. BM25 score) can be merged safely.
    const fused = this.reciprocalRankFusion(scored, candidates, normalizedQuery);

    // When a budget is specified, prioritize items with known prices within budget.
    // If no prices are known, fall back to relevance-scored items rather than an empty list.
    const knownWithinBudget = budget
      ? fused.filter(({ destination }) => destination.numericPrice > 0 && destination.numericPrice <= budget)
      : [];
    const ranked = knownWithinBudget.length ? knownWithinBudget : fused;

    // Diversify the final shortlist (MMR-style) so a broad query such as
    // "pantai di lampung" is not answered with six places from one regency.
    // Diversity only applies when the user did not ask for a specific regency or
    // category. An explicit constraint is a hard filter and must never be traded
    // away for variety.
    const diversified = this.applyMmrDiversity(ranked, 6, {
      regency: !detectedRegency,
      category: !detectedCategory,
    });
    return diversified.map(({ destination }) => destination);
  }

  /**
   * Maximal Marginal Relevance-style re-ranking. It greedily picks the best
   * remaining candidate while penalising items that repeat the regency or
   * category already represented in the selection. Relevance stays dominant;
   * diversity only breaks near-ties.
   */
  private applyMmrDiversity(
    ranked: ScoredDestination[],
    limit: number,
    options: { regency: boolean; category: boolean },
  ): ScoredDestination[] {
    if (ranked.length <= 1 || (!options.regency && !options.category)) {
      return ranked.slice(0, limit);
    }

    const selected: ScoredDestination[] = [];
    const remaining = [...ranked];

    // Normalise scores so the diversity penalty (0..1) is comparable in scale.
    const maxScore = Math.max(...remaining.map((entry) => entry.score)) || 1;
    const REGENCY_PENALTY = 0.25;
    const CATEGORY_PENALTY = 0.15;

    while (selected.length < limit && remaining.length > 0) {
      let bestIndex = 0;
      let bestAdjusted = -Infinity;

      remaining.forEach((candidate, index) => {
        const normalized = candidate.score / maxScore;
        let penalty = 0;
        for (const chosen of selected) {
          if (options.regency && candidate.destination.regency && candidate.destination.regency === chosen.destination.regency) {
            penalty += REGENCY_PENALTY;
          }
          if (options.category && candidate.destination.category && candidate.destination.category === chosen.destination.category) {
            penalty += CATEGORY_PENALTY;
          }
        }
        const adjusted = normalized - penalty;
        if (adjusted > bestAdjusted) {
          bestAdjusted = adjusted;
          bestIndex = index;
        }
      });

      selected.push(remaining.splice(bestIndex, 1)[0]);
    }

    return selected;
  }

  /**
   * Reciprocal Rank Fusion of the keyword ranking and the BM25 semantic
   * ranking over the same candidate set. k=60 is the standard RRF constant.
   */
  private reciprocalRankFusion(
    keywordScored: ScoredDestination[],
    candidates: DestinationFact[],
    normalizedQuery: string,
  ): ScoredDestination[] {
    const k = 60;
    const fusedScores = new Map<string, number>();
    const byId = new Map<string, DestinationFact>();

    keywordScored.forEach((entry, index) => {
      byId.set(entry.destination.id, entry.destination);
      fusedScores.set(entry.destination.id, 1 / (k + index + 1));
    });

    const semanticQueryTerms = [...new Set(this.semanticTokens(normalizedQuery))];
    const semanticRanking = candidates
      .map((destination) => ({
        destination,
        score: this.semanticScore(destination, semanticQueryTerms),
      }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score);

    semanticRanking.forEach(({ destination }, index) => {
      byId.set(destination.id, destination);
      fusedScores.set(destination.id, (fusedScores.get(destination.id) || 0) + 1 / (k + index + 1));
    });

    return [...fusedScores.entries()]
      .map(([id, score]) => ({ destination: byId.get(id)!, score }))
      .filter(({ destination }) => Boolean(destination))
      .sort((left, right) => right.score - left.score);
  }

  /** BM25 score of a single destination against the query terms. */
  private semanticScore(destination: DestinationFact, queryTerms: string[]): number {
    const doc = this.semanticDocs.get(destination.id);
    if (!doc) return 0;

    const k1 = 1.2;
    const b = 0.75;
    let score = 0;

    for (const term of queryTerms) {
      const tf = doc.termFrequency.get(term);
      if (!tf) continue;
      const df = this.documentFrequency.get(term) || 0;
      const idf = Math.log(1 + (this.corpusSize - df + 0.5) / (df + 0.5));
      const norm = tf + k1 * (1 - b + (b * doc.length) / (this.avgDocLength || 1));
      score += idf * ((tf * (k1 + 1)) / norm);
    }

    return score;
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

  public buildRagContextPrompt(
    query: string,
    regency?: string,
    category?: string,
    providedFacts?: DestinationFact[],
  ): string {
    const facts = providedFacts ?? this.retrieveRelevantFacts(query, regency, category);
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
