import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { PriceQuoteDto, PriceQuoteResponse } from './dto/price-quote.dto';
import { QuotesService } from './quotes.service';

@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post('price')
  async price(@Body() dto: PriceQuoteDto): Promise<PriceQuoteResponse> {
    return this.quotesService.priceQuote(dto);
  }
}
