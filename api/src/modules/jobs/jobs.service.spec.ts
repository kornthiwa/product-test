import * as fs from 'fs/promises';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { Job } from './entities/job.entity';
import { RedisService } from '../../shared/redis/redis.service';
import { RulesService } from '../rules/rules.service';
import { ProductsService } from '../products/products.service';
import { RuleTypeEnum, RuleTypeValueEnum } from '../rules/entities/rule.entity';
import { GetListJobDto } from './dto/get-job.dto';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

type QueryChain<T> = {
  skip: jest.Mock;
  limit: jest.Mock;
  sort: jest.Mock;
  lean: jest.Mock<Promise<T>, []>;
};

function createQueryChain<T>(result: T): QueryChain<T> {
  const chain: QueryChain<T> = {
    skip: jest.fn(),
    limit: jest.fn(),
    sort: jest.fn(),
    lean: jest.fn(),
  };

  chain.skip.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.sort.mockReturnValue(chain);
  chain.lean.mockResolvedValue(result);

  return chain;
}

describe('JobsService', () => {
  let service: JobsService;

  const redisService = {
    getInt: jest.fn(),
    getJson: jest.fn(),
    setJson: jest.fn(),
    incr: jest.fn(),
  };

  const jobModel = {
    countDocuments: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
    bulkWrite: jest.fn(),
  };

  const rulesService = {
    findWithQuery: jest.fn(),
  };

  const productsService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: RedisService, useValue: redisService },
        { provide: getModelToken(Job.name), useValue: jobModel },
        { provide: RulesService, useValue: rulesService },
        { provide: ProductsService, useValue: productsService },
      ],
    }).compile();

    service = moduleRef.get(JobsService);
    jest.resetAllMocks();
  });

  it('findAllList() should return cached value when cache hit', async () => {
    redisService.getInt.mockResolvedValue(1);
    redisService.getJson.mockResolvedValue({
      page: 1,
      pageSize: 10,
      total: 2,
      data: [{ jobId: '1' }],
    });

    await expect(
      service.findAllList({ page: 1, pageSize: 10 } as GetListJobDto),
    ).resolves.toEqual({
      page: 1,
      pageSize: 10,
      total: 2,
      data: [{ jobId: '1' }],
    });

    expect(redisService.getInt).toHaveBeenCalledWith('jobs:list:version', 1);
    expect(redisService.getJson).toHaveBeenCalledWith(
      'jobs:list:v1:page=1:pageSize=10',
    );
    expect(jobModel.countDocuments).not.toHaveBeenCalled();
    expect(jobModel.find).not.toHaveBeenCalled();
  });

  it('findAllList() should query DB and cache when cache miss', async () => {
    redisService.getInt.mockResolvedValue(1);
    redisService.getJson.mockResolvedValue(null);
    jobModel.countDocuments.mockResolvedValue(2);
    const chain = createQueryChain([{ jobId: '1' }, { jobId: '2' }]);
    jobModel.find.mockReturnValue(chain);

    const res = await service.findAllList({
      page: 1,
      pageSize: 10,
    } as GetListJobDto);

    expect(res).toEqual({
      page: 1,
      pageSize: 10,
      total: 2,
      data: [{ jobId: '1' }, { jobId: '2' }],
    });
    expect(chain.skip).toHaveBeenCalledWith(0);
    expect(chain.limit).toHaveBeenCalledWith(10);
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1, jobId: 1 });
    expect(redisService.setJson).toHaveBeenCalledWith(
      'jobs:list:v1:page=1:pageSize=10',
      res,
      30,
    );
  });

  it('findAllList() should use default page/pageSize when not provided', async () => {
    redisService.getInt.mockResolvedValue(1);
    redisService.getJson.mockResolvedValue(null);
    jobModel.countDocuments.mockResolvedValue(0);
    const chain = createQueryChain([]);
    jobModel.find.mockReturnValue(chain);

    const res = await service.findAllList({} as GetListJobDto);

    expect(res).toEqual({ page: 1, pageSize: 10, total: 0, data: [] });
    expect(chain.skip).toHaveBeenCalledWith(0);
    expect(chain.limit).toHaveBeenCalledWith(10);
    expect(redisService.getJson).toHaveBeenCalledWith(
      'jobs:list:v1:page=1:pageSize=10',
    );
  });

  it('findOne() should return cached job when cache hit', async () => {
    redisService.getInt.mockResolvedValue(1);
    redisService.getJson.mockResolvedValue({
      jobId: '1',
      status: 'queued',
      items: [],
      is_active: true,
    });

    await expect(service.findOne(1)).resolves.toMatchObject({ jobId: 1 });
    expect(redisService.getJson).toHaveBeenCalledWith('jobs:one:v1:1');
    expect(jobModel.findOne).not.toHaveBeenCalled();
  });

  it('findOne() should load from DB and cache when cache miss', async () => {
    redisService.getInt.mockResolvedValue(1);
    redisService.getJson.mockResolvedValue(null);
    const chain = createQueryChain({
      jobId: '1',
      status: 'completed',
      items: [],
      is_active: true,
    });
    jobModel.findOne.mockReturnValue(chain);

    const job = await service.findOne(1);
    expect(job).toMatchObject({ jobId: 1 });
    expect(jobModel.findOne).toHaveBeenCalledWith({ jobId: 1 });
    expect(redisService.setJson).toHaveBeenCalledWith(
      'jobs:one:v1:1',
      expect.objectContaining({ jobId: 1 }),
      30,
    );
  });

  it('findOne() should throw NotFoundException when missing', async () => {
    redisService.getInt.mockResolvedValue(1);
    redisService.getJson.mockResolvedValue(null);
    const chain = createQueryChain(null);
    jobModel.findOne.mockReturnValue(chain);
    await expect(service.findOne(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create() should price lines via engine and persist completed job', async () => {
    const dupChain = createQueryChain(null);
    jobModel.findOne.mockReturnValue(dupChain);
    rulesService.findWithQuery.mockResolvedValue([]);
    productsService.findOne.mockResolvedValue({
      id: 'SKU-001',
      name: 'P',
      price: 50,
      weight: 1,
      is_active: true,
    });
    const created = {
      toObject: jest.fn().mockReturnValue({
        jobId: '1',
        status: 'completed',
        items: [
          {
            index: 0,
            productId: 'SKU-001',
            quantity: 2,
            status: 'success',
            finalPrice: 100,
            appliedRules: [],
          },
        ],
        is_active: true,
      }),
    };
    jobModel.create.mockResolvedValue(created);
    redisService.incr.mockResolvedValue(2);

    const dto: CreateJobDto = {
      jobId: '1',
      items: [{ productId: 'SKU-001', quantity: 2 }],
    };

    const res = await service.create(dto);
    expect(res.jobId).toBe('1');
    expect(res.is_active).toBe(true);
    expect(rulesService.findWithQuery).toHaveBeenCalled();
    expect(productsService.findOne).toHaveBeenCalledWith('SKU-001');
    expect(jobModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: '1',
        status: 'completed',
        is_active: true,
        items: [
          expect.objectContaining({
            index: 0,
            productId: 'SKU-001',
            quantity: 2,
            status: 'success',
            finalPrice: 100,
            appliedRules: [],
          }),
        ],
      }),
    );
    expect(redisService.incr).toHaveBeenCalledWith('jobs:list:version');
  });

  it('create() should set appliedRules from pricing engine (ignore client appliedRules)', async () => {
    const dupChain = createQueryChain(null);
    jobModel.findOne.mockReturnValue(dupChain);
    rulesService.findWithQuery.mockResolvedValue([
      {
        id: 99,
        type: 'TimeWindowPromotion',
        name: 't',
        method: RuleTypeEnum.DISCOUNT,
        type_value: RuleTypeValueEnum.PERCENT,
        value: 10,
        priority: 100,
        is_active: true,
        effective_from: new Date('2026-01-01'),
        effective_to: new Date('2026-12-31'),
      },
    ]);
    productsService.findOne.mockResolvedValue({
      id: 'SKU-001',
      name: 'P',
      price: 100,
      weight: 1,
      is_active: true,
    });
    const created = {
      toObject: jest.fn().mockReturnValue({ jobId: 'j1' }),
    };
    jobModel.create.mockResolvedValue(created);

    const dto: CreateJobDto = {
      jobId: 'j1',
      distanceKm: 85,
      items: [{ productId: 'SKU-001', quantity: 1 }],
    };

    await service.create(dto);
    const call = jobModel.create.mock.calls[0][0] as {
      items: { appliedRules: number[]; finalPrice: number }[];
    };
    expect(call.items[0].appliedRules).toEqual([99]);
    expect(call.items[0].finalPrice).toBe(90);
  });

  it('create() should persist distanceKm on job document when provided', async () => {
    const dupChain = createQueryChain(null);
    jobModel.findOne.mockReturnValue(dupChain);
    rulesService.findWithQuery.mockResolvedValue([]);
    productsService.findOne.mockResolvedValue({
      id: 'SKU-001',
      name: 'P',
      price: 10,
      weight: 1,
      is_active: true,
    });
    jobModel.create.mockResolvedValue({
      toObject: jest.fn().mockReturnValue({ jobId: 'd1' }),
    });

    await service.create({
      jobId: 'd1',
      distanceKm: 85,
      items: [
        { productId: 'SKU-001', quantity: 1 },
        { productId: 'SKU-001', quantity: 1 },
      ],
    });

    const call = jobModel.create.mock.calls[0][0] as {
      distanceKm?: number;
      items: unknown[];
    };
    expect(call.distanceKm).toBe(85);
    expect(call.items).toHaveLength(2);
  });

  it('create() should throw ConflictException when jobId already exists', async () => {
    const dupChain = createQueryChain({ jobId: '1' });
    jobModel.findOne.mockReturnValue(dupChain);

    const dto: CreateJobDto = {
      jobId: '1',
      items: [{ productId: 'SKU-001', quantity: 1 }],
    };

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    expect(jobModel.create).not.toHaveBeenCalled();
    expect(redisService.incr).not.toHaveBeenCalled();
  });

  it('update() should return updated job and call redis incr', async () => {
    const chain = createQueryChain({
      jobId: '1',
      status: 'completed',
      items: [],
      is_active: true,
    });
    jobModel.findOneAndUpdate.mockReturnValue(chain);

    await expect(
      service.update(1, { status: 'completed' } as UpdateJobDto),
    ).resolves.toMatchObject({ jobId: 1, status: 'completed' });
    expect(jobModel.findOneAndUpdate).toHaveBeenCalledWith(
      { jobId: 1 },
      { status: 'completed' },
      { new: true },
    );
    expect(redisService.incr).toHaveBeenCalledWith('jobs:list:version');
  });

  it('update() should throw NotFoundException when missing', async () => {
    const chain = createQueryChain(null);
    jobModel.findOneAndUpdate.mockReturnValue(chain);
    await expect(
      service.update(1, { status: 'completed' } as UpdateJobDto),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('remove() should soft-delete job and call redis incr', async () => {
    const chain = createQueryChain({
      jobId: '1',
      is_active: false,
    });
    jobModel.findOneAndUpdate.mockReturnValue(chain);

    await expect(service.remove(1)).resolves.toMatchObject({
      jobId: 1,
      is_active: false,
    });
    expect(jobModel.findOneAndUpdate).toHaveBeenCalledWith(
      { jobId: 1 },
      { is_active: false },
      { new: true },
    );
    expect(redisService.incr).toHaveBeenCalledWith('jobs:list:version');
  });

  it('remove() should throw NotFoundException when missing', async () => {
    const chain = createQueryChain(null);
    jobModel.findOneAndUpdate.mockReturnValue(chain);
    await expect(service.remove(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('syncJsonData() should bump cache only when json array is empty', async () => {
    (fs.readFile as unknown as jest.Mock).mockResolvedValue('[]');

    await expect(service.syncJsonData()).resolves.toBeUndefined();

    expect(jobModel.bulkWrite).not.toHaveBeenCalled();
    expect(redisService.incr).toHaveBeenCalledWith('jobs:list:version');
  });

  it('syncJsonData() should read json file, bulkWrite (upsert), and bump cache version', async () => {
    const rows = [
      {
        jobId: 1,
        status: 'completed',
        items: [
          {
            productId: 'SKU-001',
            quantity: 1,
            status: 'success',
            appliedRules: [1, 2],
          },
        ],
      },
      {
        jobId: '2',
        status: 'queued',
        items: [{ productId: 'SKU-002', quantity: 2, appliedRules: [] }],
      },
    ];
    (fs.readFile as unknown as jest.Mock).mockResolvedValue(
      JSON.stringify(rows),
    );
    jobModel.bulkWrite.mockResolvedValue({
      insertedCount: 0,
      matchedCount: 2,
      modifiedCount: 0,
      deletedCount: 0,
      upsertedCount: 0,
      upsertedIds: {},
    });

    await expect(service.syncJsonData()).resolves.toBeUndefined();

    expect(fs.readFile).toHaveBeenCalledWith('data/jobs.json', 'utf8');
    expect(jobModel.bulkWrite).toHaveBeenCalledWith(
      [
        {
          updateOne: {
            filter: { jobId: 1 },
            update: {
              $set: expect.objectContaining({
                jobId: '1',
                status: 'completed',
                is_active: true,
                items: [
                  expect.objectContaining({
                    appliedRules: [1, 2],
                  }),
                ],
              }),
            },
            upsert: true,
          },
        },
        {
          updateOne: {
            filter: { jobId: '2' },
            update: {
              $set: expect.objectContaining({
                jobId: '2',
                status: 'queued',
                is_active: true,
              }),
            },
            upsert: true,
          },
        },
      ],
      { ordered: false },
    );
    expect(redisService.incr).toHaveBeenCalledWith('jobs:list:version');
  });
});
