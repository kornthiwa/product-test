import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { Product } from '../entities/product.entity';

export class GetListProductDto {
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

export class GetProductListResponse {
  page!: number;
  pageSize!: number;
  total!: number;
  data!: Product[];
}
