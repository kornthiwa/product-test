import * as fs from 'fs/promises';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { RulesService } from './rules.service';
import { Rule } from './entities/rule.entity';
import { RedisService } from '../../shared/redis/redis.service';
import { GetListRuleDto } from './dto/get-rule.dto';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

type QueryChain<T> = {
  skip: jest.Mock;
  limit: jest.Mock;
  sort: jest.Mock;
  select: jest.Mock;
  lean: jest.Mock<Promise<T>, []>;
};

function createQueryChain<T>(result: T): QueryChain<T> {
  const chain: QueryChain<T> = {
    skip: jest.fn(),
    limit: jest.fn(),
    sort: jest.fn(),
    select: jest.fn(),
    lean: jest.fn(),
  };

  chain.skip.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.sort.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  chain.lean.mockResolvedValue(result);

  return chain;
}

describe('RulesService', () => {
  let service: RulesService;

  const redisService = {
    getInt: jest.fn(),
    getJson: jest.fn(),
    setJson: jest.fn(),
    incr: jest.fn(),
  };

  const ruleModel = {
    countDocuments: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
    bulkWrite: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        RulesService,
        { provide: RedisService, useValue: redisService },
        { provide: getModelToken(Rule.name), useValue: ruleModel },
      ],
    }).compile();

    service = moduleRef.get(RulesService);
    jest.resetAllMocks();
  });

  it('findAllList() should return cached value when cache hit', async () => {
    redisService.getInt.mockResolvedValue(1);
    redisService.getJson.mockResolvedValue({
      page: 1,
      pageSize: 10,
      total: 99,
      data: [{ id: 1 }],
    });

    await expect(
      service.findAllList({ page: 1, pageSize: 10 } as GetListRuleDto),
    ).resolves.toEqual({
      page: 1,
      pageSize: 10,
      total: 99,
      data: [{ id: 1 }],
    });

    expect(redisService.getInt).toHaveBeenCalledWith('rules:list:version', 1);
    expect(redisService.getJson).toHaveBeenCalledWith(
      'rules:list:v1:page=1:pageSize=10',
    );
    expect(ruleModel.countDocuments).not.toHaveBeenCalled();
    expect(ruleModel.find).not.toHaveBeenCalled();
  });

  it('findAllList() should query DB and cache when cache miss', async () => {
    redisService.getInt.mockResolvedValue(1);
    redisService.getJson.mockResolvedValue(null);
    ruleModel.countDocuments.mockResolvedValue(2);
    const chain = createQueryChain([{ id: 1 }, { id: 2 }]);
    ruleModel.find.mockReturnValue(chain);

    const res = await service.findAllList({
      page: 1,
      pageSize: 10,
    } as GetListRuleDto);

    expect(res).toEqual({
      page: 1,
      pageSize: 10,
      total: 2,
      data: [{ id: 1 }, { id: 2 }],
    });
    expect(chain.skip).toHaveBeenCalledWith(0);
    expect(chain.limit).toHaveBeenCalledWith(10);
    expect(chain.sort).toHaveBeenCalledWith({ priority: -1, _id: -1 });
    expect(redisService.setJson).toHaveBeenCalledWith(
      'rules:list:v1:page=1:pageSize=10',
      res,
      30,
    );
  });

  it('findWithQuery() sorts by priority desc', async () => {
    const quoteAt = new Date('2026-06-01T12:00:00.000Z');
    const chain = createQueryChain([{ id: 2 }, { id: 1 }]);
    ruleModel.find.mockReturnValue(chain);

    const res = await service.findWithQuery({
      is_active: true,
      effective_from: { $lte: quoteAt },
      effective_to: { $gte: quoteAt },
    });

    expect(ruleModel.find).toHaveBeenCalledWith({
      is_active: true,
      effective_from: { $lte: quoteAt },
      effective_to: { $gte: quoteAt },
    });
    expect(chain.sort).toHaveBeenCalledWith({ priority: -1, _id: -1 });
    expect(res).toEqual([{ id: 2 }, { id: 1 }]);
  });

  it('findAllList() should use default page/pageSize when not provided', async () => {
    redisService.getInt.mockResolvedValue(1);
    redisService.getJson.mockResolvedValue(null);
    ruleModel.countDocuments.mockResolvedValue(0);
    const chain = createQueryChain([]);
    ruleModel.find.mockReturnValue(chain);

    const res = await service.findAllList({} as GetListRuleDto);

    expect(res).toEqual({ page: 1, pageSize: 10, total: 0, data: [] });
    expect(chain.skip).toHaveBeenCalledWith(0);
    expect(chain.limit).toHaveBeenCalledWith(10);
    expect(redisService.getJson).toHaveBeenCalledWith(
      'rules:list:v1:page=1:pageSize=10',
    );
  });

  it('create() should assign next id and call redis incr', async () => {
    const lastChain = createQueryChain({ id: 5 });
    ruleModel.findOne.mockReturnValue(lastChain);
    ruleModel.create.mockResolvedValue({ id: 6 });
    redisService.incr.mockResolvedValue(2);

    const dto = {
      type: 'TimeWindowPromotion',
      method: 'discount',
      type_value: 'percent',
      value: 10,
      priority: 1,
      effective_from: new Date(),
      effective_to: new Date(),
      name: 'X',
    } as CreateRuleDto;

    const res = await service.create(dto);
    expect(res).toEqual({ id: 6 });
    expect(lastChain.sort).toHaveBeenCalledWith({ id: -1 });
    expect(lastChain.select).toHaveBeenCalledWith({ id: 1 });
    expect(ruleModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ id: 6 }),
    );
    expect(redisService.incr).toHaveBeenCalledWith('rules:list:version');
  });

  it('create() should default next id to 1 when no last id', async () => {
    const lastChain = createQueryChain(null);
    ruleModel.findOne.mockReturnValue(lastChain);
    ruleModel.create.mockResolvedValue({ id: 1 });

    const res = await service.create({ name: 'X' } as CreateRuleDto);
    expect(res).toEqual({ id: 1 });
    expect(lastChain.sort).toHaveBeenCalledWith({ id: -1 });
    expect(lastChain.select).toHaveBeenCalledWith({ id: 1 });
    expect(ruleModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
    );
    expect(redisService.incr).toHaveBeenCalledWith('rules:list:version');
  });

  it('findOne() should return rule when found', async () => {
    const chain = createQueryChain({ id: 1 });
    ruleModel.findOne.mockReturnValue(chain);
    await expect(service.findOne('1')).resolves.toEqual({ id: 1 });
    expect(ruleModel.findOne).toHaveBeenCalledWith({ id: 1 });
  });

  it('findOne() should throw NotFoundException when missing', async () => {
    const chain = createQueryChain(null);
    ruleModel.findOne.mockReturnValue(chain);
    await expect(service.findOne('123')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(ruleModel.findOne).toHaveBeenCalledWith({ id: 123 });
  });

  it('update() should return updated rule and call redis incr', async () => {
    const chain = createQueryChain({ id: 1 });
    ruleModel.findOneAndUpdate.mockReturnValue(chain);

    await expect(
      service.update('1', { name: 'Y' } as UpdateRuleDto),
    ).resolves.toEqual({
      id: 1,
    });
    expect(ruleModel.findOneAndUpdate).toHaveBeenCalledWith(
      { id: 1 },
      { name: 'Y' },
      { new: true },
    );
    expect(redisService.incr).toHaveBeenCalledWith('rules:list:version');
  });

  it('update() should throw NotFoundException when missing', async () => {
    const chain = createQueryChain(null);
    ruleModel.findOneAndUpdate.mockReturnValue(chain);
    await expect(
      service.update('999', { name: 'Y' } as UpdateRuleDto),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(ruleModel.findOneAndUpdate).toHaveBeenCalledWith(
      { id: 999 },
      { name: 'Y' },
      { new: true },
    );
  });

  it('remove() should soft-delete rule and call redis incr', async () => {
    const chain = createQueryChain({ id: 1 });
    ruleModel.findOneAndUpdate.mockReturnValue(chain);

    await expect(service.remove('1')).resolves.toEqual({ id: 1 });
    expect(ruleModel.findOneAndUpdate).toHaveBeenCalledWith(
      { id: 1 },
      { is_active: false },
      { new: true },
    );
    expect(redisService.incr).toHaveBeenCalledWith('rules:list:version');
  });

  it('remove() should throw NotFoundException when missing', async () => {
    const chain = createQueryChain(null);
    ruleModel.findOneAndUpdate.mockReturnValue(chain);
    await expect(service.remove('999')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('syncJsonData() should read json file, bulkWrite (upsert), and bump cache version', async () => {
    const rules = [{ id: 1 }, { id: 2 }];
    (fs.readFile as unknown as jest.Mock).mockResolvedValue(
      JSON.stringify(rules),
    );
    ruleModel.bulkWrite.mockResolvedValue({
      insertedCount: 0,
      matchedCount: 2,
      modifiedCount: 0,
      deletedCount: 0,
      upsertedCount: 0,
      upsertedIds: {},
    });

    await expect(service.syncJsonData()).resolves.toBeUndefined();

    expect(fs.readFile).toHaveBeenCalledWith('data/rules.json', 'utf8');
    expect(ruleModel.bulkWrite).toHaveBeenCalledWith(
      [
        {
          updateOne: {
            filter: { id: 1 },
            update: { $set: expect.objectContaining({ id: 1 }) },
            upsert: true,
          },
        },
        {
          updateOne: {
            filter: { id: 2 },
            update: { $set: expect.objectContaining({ id: 2 }) },
            upsert: true,
          },
        },
      ],
      { ordered: false },
    );
    expect(redisService.incr).toHaveBeenCalledWith('rules:list:version');
  });
});
