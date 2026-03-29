import { BadRequestException, Injectable } from '@nestjs/common';
import { Product } from '../products/entities/product.entity';
import { ProductsService } from '../products/products.service';
import { RulesService } from '../rules/rules.service';
import { PriceQuoteDto, PriceQuoteResponse } from './dto/price-quote.dto';
import { computePriceLine, roundMoney } from './quote-pricing';

@Injectable()
export class QuotesService {
  constructor(
    private readonly rules: RulesService,
    private readonly products: ProductsService,
  ) {}

  async computePriceQuote(dto: PriceQuoteDto): Promise<PriceQuoteResponse> {
    const quoteAt = dto.quoteAt ? new Date(dto.quoteAt) : new Date();
    const rulesForQuote = await this.rules.findWithQuery({
      is_active: true,
      effective_from: { $lte: quoteAt },
      effective_to: { $gte: quoteAt },
    });

    const productCache = new Map<string, Product>();
    const items: PriceQuoteResponse['items'] = [];
    let summary = 0;

    for (const item of dto.items) {
      let product = productCache.get(item.productId);
      if (!product) {
        product = await this.products.findOne(item.productId);
        productCache.set(item.productId, product);
      }
      if (!product.is_active) {
        throw new BadRequestException(
          `Product ${item.productId} is not available for pricing`,
        );
      }

      const { basePrice, finalPrice, appliedRuleIds } = computePriceLine({
        unitPrice: product.price,
        unitWeightKg: product.weight,
        quantity: item.quantity,
        quoteAt,
        distanceKm: item.distanceKm,
        rules: rulesForQuote,
      });

      items.push({
        productId: item.productId,
        quantity: item.quantity,
        basePrice,
        finalPrice,
        appliedRules: appliedRuleIds,
      });
      summary += finalPrice;
    }

    return {
      quoteAt: quoteAt.toISOString(),
      summaryPrice: roundMoney(summary),
      items,
    };
  }
}
