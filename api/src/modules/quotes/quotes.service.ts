import { BadRequestException, Injectable } from '@nestjs/common';
import { JobsService } from '../jobs/jobs.service';
import { ProductsService } from '../products/products.service';
import { RulesService } from '../rules/rules.service';
import {
  PriceQuoteDto,
  PriceQuoteItem,
  PriceQuoteResponse,
} from './dto/price-quote.dto';
import {
  PricingLineInput,
  applyRuleToPrice,
  roundMoney,
  ruleApplies,
} from './pricing-engine';
import { JobDocument } from '../jobs/entities/job.entity';
import { QueryFilter } from 'mongoose';

@Injectable()
export class QuotesService {
  constructor(
    private readonly rulesService: RulesService,
    private readonly jobsService: JobsService,
    private readonly productsService: ProductsService,
  ) {}

  async priceQuote(dto: PriceQuoteDto): Promise<PriceQuoteResponse> {
    const query: QueryFilter<JobDocument> = {};
    if (dto.jobIds?.length) {
      query.jobId = { $in: dto.jobIds };
    }
    const jobs = await this.jobsService.findWithQuery(query);
    console.log(jobs.length);

    if (jobs.length === 0) {
      throw new BadRequestException('No jobs found');
    }

    const rulesIds = [
      ...new Set(
        jobs.flatMap((j) => j.items.flatMap((i) => i.appliedRules ?? [])),
      ),
    ];

    const rules =
      rulesIds.length > 0
        ? await this.rulesService.findWithQuery({
            id: { $in: rulesIds },
            is_active: true,
          })
        : [];

    const quoteAt = new Date();
    const isRemote = false;

    const result = await Promise.all(
      jobs.map(async (job) => {
        const items: PriceQuoteItem[] = [];
        let summaryAcc = 0;

        for (const line of job.items) {
          const product = await this.productsService.findOne(line.productId);
          if (!product.is_active) {
            throw new BadRequestException(
              `Product ${line.productId} is not available for pricing`,
            );
          }

          const lineInput: PricingLineInput = {
            productId: line.productId,
            quantity: line.quantity,
            quoteAt,
            isRemote,
            product: { price: product.price, weight: product.weight },
          };

          const basePrice = roundMoney(product.price * line.quantity);
          const totalWeightKg = product.weight * line.quantity;

          const lineRuleIds = new Set(line.appliedRules ?? []);
          const lineRules = rules.filter((r) => lineRuleIds.has(r.id));

          let price = basePrice;
          const appliedRuleIds: number[] = [];
          for (const rule of lineRules) {
            if (!ruleApplies(rule, lineInput, totalWeightKg)) {
              continue;
            }
            price = applyRuleToPrice(price, rule);
            appliedRuleIds.push(rule.id);
          }

          const finalPrice = roundMoney(Math.max(0, price));
          items.push({
            productId: line.productId,
            quantity: line.quantity,
            basePrice,
            finalPrice,
            appliedRules: appliedRuleIds,
          });
          summaryAcc += finalPrice;
        }

        return {
          jobId: job.jobId,
          summaryPrice: roundMoney(summaryAcc),
          items,
        };
      }),
    );

    return { data: result };
  }
}
