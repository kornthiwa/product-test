import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PriceQuoteDto, PriceQuoteResponse } from './dto/price-quote.dto';
import { QuotesService } from './quotes.service';
import { BulkQuoteDtoResponse } from './dto/bulk-quote.dto';
import { parseBulkUploadToJobs } from './bulk-upload.parse';

@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post('price')
  async computePriceQuote(
    @Body() dto: PriceQuoteDto,
  ): Promise<PriceQuoteResponse> {
    return this.quotesService.computePriceQuote(dto);
  }

  @Post('bulk')
  @UseInterceptors(FileInterceptor('file'))
  async bulkQuotes(
    @UploadedFile() file?: {
      buffer: Buffer;
      originalname?: string;
      mimetype?: string;
    },
  ): Promise<BulkQuoteDtoResponse> {
    if (!file?.buffer?.length) {
      throw new BadRequestException(
        'Upload a JSON or CSV file in field "file".',
      );
    }
    const jobs = parseBulkUploadToJobs(file);
    return this.quotesService.bulkQuotes(jobs);
  }
}
