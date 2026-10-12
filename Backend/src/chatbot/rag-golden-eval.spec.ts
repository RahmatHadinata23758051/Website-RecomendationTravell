import { Test, TestingModule } from '@nestjs/testing';
import * as path from 'path';
import * as fs from 'fs';
import { RagRetrieverService, DestinationFact } from './rag-retriever.service';

/**
 * Golden retrieval evaluation (Sprint 6).
 *
 * Relevance is criteria-based: a returned destination counts as relevant when
 * it satisfies the constraints declared for the query (regency, category,
 * nameContains). Constraints are derived from the real catalog, so the metric
 * measures retrieval quality rather than agreement with hand-picked IDs.
 *
 * Reported metrics: Precision@3, Recall@6 proxy (any relevant in top 6),
 * nDCG@6, and Diversity@6 (unique regencies for broad queries). The suite
 * fails when metrics drop below the committed baseline, catching ranking
 * regressions (e.g. an over-aggressive stemming rule or a broken fusion)
 * without becoming flaky.
 */
describe('RAG Golden Retrieval Evaluation', () => {
  jest.setTimeout(120000);

  let service: RagRetrieverService;

  const evalDir = path.join(process.cwd(), 'eval');
  const goldenPath = path.join(evalDir, 'golden-queries.json');
  const baselinePath = path.join(evalDir, 'baseline-metrics.json');

  interface RelevanceCriteria {
    regency?: string;
    category?: string;
    nameContains?: string;
  }

  interface GoldenQuery {
    id: string;
    query: string;
    type: string;
    relevant: RelevanceCriteria;
  }

  const golden: { queries: GoldenQuery[] } = JSON.parse(fs.readFileSync(goldenPath, 'utf-8'));

  const isRelevant = (fact: DestinationFact, criteria: RelevanceCriteria): boolean => {
    if (criteria.regency && !fact.regency.toLowerCase().includes(criteria.regency)) return false;
    if (criteria.category && fact.category !== criteria.category) return false;
    if (criteria.nameContains && !fact.name.toLowerCase().includes(criteria.nameContains)) return false;
    return true;
  };

  const dcg = (relevances: number[]): number =>
    relevances.reduce((acc, rel, index) => acc + (2 ** rel - 1) / Math.log2(index + 2), 0);

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RagRetrieverService],
    }).compile();
    service = module.get<RagRetrieverService>(RagRetrieverService);
  });

  it('should meet committed baseline retrieval metrics on the golden set', () => {
    const K = 6;
    let precision3Sum = 0;
    let hitRateCount = 0;
    let ndcgSum = 0;
    const diversityValues: number[] = [];

    for (const entry of golden.queries) {
      const results: DestinationFact[] = service.retrieveRelevantFacts(entry.query);
      const relevantFlags = results.slice(0, K).map((fact) => (isRelevant(fact, entry.relevant) ? 1 : 0));

      precision3Sum += relevantFlags.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
      if (relevantFlags.some((flag) => flag === 1)) hitRateCount += 1;

      const idealDcg = dcg(Array(K).fill(1));
      ndcgSum += dcg(relevantFlags) / idealDcg;

      if (process.env.RAG_EVAL_CALIBRATE === '1') {
        // eslint-disable-next-line no-console
        console.log(
          `[RAG EVAL CALIBRATE] ${entry.id} -> ${results
            .slice(0, K)
            .map((r, i) => `${relevantFlags[i] ? 'R' : '-'}${r.name}`)
            .join(' | ')}`,
        );
      } else if (!relevantFlags.some((flag) => flag === 1)) {
        // eslint-disable-next-line no-console
        console.log(
          `[RAG EVAL MISS] ${entry.id} (${entry.query}) -> ${results
            .slice(0, K)
            .map((r) => r.name)
            .join(' | ')}`,
        );
      }

      // Diversity is only meaningful for queries without an explicit regency
      // filter, mirroring how the service itself disables MMR under filters.
      if (!entry.relevant.regency) {
        diversityValues.push(new Set(results.map((r) => r.regency)).size);
      }
    }

    const precisionAt3 = precision3Sum / golden.queries.length;
    const hitRate = hitRateCount / golden.queries.length;
    const ndcg = ndcgSum / golden.queries.length;
    const avgDiversity = diversityValues.length
      ? diversityValues.reduce((a, b) => a + b, 0) / diversityValues.length
      : 0;

    // eslint-disable-next-line no-console
    console.log('[RAG EVAL]', JSON.stringify({ precisionAt3, hitRate, ndcg, avgDiversity }, null, 2));

    // Compare against the committed baseline, if present. Updating it is an
    // explicit maintainer action so a regression cannot silently lower the gate.
    if (fs.existsSync(baselinePath)) {
      const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
      expect(precisionAt3).toBeGreaterThanOrEqual((baseline.precisionAt3 ?? 0) - 0.1);
      expect(hitRate).toBeGreaterThanOrEqual((baseline.hitRate ?? 0) - 0.05);
      expect(ndcg).toBeGreaterThanOrEqual((baseline.ndcg ?? 0) - 0.02);
      expect(avgDiversity).toBeGreaterThanOrEqual((baseline.avgDiversity ?? 0) - 1);
    } else {
      expect(precisionAt3).toBeGreaterThan(0.5);
      expect(hitRate).toBeGreaterThan(0.7);
      expect(ndcg).toBeGreaterThan(0.3);
    }

    if (process.env.RAG_EVAL_WRITE_BASELINE === '1') {
      fs.writeFileSync(
        baselinePath,
        JSON.stringify({ precisionAt3, hitRate, ndcg, avgDiversity }, null, 2) + '\n',
      );
      // eslint-disable-next-line no-console
      console.log('[RAG EVAL] Wrote baseline-metrics.json');
    }
  });
});
