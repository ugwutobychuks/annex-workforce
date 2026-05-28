import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';

export const INDEX_CANDIDATES = 'candidates';
export const INDEX_JOBS = 'jobs';

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private readonly client: Client;

  constructor(config: ConfigService) {
    this.client = new Client({
      node: config.get<string>('ELASTICSEARCH_URL', 'http://localhost:9200'),
      requestTimeout: 30_000,
    });
  }

  async onModuleInit() {
    try {
      await this.client.ping();
      this.logger.log('🔎 Elasticsearch connected');
      await this.ensureIndices();
    } catch (e) {
      this.logger.warn(`Elasticsearch not reachable: ${(e as Error).message}`);
    }
  }

  private async ensureIndices() {
    const indices = [
      {
        index: INDEX_CANDIDATES,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            userId: { type: 'keyword' },
            firstName: { type: 'text' },
            lastName: { type: 'text' },
            headline: { type: 'text' },
            summary: { type: 'text' },
            location: { type: 'keyword' },
            country: { type: 'keyword' },
            yearsOfExperience: { type: 'integer' },
            expectedSalary: { type: 'float' },
            availability: { type: 'keyword' },
            skills: { type: 'keyword' },
            verificationLevel: { type: 'keyword' },
          },
        },
      },
      {
        index: INDEX_JOBS,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            title: { type: 'text' },
            description: { type: 'text' },
            location: { type: 'keyword' },
            country: { type: 'keyword' },
            workArrangement: { type: 'keyword' },
            employmentType: { type: 'keyword' },
            seniority: { type: 'keyword' },
            salaryMin: { type: 'float' },
            salaryMax: { type: 'float' },
            skills: { type: 'keyword' },
            employerName: { type: 'text' },
            publishedAt: { type: 'date' },
          },
        },
      },
    ];

    for (const def of indices) {
      const exists = await this.client.indices.exists({ index: def.index });
      if (!exists) {
        await this.client.indices.create({ index: def.index, mappings: def.mappings as any });
        this.logger.log(`📑 Created index: ${def.index}`);
      }
    }
  }

  async indexDoc(index: string, id: string, body: Record<string, unknown>) {
    return this.client.index({ index, id, document: body, refresh: 'wait_for' });
  }

  async deleteDoc(index: string, id: string) {
    try {
      await this.client.delete({ index, id });
    } catch {
      /* swallow 404 */
    }
  }

  async search(
    index: string,
    query: Record<string, unknown>,
    opts: { from?: number; size?: number; sort?: any } = {},
  ) {
    const result = await this.client.search({
      index,
      from: opts.from ?? 0,
      size: opts.size ?? 20,
      query: query as any,
      sort: opts.sort,
    });
    return {
      total: typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value ?? 0,
      hits: result.hits.hits.map((h) => ({ id: h._id, score: h._score, ...(h._source as object) })),
    };
  }
}
