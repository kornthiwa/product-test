import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { RuleDocument } from '../entities/rule.entity';

export class GetListRuleDto {
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

export class GetRuleDtoResponse {
  page: number;
  pageSize: number;
  total: number;
  data: RuleDocument[];
}
