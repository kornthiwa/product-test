import { Body, Controller, Post } from '@nestjs/common';
import { PriceQuoteDto, PriceQuoteResponse } from './dto/price-quote.dto';
import { QuotesService } from './quotes.service';

@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post('price')
  async computePriceQuote(
    @Body() dto: PriceQuoteDto,
  ): Promise<PriceQuoteResponse> {
    return this.quotesService.computePriceQuote(dto);
  }
}
