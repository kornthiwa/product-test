import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  IsNumber,
  IsDate,
} from 'class-validator';
import { Rule, RuleTypeEnum, RuleTypeValueEnum } from '../entities/rule.entity';

export class CreateRuleDto implements Partial<Rule> {
  @IsEnum(['TimeWindowPromotion', 'RemoteAreaSurcharge', 'WeightTier'] as const)
  type!: 'TimeWindowPromotion' | 'RemoteAreaSurcharge' | 'WeightTier';

  @IsEnum(RuleTypeEnum)
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
}
