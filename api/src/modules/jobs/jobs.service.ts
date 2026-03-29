import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { randomUUID } from 'crypto';
import { CreateJobDto } from './dto/create-job.dto';
import { GetListJobDto, GetJobListResponse } from './dto/get-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { Job, JobDocument, JobItemStatus } from './entities/job.entity';
import { RedisService } from '../../shared/redis/redis.service';
import { RulesService } from '../rules/rules.service';
import { ProductsService } from '../products/products.service';
import { computePriceLine } from '../quotes/quote-pricing';
import * as fs from 'fs/promises';

@Injectable()
export class JobsService {
  private readonly listCacheVersionKey = 'jobs:list:version';

  constructor(
    @InjectModel(Job.name) private readonly jobModel: Model<JobDocument>,
    private readonly redisService: RedisService,
    private readonly rulesService: RulesService,
    private readonly productsService: ProductsService,
  ) {}

  async findWithQuery(query: QueryFilter<JobDocument>): Promise<Job[]> {
    return this.jobModel.find(query).lean();
  }

  async findAllList(dto: GetListJobDto): Promise<GetJobListResponse> {
    const { page = 1, pageSize = 10 } = dto;
    const skip = (page - 1) * pageSize;

    const version = await this.redisService.getInt(this.listCacheVersionKey, 1);
    const cacheKey = `jobs:list:v${version}:page=${page}:pageSize=${pageSize}`;
    const cached =
      await this.redisService.getJson<GetJobListResponse>(cacheKey);
    if (cached) return cached;

    const [total, items] = await Promise.all([
      this.jobModel.countDocuments(),
      this.jobModel
        .find()
        .skip(skip)
        .limit(pageSize)
        .sort({ createdAt: -1, jobId: 1 })
        .lean(),
    ]);

    const res: GetJobListResponse = { page, pageSize, total, data: items };
    await this.redisService.setJson(cacheKey, res, 30);
    return res;
  }

  async create(createJobDto: CreateJobDto): Promise<Job> {
    const jobId = createJobDto.jobId?.trim() || randomUUID();
    const dup = await this.jobModel.findOne({ jobId }).lean();
    if (dup) {
      throw new ConflictException(`Job with jobId ${jobId} already exists`);
    }

    const quoteAt = new Date();

    const rulesForQuote = await this.rulesService.findWithQuery({
      is_active: true,
      effective_from: { $lte: quoteAt },
      effective_to: { $gte: quoteAt },
    });

    const jobDistanceKm = createJobDto.distanceKm;

    const items: Array<{
      index: number;
      productId: string;
      quantity: number;
      status: JobItemStatus;
      finalPrice: number;
      appliedRules: number[];
    }> = [];

    for (let idx = 0; idx < createJobDto.items.length; idx++) {
      const item = createJobDto.items[idx];
      const product = await this.productsService.findOne(item.productId);
      if (!product.is_active) {
        throw new BadRequestException(
          `Product ${item.productId} is not available for pricing`,
        );
      }

      const { finalPrice, appliedRuleIds } = computePriceLine({
        unitPrice: product.price,
        unitWeightKg: product.weight,
        quantity: item.quantity,
        quoteAt,
        distanceKm: jobDistanceKm,
        rules: rulesForQuote,
      });

      items.push({
        index: item.index ?? idx,
        productId: item.productId,
        quantity: item.quantity,
        status: 'success',
        finalPrice,
        appliedRules: appliedRuleIds,
      });
    }

    const doc = await this.jobModel.create({
      jobId,
      status: 'completed',
      ...(jobDistanceKm != null && { distanceKm: jobDistanceKm }),
      items,
      is_active: createJobDto.is_active ?? true,
    });
    await this.redisService.incr(this.listCacheVersionKey);
    return doc.toObject();
  }

  async findOne(jobId: string): Promise<Job> {
    const version = await this.redisService.getInt(this.listCacheVersionKey, 1);
    const cacheKey = `jobs:one:v${version}:${jobId}`;
    const cached = await this.redisService.getJson<Job>(cacheKey);
    if (cached) return cached;

    const job = await this.jobModel.findOne({ jobId }).lean();
    if (!job) {
      throw new NotFoundException(`Job with jobId ${jobId} not found`);
    }
    await this.redisService.setJson(cacheKey, job, 30);
    return job;
  }

  async update(jobId: string, updateJobDto: UpdateJobDto): Promise<Job> {
    const job = await this.jobModel
      .findOneAndUpdate({ jobId }, updateJobDto, { new: true })
      .lean();
    if (!job) {
      throw new NotFoundException(`Job with jobId ${jobId} not found`);
    }
    await this.redisService.incr(this.listCacheVersionKey);
    return job;
  }

  async remove(jobId: string): Promise<Job> {
    const job = await this.jobModel
      .findOneAndUpdate({ jobId }, { is_active: false }, { new: true })
      .lean();
    if (!job) {
      throw new NotFoundException(`Job with jobId ${jobId} not found`);
    }
    await this.redisService.incr(this.listCacheVersionKey);
    return job;
  }

  async syncJsonData(): Promise<void> {
    const jsonData = await fs.readFile('data/jobs.json', 'utf8');
    const rows: Array<
      Partial<Job> & {
        jobId: string;
        items?: Array<{
          index?: number;
          productId: string;
          quantity: number;
          status?: JobItemStatus;
          finalPrice?: number;
          appliedRules?: string[];
        }>;
      }
    > = JSON.parse(jsonData);

    if (!Array.isArray(rows) || rows.length === 0) {
      await this.redisService.incr(this.listCacheVersionKey);
      return;
    }

    const ops = rows.map((raw) => {
      const itemRows = raw.items ?? [];
      const items = itemRows.map((item, idx) => ({
        index: item.index ?? idx,
        productId: item.productId,
        quantity: item.quantity,
        status: item.status ?? 'pending',
        finalPrice: item.finalPrice ?? 0,
        appliedRules: item.appliedRules ?? [],
      }));

      return {
        updateOne: {
          filter: { jobId: raw.jobId },
          update: {
            $set: {
              jobId: raw.jobId,
              status: raw.status ?? 'queued',
              ...(raw.distanceKm != null && { distanceKm: raw.distanceKm }),
              items,
              is_active: raw.is_active ?? true,
            },
          },
          upsert: true,
        },
      } as const;
    });

    await this.jobModel.bulkWrite(ops, { ordered: false });
    await this.redisService.incr(this.listCacheVersionKey);
  }
}
