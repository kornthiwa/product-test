import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { Job, JobDocument } from '../../jobs/entities/job.entity';

export class BulkQuoteDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => Job)
  data!: Job[];
}

export class BulkQuoteDtoResponse {
  data!: Job[];
}
