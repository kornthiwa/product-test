import { Test } from '@nestjs/testing';
import { RulesController } from './rules.controller';
import { RulesService } from './rules.service';
import { GetListRuleDto } from './dto/get-rule.dto';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';

describe('RulesController', () => {
  let controller: RulesController;

  const rulesService = {
    findAllList: jest.fn(),
    findOne: jest.fn().mockResolvedValue({ id: 1 }),
    create: jest.fn().mockResolvedValue({ id: 1 }),
    update: jest.fn().mockResolvedValue({ id: 1 }),
    syncJsonData: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue({ id: 1 }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [RulesController],
      providers: [{ provide: RulesService, useValue: rulesService }],
    }).compile();
    controller = moduleRef.get(RulesController);
  });

  it('findAllList() should delegate to service', async () => {
    rulesService.findAllList.mockResolvedValue({
      page: 1,
      pageSize: 10,
      total: 14,
      data: [{ id: 1 }],
    });

    const dto = { page: 1, pageSize: 10 } as GetListRuleDto;
    const result = await controller.findAllList(dto);

    expect(rulesService.findAllList).toHaveBeenCalledWith(dto);
    expect(result).toEqual({
      page: 1,
      pageSize: 10,
      total: 14,
      data: [{ id: 1 }],
    });
  });

  it('create() should create a new rule', async () => {
    rulesService.create.mockResolvedValue({ id: 1 });
    const dto = {
      type: 'TimeWindowPromotion',
      method: 'discount',
      type_value: 'percent',
      value: 10,
      priority: 1,
      effective_from: new Date(),
      effective_to: new Date(),
      name: 'Test',
    } as CreateRuleDto;

    const result = await controller.create(dto);
    expect(rulesService.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 1 });
  });

  it('syncJson() should sync JSON data', async () => {
    const result = await controller.syncJson();
    expect(rulesService.syncJsonData).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ message: 'Synced JSON data successfully' });
  });

  it('findOne() should return a rule', async () => {
    const result = await controller.findOne('1');
    expect(rulesService.findOne).toHaveBeenCalledWith('1');
    expect(result).toEqual({ id: 1 });
  });

  it('update() should update a rule', async () => {
    const dto = {
      name: 'Test',
    } as UpdateRuleDto;
    const result = await controller.update('1', dto);
    expect(rulesService.update).toHaveBeenCalledWith('1', dto);
    expect(result).toEqual({ id: 1 });
  });

  it('remove() should remove a rule', async () => {
    const result = await controller.remove('1');
    expect(rulesService.remove).toHaveBeenCalledWith('1');
    expect(result).toEqual({ id: 1 });
  });
});
