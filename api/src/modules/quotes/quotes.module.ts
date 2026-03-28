import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { RulesModule } from '../rules/rules.module';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [RulesModule, ProductsModule, JobsModule],
  controllers: [QuotesController],
  providers: [QuotesService],
})
export class QuotesModule {}
