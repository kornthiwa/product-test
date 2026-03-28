import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { RuleDocument } from '../entities/rule.entity';

export class GetListRuleDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
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
