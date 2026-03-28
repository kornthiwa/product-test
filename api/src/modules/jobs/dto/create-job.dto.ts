import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

const JOB_STATUSES = ['queued', 'processing', 'completed', 'failed'] as const;
const ITEM_STATUSES = ['pending', 'success', 'failed'] as const;

export class CreateJobItemDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  index?: number;

  @IsString()
  @IsNotEmpty()
  productId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsEnum(ITEM_STATUSES)
  status?: (typeof ITEM_STATUSES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  finalPrice?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  appliedRules?: number[];
}

export class CreateJobDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  jobId?: string;

  @IsOptional()
  @IsEnum(JOB_STATUSES)
  status?: (typeof JOB_STATUSES)[number];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateJobItemDto)
  items!: CreateJobItemDto[];

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  processed?: number;
}
