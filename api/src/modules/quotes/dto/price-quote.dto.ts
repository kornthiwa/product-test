import { IsArray, IsOptional, IsString } from 'class-validator';

export class PriceQuoteDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  jobIds?: string[];
}

export type PriceQuoteItem = {
  productId: string;
  quantity: number;
  basePrice: number;
  finalPrice: number;
  appliedRules: number[];
};

export type PriceQuoteJobBlock = {
  jobId: string;
  summaryPrice: number;
  items: PriceQuoteItem[];
};

export class PriceQuoteResponse {
  data!: PriceQuoteJobBlock[];
}
