import {
  Rule,
  RuleTypeEnum,
  RuleTypeValueEnum,
} from '../rules/entities/rule.entity';

export const WEIGHT_TIER_MIN_TOTAL_KG = 10;

export type PricingLineInput = {
  productId: string;
  quantity: number;
  quoteAt: Date;
  isRemote: boolean;
  product: { price: number; weight: number };
};

export type PricingLineResult = {
  basePrice: number;
  finalPrice: number;
  appliedRuleIds: number[];
};

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function ruleApplies(
  rule: Rule,
  line: PricingLineInput,
  totalWeightKg: number,
): boolean {
  switch (rule.type) {
    case 'TimeWindowPromotion':
      return true;
    case 'RemoteAreaSurcharge':
      return line.isRemote;
    case 'WeightTier':
      return totalWeightKg >= WEIGHT_TIER_MIN_TOTAL_KG;
    default:
      return false;
  }
}

export function applyRuleToPrice(price: number, rule: Rule): number {
  const isDiscount = rule.method === RuleTypeEnum.DISCOUNT;
  const isPercent = rule.type_value === RuleTypeValueEnum.PERCENT;

  if (isDiscount && isPercent) {
    return price * (1 - rule.value / 100);
  }
  if (isDiscount && !isPercent) {
    return price - rule.value;
  }
  if (!isDiscount && isPercent) {
    return price * (1 + rule.value / 100);
  }
  return price + rule.value;
}
