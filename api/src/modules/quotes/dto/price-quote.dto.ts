import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class PriceQuoteLineDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity!: number;

  /** ระยะทางจัดส่ง (km) — ใช้กับกฎ RemoteAreaSurcharge */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  distanceKm?: number;
}

export class PriceQuoteDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PriceQuoteLineDto)
  items!: PriceQuoteLineDto[];

  @IsOptional()
  @IsDateString()
  quoteAt?: string;
}

export type PriceQuoteLineResult = {
  productId: string;
  quantity: number;
  basePrice: number;
  finalPrice: number;
  appliedRules: number[];
};

export type PriceQuoteResponse = {
  quoteAt: string;
  summaryPrice: number;
  items: PriceQuoteLineResult[];
};
