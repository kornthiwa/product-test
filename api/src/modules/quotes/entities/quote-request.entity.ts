import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Rule } from '../../rules/entities/rule.entity';

export type QuoteRequestDocument = HydratedDocument<QuoteRequest>;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'quote_requests' })
export class QuoteRequest {
  @Prop({ required: true, type: Object })
  requestPayload!: Record<string, unknown>;

  @Prop({ required: true })
  finalPrice!: number;

  @Prop({ required: true, type: [Types.ObjectId], ref: Rule.name, default: [] })
  appliedRules!: Types.ObjectId[];

  @Prop({ index: true })
  traceId?: string;
}

export const QuoteRequestSchema = SchemaFactory.createForClass(QuoteRequest);
