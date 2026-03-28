import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RuleDocument = HydratedDocument<Rule>;

export type RuleType =
  | 'TimeWindowPromotion'
  | 'RemoteAreaSurcharge'
  | 'WeightTier';
export enum RuleTypeEnum {
  DISCOUNT = 'discount',
  SURCHARGE = 'surcharge',
}
export enum RuleTypeValueEnum {
  PERCENT = 'percent',
  AMOUNT = 'amount',
}

@Schema({ timestamps: true, collection: 'rules' })
export class Rule {
  @Prop({ required: true, unique: true, index: true })
  id!: number;

  @Prop({
    required: true,
    index: true,
    enum: ['TimeWindowPromotion', 'RemoteAreaSurcharge', 'WeightTier'],
    description: 'ชนิดของกฎ',
  })
  type!: RuleType;

  @Prop({ required: true, enum: RuleTypeEnum, description: 'วิธีการของกฎ' })
  method!: RuleTypeEnum;

  @Prop({ required: true, enum: RuleTypeValueEnum, description: 'ค่าของกฎ' })
  type_value!: RuleTypeValueEnum;

  @Prop({ required: true, description: 'ค่าของกฎ' })
  value!: number;

  @Prop({ required: true, index: true, min: 0, description: 'ความสำคัญของกฎ' })
  priority!: number;

  @Prop({ required: true, index: true, description: 'วันที่เริ่มต้นของกฎ' })
  effective_from!: Date;

  @Prop({ required: true, index: true, description: 'วันที่สิ้นสุดของกฎ' })
  effective_to!: Date;

  @Prop({
    required: true,
    index: true,
    default: true,
    description: 'สถานะของกฎ',
  })
  is_active!: boolean;

  @Prop({ required: true, description: 'ชื่อของกฎ' })
  name!: string;
}

export const RuleSchema = SchemaFactory.createForClass(Rule);
