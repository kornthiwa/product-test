import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true, collection: 'products' })
export class Product {
  @Prop({ required: true, unique: true, index: true })
  id!: string;

  @Prop({ required: true, description: 'ชื่อของสินค้า' })
  name!: string;

  @Prop({ required: true, min: 0, description: 'ราคาของสินค้า' })
  price!: number;

  @Prop({ required: true, min: 0, description: 'น้ำหนักของสินค้า' })
  weight!: number;

  @Prop({
    required: true,
    index: true,
    default: true,
    description: 'สถานะของสินค้า',
  })
  is_active!: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
