import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type JobDocument = HydratedDocument<Job>;

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type JobItemStatus = 'pending' | 'success' | 'failed';

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
    enum: ['pending', 'success', 'failed'],
    default: 'pending',
    description: 'สถานะของรายการในงาน',
  })
  status!: JobItemStatus;

  @Prop({ default: 0, description: 'ราคา' })
  finalPrice?: number;

  @Prop({
    type: [Number],
    default: [],
    description: 'รหัสกฎ (Rule.id) ที่ใช้ในการคำนวณราคา',
  })
  appliedRules?: number[];
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
  jobId!: number;

  @Prop({
    required: true,
    index: true,
    enum: ['queued', 'processing', 'completed', 'failed'],
  })
  status!: JobStatus;

  @Prop({ required: false, min: 0, description: 'ระยะทางจัดส่ง (km)' })
  distanceKm?: number;

  @Prop({ type: [JobItemSchema], default: [] })
  items!: JobItem[];

  @Prop({
    required: true,
    index: true,
    default: true,
    description: 'สถานะการใช้งานของงาน',
  })
  is_active!: boolean;
}

export const JobSchema = SchemaFactory.createForClass(Job);
