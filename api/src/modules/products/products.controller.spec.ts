import { Test } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { GetListProductDto } from './dto/get-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

describe('ProductsController', () => {
  let controller: ProductsController;

  const productsService = {
    findAllList: jest.fn(),
    findOne: jest.fn().mockResolvedValue({ id: 'SKU-001' }),
    create: jest.fn().mockResolvedValue({ id: 'SKU-001' }),
    update: jest.fn().mockResolvedValue({ id: 'SKU-001' }),
    syncJsonData: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue({ id: 'SKU-001', is_active: false }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: productsService }],
    }).compile();
    controller = moduleRef.get(ProductsController);
  });

  it('findAllList() should delegate to service', async () => {
    productsService.findAllList.mockResolvedValue({
      page: 1,
      pageSize: 10,
      total: 3,
      data: [{ id: 'SKU-001' }],
    });

    const dto = { page: 1, pageSize: 10 } as GetListProductDto;
    const result = await controller.findAllList(dto);

    expect(productsService.findAllList).toHaveBeenCalledWith(dto);
    expect(result).toEqual({
      page: 1,
      pageSize: 10,
      total: 3,
      data: [{ id: 'SKU-001' }],
    });
  });

  it('create() should create a new product', async () => {
    productsService.create.mockResolvedValue({
      id: 'SKU-001',
      name: 'Box',
      price: 100,
      weight: 1,
      is_active: true,
    });
    const dto: CreateProductDto = {
      id: 'SKU-001',
      name: 'Box',
      price: 100,
      weight: 1,
    };

    const result = await controller.create(dto);
    expect(productsService.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({
      id: 'SKU-001',
      name: 'Box',
      price: 100,
      weight: 1,
      is_active: true,
    });
  });

  it('syncJson() should sync JSON data', async () => {
    const result = await controller.syncJson();
    expect(productsService.syncJsonData).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ message: 'Synced JSON data successfully' });
  });

  it('findOne() should return a product', async () => {
    const result = await controller.findOne('SKU-001');
    expect(productsService.findOne).toHaveBeenCalledWith('SKU-001');
    expect(result).toEqual({ id: 'SKU-001' });
  });

  it('update() should update a product', async () => {
    const dto = { name: 'Renamed' } as UpdateProductDto;
    const result = await controller.update('SKU-001', dto);
    expect(productsService.update).toHaveBeenCalledWith('SKU-001', dto);
    expect(result).toEqual({ id: 'SKU-001' });
  });

  it('remove() should soft-delete a product', async () => {
    const result = await controller.remove('SKU-001');
    expect(productsService.remove).toHaveBeenCalledWith('SKU-001');
    expect(result).toEqual({ id: 'SKU-001', is_active: false });
  });
});
