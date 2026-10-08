import { Test, TestingModule } from '@nestjs/testing';
import { RagRetrieverService } from './rag-retriever.service';

describe('RagRetrieverService', () => {
  let service: RagRetrieverService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RagRetrieverService],
    }).compile();

    service = module.get<RagRetrieverService>(RagRetrieverService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('loadDestinationsData', () => {
    it('should load dataset and index destinations without throwing', () => {
      expect(() => service.loadDestinationsData()).not.toThrow();
      const pool = service.loadDestinationsData();
      expect(Array.isArray(pool)).toBe(true);
      expect(pool.length).toBeGreaterThan(0);
    });

    it('should return consistent instances on repeated calls', () => {
      const first = service.loadDestinationsData();
      const second = service.loadDestinationsData();
      expect(first).toBe(second);
    });

    it('should contain expected fields on each destination fact', () => {
      const pool = service.loadDestinationsData();
      const fact = pool[0];
      expect(fact).toEqual(expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        location: expect.any(String),
        regency: expect.any(String),
        category: expect.any(String),
        rating: expect.any(Number),
        price: expect.any(String),
        numericPrice: expect.any(Number),
        duration: expect.any(String),
        hours: expect.any(String),
        description: expect.any(String),
        highlight: expect.any(String),
        facilities: expect.any(Array),
      }));
      expect(fact.rating).toBeGreaterThanOrEqual(0);
      expect(fact.rating).toBeLessThanOrEqual(5);
    });
  });

  describe('retrieveRelevantFacts', () => {
    it('should return empty array when the dataset is empty', () => {
      (service as any).destinationsPool = [];
      (service as any).dataLoaded = true;
      const result = service.retrieveRelevantFacts('pantai');
      expect(result).toEqual([]);
    });

    it('should filter by regency alias when specified in query', () => {
      const results = service.retrieveRelevantFacts('rekomendasi pantai di Pesawaran');
      const regencies = new Set(results.map((r) => r.regency));
      expect(regencies.size).toBeGreaterThan(0);
      for (const regency of regencies) {
        expect(regency.toLowerCase()).toContain('pesawaran');
      }
    });

    it('should filter by category alias when specified in query', () => {
      const results = service.retrieveRelevantFacts('kuliner lampung');
      expect(results.length).toBeGreaterThan(0);
      for (const dest of results) {
        expect(dest.category).toBe('Kuliner');
      }
    });

    it('should respect explicit targetRegency parameter', () => {
      const results = service.retrieveRelevantFacts('wisata alam', 'lampung selatan', undefined);
      for (const dest of results) {
        expect(dest.regency.toLowerCase()).toContain('lampung selatan');
      }
    });

    it('should respect explicit targetCategory parameter', () => {
      const results = service.retrieveRelevantFacts('wisata', undefined, 'Pantai');
      for (const dest of results) {
        expect(dest.category).toBe('Pantai');
      }
    });

    it('should rank by keyword relevance and rating', () => {
      const results = service.retrieveRelevantFacts('Pahawang');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name.toLowerCase()).toContain('pahawang');
    });

    it('should enforce budget constraint when present in query', () => {
      const results = service.retrieveRelevantFacts('pantai dibawah 50 ribu');
      for (const dest of results) {
        expect(dest.numericPrice).toBeLessThanOrEqual(50000);
      }
    });

    it('should return at most 6 results', () => {
      const results = service.retrieveRelevantFacts('wisata lampung');
      expect(results.length).toBeLessThanOrEqual(6);
    });

    it('should handle typos and fuzzy matches', () => {
      const results = service.retrieveRelevantFacts('pahwang snorkling');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name.toLowerCase()).toContain('pahawang');
    });
  });

  describe('buildRagContextPrompt', () => {
    it('should return fallback message when no facts match', () => {
      const prompt = service.buildRagContextPrompt('xyz123nonexistent');
      expect(prompt).toContain('TIDAK ADA FAKTA SPESIFIK');
    });

    it('should format each fact with structured fields', () => {
      const prompt = service.buildRagContextPrompt('pantai Pesawaran');
      expect(prompt).toContain('FAKTA TERVERIFIKASI');
      expect(prompt).toContain('[FAKTA 1]');
      expect(prompt).toMatch(/ID: ".*"/);
      expect(prompt).toMatch(/Nama: ".*"/);
      expect(prompt).toMatch(/Kabupaten\/Kota: ".*"/);
      expect(prompt).toMatch(/Kategori: ".*"/);
      expect(prompt).toMatch(/Rating: [\d.]+★/);
      expect(prompt).toMatch(/Harga: Rp/);
      expect(prompt).toMatch(/Jam buka: /);
      expect(prompt).toMatch(/Highlight: /);
    });

    it('should limit context to top matches', () => {
      const prompt = service.buildRagContextPrompt('wisata lampung');
      const factMatches = prompt.match(/\[FAKTA \d+\]/g);
      expect(factMatches?.length ?? 0).toBeLessThanOrEqual(6);
    });
  });
});