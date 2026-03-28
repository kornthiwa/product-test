import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { Job } from '../entities/job.entity';

export class GetListJobDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}

export class GetJobListResponse {
  page!: number;
  pageSize!: number;
  total!: number;
  data!: Job[];
}
