import {
  Rule,
  RuleTypeEnum,
  RuleTypeValueEnum,
} from '../rules/entities/rule.entity';

const DEFAULT_WEIGHT_TIER_MIN_KG = 10;

type computePriceLineParams = {
  unitPrice: number;
  unitWeightKg: number;
  quantity: number;
  quoteAt: Date;
  distanceKm?: number;
  rules: Rule[];
};

type ComputePriceLineResult = {
  basePrice: number;
  finalPrice: number;
  appliedRuleIds: number[];
};

export type QuoteLineContext = {
  quoteAt: Date;
  lineWeightKg: number;
  distanceKm?: number;
};

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseHmToMinutes(hm: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hm.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function utcMinutesOfDay(d: Date): number {
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

// ตรวจสอบว่า quoteAt อยู่ในช่วงเวลาของ rule
function isQuoteInRuleTimeWindow(rule: Rule, quoteAt: Date): boolean {
  const start = rule.time_window_start?.trim();
  const end = rule.time_window_end?.trim();
  if (!start || !end) return true;
  const sm = parseHmToMinutes(start);
  const em = parseHmToMinutes(end);
  if (sm === null || em === null) return true;
  const q = utcMinutesOfDay(quoteAt);
  if (sm <= em) return q >= sm && q <= em;
  return q >= sm || q <= em;
}

// ตรวจสอบว่า distanceKm อยู่ในช่วงเวลาของ rule
function remoteRuleMatches(rule: Rule, distanceKm?: number): boolean {
  if (distanceKm == null || Number.isNaN(distanceKm)) return false;
  const hasBand = rule.min_distance_km != null || rule.max_distance_km != null;
  if (hasBand) {
    if (rule.min_distance_km != null && distanceKm < rule.min_distance_km) {
      return false;
    }
    if (rule.max_distance_km != null && distanceKm > rule.max_distance_km) {
      return false;
    }
    return true;
  }
  return distanceKm > 0;
}

function weightTierRuleMatches(rule: Rule, args: QuoteLineContext): boolean {
  return (
    args.lineWeightKg <=
    (rule.min_total_weight_kg ?? DEFAULT_WEIGHT_TIER_MIN_KG)
  );
}

function ruleMatchesQuoteLine(rule: Rule, args: QuoteLineContext): boolean {
  switch (rule.type) {
    case 'TimeWindowPromotion':
      return isQuoteInRuleTimeWindow(rule, args.quoteAt);
    case 'RemoteAreaSurcharge':
      return remoteRuleMatches(rule, args.distanceKm);
    case 'WeightTier':
      return weightTierRuleMatches(rule, args);
    default:
      return false;
  }
}

function adjustPriceByRule(price: number, rule: Rule): number {
  const discount = rule.method === RuleTypeEnum.DISCOUNT;
  const percent = rule.type_value === RuleTypeValueEnum.PERCENT;

  if (discount && percent) return price * (1 - rule.value / 100);
  if (discount && !percent) return price - rule.value;
  if (!discount && percent) return price * (1 + rule.value / 100);
  return price + rule.value;
}

export function computePriceLine({
  unitPrice,
  unitWeightKg,
  quantity,
  quoteAt,
  distanceKm,
  rules,
}: computePriceLineParams): ComputePriceLineResult {
  const basePrice = roundMoney(unitPrice * quantity);
  const lineWeightKg = unitWeightKg * quantity;
  const args: QuoteLineContext = {
    quoteAt,
    lineWeightKg,
    distanceKm,
  };

  let price = basePrice;
  const appliedRuleIds: number[] = [];
  const usedTypes = new Set<Rule['type']>();

  for (const rule of rules) {
    if (usedTypes.has(rule.type)) continue;
    if (!ruleMatchesQuoteLine(rule, args)) continue;
    price = adjustPriceByRule(price, rule);
    appliedRuleIds.push(rule.id);
    usedTypes.add(rule.type);
  }

  return {
    basePrice,
    finalPrice: roundMoney(Math.max(0, price)),
    appliedRuleIds,
  };
}
