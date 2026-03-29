import { Test } from '@nestjs/testing';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { GetListJobDto } from './dto/get-job.dto';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

describe('JobsController', () => {
  let controller: JobsController;

  const jobsService = {
    findAllList: jest.fn(),
    findOne: jest.fn().mockResolvedValue({ jobId: 1 }),
    create: jest.fn().mockResolvedValue({ jobId: 1 }),
    update: jest.fn().mockResolvedValue({ jobId: 1 }),
    syncJsonData: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue({ jobId: 1, is_active: false }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [JobsController],
      providers: [{ provide: JobsService, useValue: jobsService }],
    }).compile();
    controller = moduleRef.get(JobsController);
  });

  it('findAllList() should delegate to service', async () => {
    jobsService.findAllList.mockResolvedValue({
      page: 1,
      pageSize: 10,
      total: 4,
      data: [{ jobId: 1 }],
    });

    const dto = { page: 1, pageSize: 10 } as GetListJobDto;
    const result = await controller.findAllList(dto);

    expect(jobsService.findAllList).toHaveBeenCalledWith(dto);
    expect(result).toEqual({
      page: 1,
      pageSize: 10,
      total: 4,
      data: [{ jobId: 1 }],
    });
  });

  it('create() should create a new job', async () => {
    jobsService.create.mockResolvedValue({
      jobId: 1,
      status: 'completed',
      items: [
        {
          index: 0,
          productId: 'SKU-001',
          quantity: 1,
          status: 'success',
          finalPrice: 100,
          appliedRules: [],
        },
      ],
      is_active: true,
    });
    const dto: CreateJobDto = {
      jobId: '1',
      items: [{ productId: 'SKU-001', quantity: 1 }],
    };

    const result = await controller.create(dto);
    expect(jobsService.create).toHaveBeenCalledWith(dto);
    expect(result.jobId).toBe(1);
    expect(result.is_active).toBe(true);
  });

  it('syncJson() should sync JSON data', async () => {
    const result = await controller.syncJson();
    expect(jobsService.syncJsonData).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ message: 'Synced JSON data successfully' });
  });

  it('findOne() should return a job', async () => {
    const result = await controller.findOne(1);
    expect(jobsService.findOne).toHaveBeenCalledWith(1);
    expect(result).toEqual({ jobId: 1 });
  });

  it('update() should update a job', async () => {
    const dto = { status: 'completed' } as UpdateJobDto;
    const result = await controller.update(1, dto);
    expect(jobsService.update).toHaveBeenCalledWith(1, dto);
    expect(result).toEqual({ jobId: 1 });
  });

  it('remove() should soft-delete a job', async () => {
    const result = await controller.remove(1);
    expect(jobsService.remove).toHaveBeenCalledWith(1);
    expect(result).toEqual({ jobId: 1, is_active: false });
  });
});
