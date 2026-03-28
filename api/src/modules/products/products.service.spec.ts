import * as fs from 'fs/promises';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { RedisService } from '../../shared/redis/redis.service';
import { GetListProductDto } from './dto/get-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

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

describe('ProductsService', () => {
  let service: ProductsService;

  const redisService = {
    getInt: jest.fn(),
    getJson: jest.fn(),
    setJson: jest.fn(),
    incr: jest.fn(),
  };

  const productModel = {
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
        ProductsService,
        { provide: RedisService, useValue: redisService },
        { provide: getModelToken(Product.name), useValue: productModel },
      ],
    }).compile();

    service = moduleRef.get(ProductsService);
    jest.resetAllMocks();
  });

  it('findAllList() should return cached value when cache hit', async () => {
    redisService.getInt.mockResolvedValue(1);
    redisService.getJson.mockResolvedValue({
      page: 1,
      pageSize: 10,
      total: 3,
      data: [{ id: 'SKU-001' }],
    });

    await expect(
      service.findAllList({ page: 1, pageSize: 10 } as GetListProductDto),
    ).resolves.toEqual({
      page: 1,
      pageSize: 10,
      total: 3,
      data: [{ id: 'SKU-001' }],
    });

    expect(redisService.getInt).toHaveBeenCalledWith('products:list:version', 1);
    expect(redisService.getJson).toHaveBeenCalledWith(
      'products:list:v1:page=1:pageSize=10',
    );
    expect(productModel.countDocuments).not.toHaveBeenCalled();
    expect(productModel.find).not.toHaveBeenCalled();
  });

  it('findAllList() should query DB and cache when cache miss', async () => {
    redisService.getInt.mockResolvedValue(1);
    redisService.getJson.mockResolvedValue(null);
    productModel.countDocuments.mockResolvedValue(2);
    const chain = createQueryChain([
      { id: 'SKU-001' },
      { id: 'SKU-002' },
    ]);
    productModel.find.mockReturnValue(chain);

    const res = await service.findAllList({
      page: 1,
      pageSize: 10,
    } as GetListProductDto);

    expect(res).toEqual({
      page: 1,
      pageSize: 10,
      total: 2,
      data: [{ id: 'SKU-001' }, { id: 'SKU-002' }],
    });
    expect(chain.skip).toHaveBeenCalledWith(0);
    expect(chain.limit).toHaveBeenCalledWith(10);
    expect(chain.sort).toHaveBeenCalledWith({ id: 1 });
    expect(redisService.setJson).toHaveBeenCalledWith(
      'products:list:v1:page=1:pageSize=10',
      res,
      30,
    );
  });

  it('findAllList() should use default page/pageSize when not provided', async () => {
    redisService.getInt.mockResolvedValue(1);
    redisService.getJson.mockResolvedValue(null);
    productModel.countDocuments.mockResolvedValue(0);
    const chain = createQueryChain([]);
    productModel.find.mockReturnValue(chain);

    const res = await service.findAllList({} as GetListProductDto);

    expect(res).toEqual({ page: 1, pageSize: 10, total: 0, data: [] });
    expect(chain.skip).toHaveBeenCalledWith(0);
    expect(chain.limit).toHaveBeenCalledWith(10);
    expect(redisService.getJson).toHaveBeenCalledWith(
      'products:list:v1:page=1:pageSize=10',
    );
  });

  it('create() should persist product, default is_active, and call redis incr', async () => {
    const dupChain = createQueryChain(null);
    productModel.findOne.mockReturnValue(dupChain);
    const created = {
      toObject: jest.fn().mockReturnValue({
        id: 'SKU-001',
        name: 'Box',
        price: 100,
        weight: 1,
        is_active: true,
      }),
    };
    productModel.create.mockResolvedValue(created);
    redisService.incr.mockResolvedValue(2);

    const dto: CreateProductDto = {
      id: 'SKU-001',
      name: 'Box',
      price: 100,
      weight: 1,
    };

    const res = await service.create(dto);
    expect(res).toEqual({
      id: 'SKU-001',
      name: 'Box',
      price: 100,
      weight: 1,
      is_active: true,
    });
    expect(productModel.findOne).toHaveBeenCalledWith({ id: 'SKU-001' });
    expect(productModel.create).toHaveBeenCalledWith({
      ...dto,
      is_active: true,
    });
    expect(redisService.incr).toHaveBeenCalledWith('products:list:version');
  });

  it('create() should throw ConflictException when id already exists', async () => {
    const dupChain = createQueryChain({ id: 'SKU-001' });
    productModel.findOne.mockReturnValue(dupChain);

    const dto: CreateProductDto = {
      id: 'SKU-001',
      name: 'Box',
      price: 100,
      weight: 1,
    };

    await expect(service.create(dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(productModel.create).not.toHaveBeenCalled();
    expect(redisService.incr).not.toHaveBeenCalled();
  });

  it('findOne() should return product when found', async () => {
    const chain = createQueryChain({
      id: 'SKU-001',
      name: 'Box',
      price: 10,
      weight: 1,
      is_active: true,
    });
    productModel.findOne.mockReturnValue(chain);
    await expect(service.findOne('SKU-001')).resolves.toMatchObject({
      id: 'SKU-001',
    });
    expect(productModel.findOne).toHaveBeenCalledWith({ id: 'SKU-001' });
  });

  it('findOne() should throw NotFoundException when missing', async () => {
    const chain = createQueryChain(null);
    productModel.findOne.mockReturnValue(chain);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(productModel.findOne).toHaveBeenCalledWith({ id: 'missing' });
  });

  it('update() should return updated product and call redis incr', async () => {
    const chain = createQueryChain({
      id: 'SKU-001',
      name: 'Renamed',
      price: 10,
      weight: 1,
      is_active: true,
    });
    productModel.findOneAndUpdate.mockReturnValue(chain);

    await expect(
      service.update('SKU-001', { name: 'Renamed' } as UpdateProductDto),
    ).resolves.toMatchObject({ id: 'SKU-001', name: 'Renamed' });
    expect(productModel.findOneAndUpdate).toHaveBeenCalledWith(
      { id: 'SKU-001' },
      { name: 'Renamed' },
      { new: true },
    );
    expect(redisService.incr).toHaveBeenCalledWith('products:list:version');
  });

  it('update() should throw NotFoundException when missing', async () => {
    const chain = createQueryChain(null);
    productModel.findOneAndUpdate.mockReturnValue(chain);
    await expect(
      service.update('missing', { name: 'X' } as UpdateProductDto),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('remove() should soft-delete product and call redis incr', async () => {
    const chain = createQueryChain({
      id: 'SKU-001',
      is_active: false,
    });
    productModel.findOneAndUpdate.mockReturnValue(chain);

    await expect(service.remove('SKU-001')).resolves.toEqual({
      id: 'SKU-001',
      is_active: false,
    });
    expect(productModel.findOneAndUpdate).toHaveBeenCalledWith(
      { id: 'SKU-001' },
      { is_active: false },
      { new: true },
    );
    expect(redisService.incr).toHaveBeenCalledWith('products:list:version');
  });

  it('remove() should throw NotFoundException when missing', async () => {
    const chain = createQueryChain(null);
    productModel.findOneAndUpdate.mockReturnValue(chain);
    await expect(service.remove('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('syncJsonData() should bump cache only when json array is empty', async () => {
    (fs.readFile as unknown as jest.Mock).mockResolvedValue('[]');

    await expect(service.syncJsonData()).resolves.toBeUndefined();

    expect(productModel.bulkWrite).not.toHaveBeenCalled();
    expect(redisService.incr).toHaveBeenCalledWith('products:list:version');
  });

  it('syncJsonData() should read json file, bulkWrite (upsert), and bump cache version', async () => {
    const rows = [
      { id: 'SKU-001', name: 'A', price: 1, weight: 1 },
      { id: 'SKU-002', name: 'B', price: 2, weight: 2, is_active: false },
    ];
    (fs.readFile as unknown as jest.Mock).mockResolvedValue(
      JSON.stringify(rows),
    );
    productModel.bulkWrite.mockResolvedValue({
      insertedCount: 0,
      matchedCount: 2,
      modifiedCount: 0,
      deletedCount: 0,
      upsertedCount: 0,
      upsertedIds: {},
    });

    await expect(service.syncJsonData()).resolves.toBeUndefined();

    expect(fs.readFile).toHaveBeenCalledWith('data/products.json', 'utf8');
    expect(productModel.bulkWrite).toHaveBeenCalledWith(
      [
        {
          updateOne: {
            filter: { id: 'SKU-001' },
            update: {
              $set: expect.objectContaining({
                id: 'SKU-001',
                name: 'A',
                price: 1,
                weight: 1,
                is_active: true,
              }),
            },
            upsert: true,
          },
        },
        {
          updateOne: {
            filter: { id: 'SKU-002' },
            update: {
              $set: expect.objectContaining({
                id: 'SKU-002',
                is_active: false,
              }),
            },
            upsert: true,
          },
        },
      ],
      { ordered: false },
    );
    expect(redisService.incr).toHaveBeenCalledWith('products:list:version');
  });
});
