import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Rule } from '../../rules/entities/rule.entity';

export type JobDocument = HydratedDocument<Job>;

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type JobItemStatus = 'success' | 'failed';

@Schema({ _id: false })
export class JobItem {
  @Prop({ required: true, min: 0, description: 'ลำดับของคำขอ' })
  index!: number;

  @Prop({
    required: true,
    description: 'รหัสอ้างอิงสินค้า (Product.id)',
  })
  productId!: string;

  @Prop({ required: true, min: 1, description: 'จำนวนของสินค้าในรายการนี้' })
  quantity!: number;

  @Prop({
    required: true,
    enum: ['success', 'failed'],
    description: 'สถานะของงาน',
  })
  status!: JobItemStatus;

  @Prop({ default: 0, description: 'ราคา' })
  finalPrice?: number;

  @Prop({
    type: [Types.ObjectId],
    ref: Rule.name,
    default: [],
    description: 'กฎที่ใช้ในการคำนวณราคา',
  })
  appliedRules?: Types.ObjectId[];
}

const JobItemSchema = SchemaFactory.createForClass(JobItem);

@Schema({ timestamps: true, collection: 'jobs' })
export class Job {
  @Prop({
    required: true,
    unique: true,
    index: true,
    description: 'รหัสของงาน',
  })
  jobId!: string;

  @Prop({
    required: true,
    index: true,
    enum: ['queued', 'processing', 'completed', 'failed'],
  })
  status!: JobStatus;

  @Prop({ required: true, min: 0, description: 'จำนวนของงาน' })
  total!: number;

  @Prop({
    required: true,
    min: 0,
    default: 0,
    description: 'จำนวนของงานที่ประมวลผลแล้ว',
  })
  processed!: number;

  @Prop({ type: [JobItemSchema], default: [] })
  items!: JobItem[];
}

export const JobSchema = SchemaFactory.createForClass(Job);
