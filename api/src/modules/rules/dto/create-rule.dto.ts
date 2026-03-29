import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { Rule, RuleTypeEnum, RuleTypeValueEnum } from '../entities/rule.entity';

export class CreateRuleDto implements Partial<Rule> {
  @IsEnum(['TimeWindowPromotion', 'RemoteAreaSurcharge', 'WeightTier'] as const)
  type!: 'TimeWindowPromotion' | 'RemoteAreaSurcharge' | 'WeightTier';

  @IsEnum(RuleTypeValueEnum)
  type_value!: RuleTypeValueEnum;

  @IsEnum(RuleTypeEnum)
  method!: RuleTypeEnum;

  @IsNumber()
  value!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  priority!: number;

  @IsDate()
  effective_from!: Date;

  @IsDate()
  effective_to!: Date;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsString()
  name!: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'time_window_start must be HH:mm (UTC)',
  })
  time_window_start?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'time_window_end must be HH:mm (UTC)',
  })
  time_window_end?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  min_distance_km?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  max_distance_km?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  min_total_weight_kg?: number;
}
