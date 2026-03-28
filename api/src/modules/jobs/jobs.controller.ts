import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { GetListJobDto, GetJobListResponse } from './dto/get-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { Job } from './entities/job.entity';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  async create(@Body() createJobDto: CreateJobDto): Promise<Job> {
    return await this.jobsService.create(createJobDto);
  }

  @Get()
  async findAllList(
    @Query() dto: GetListJobDto,
  ): Promise<GetJobListResponse> {
    return await this.jobsService.findAllList(dto);
  }

  @Get('syncjson')
  async syncJson(): Promise<{ message: string }> {
    await this.jobsService.syncJsonData();
    return { message: 'Synced JSON data successfully' };
  }

  @Get(':jobId')
  async findOne(@Param('jobId') jobId: string): Promise<Job> {
    return await this.jobsService.findOne(jobId);
  }

  @Patch(':jobId')
  async update(
    @Param('jobId') jobId: string,
    @Body() updateJobDto: UpdateJobDto,
  ): Promise<Job> {
    return await this.jobsService.update(jobId, updateJobDto);
  }

  @Delete(':jobId')
  async remove(@Param('jobId') jobId: string): Promise<Job> {
    const job = await this.jobsService.remove(jobId);
    return job;
  }
}
