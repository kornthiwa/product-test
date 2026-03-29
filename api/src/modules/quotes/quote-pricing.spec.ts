import { RuleTypeEnum, RuleTypeValueEnum } from '../rules/entities/rule.entity';
import type { Rule } from '../rules/entities/rule.entity';
import { computePriceLine, roundMoney } from './quote-pricing';

function rule(
  id: number,
  type: Rule['type'],
  overrides: Partial<Rule> = {},
): Rule {
  return {
    id,
    type,
    name: 'r',
    method: RuleTypeEnum.DISCOUNT,
    type_value: RuleTypeValueEnum.PERCENT,
    value: 10,
    priority: 100,
    is_active: true,
    effective_from: new Date('2026-01-01'),
    effective_to: new Date('2026-12-31'),
    ...overrides,
  } as Rule;
}

describe('quote-pricing', () => {
  const quoteAt = new Date('2026-06-15T12:30:00.000Z');

  it('TimeWindowPromotion without window always matches', () => {
    const r = rule(1, 'TimeWindowPromotion');
    const out = computePriceLine({
      unitPrice: 100,
      unitWeightKg: 1,
      quantity: 1,
      quoteAt,
      rules: [r],
    });
    expect(out.appliedRuleIds).toEqual([1]);
  });

  it('TimeWindowPromotion matches only inside HH:mm (UTC)', () => {
    const r = rule(1, 'TimeWindowPromotion', {
      time_window_start: '11:00',
      time_window_end: '14:00',
    });
    const inside = computePriceLine({
      unitPrice: 100,
      unitWeightKg: 1,
      quantity: 1,
      quoteAt: new Date('2026-06-15T12:00:00.000Z'),
      rules: [r],
    });
    const outside = computePriceLine({
      unitPrice: 100,
      unitWeightKg: 1,
      quantity: 1,
      quoteAt: new Date('2026-06-15T10:00:00.000Z'),
      rules: [r],
    });
    expect(inside.appliedRuleIds).toEqual([1]);
    expect(outside.appliedRuleIds).toEqual([]);
  });

  it('applies percent discount when matched', () => {
    const r = rule(10, 'TimeWindowPromotion', {
      method: RuleTypeEnum.DISCOUNT,
      type_value: RuleTypeValueEnum.PERCENT,
      value: 10,
    });
    const out = computePriceLine({
      unitPrice: 100,
      unitWeightKg: 1,
      quantity: 2,
      quoteAt,
      rules: [r],
    });
    expect(out.basePrice).toBe(200);
    expect(out.finalPrice).toBe(roundMoney(180));
  });

  it('RemoteAreaSurcharge without km band matches when distanceKm > 0', () => {
    const r = rule(20, 'RemoteAreaSurcharge', {
      method: RuleTypeEnum.SURCHARGE,
      type_value: RuleTypeValueEnum.PERCENT,
      value: 10,
    });
    expect(
      computePriceLine({
        unitPrice: 100,
        unitWeightKg: 1,
        quantity: 1,
        quoteAt,
        distanceKm: 0,
        rules: [r],
      }).appliedRuleIds,
    ).toEqual([]);
    expect(
      computePriceLine({
        unitPrice: 100,
        unitWeightKg: 1,
        quantity: 1,
        quoteAt,
        distanceKm: 25,
        rules: [r],
      }).appliedRuleIds,
    ).toEqual([20]);
  });

  it('applies at most one rule per type (higher priority wins)', () => {
    const high = rule(1, 'TimeWindowPromotion', {
      priority: 100,
      value: 20,
    });
    const low = rule(2, 'TimeWindowPromotion', {
      priority: 10,
      value: 5,
    });
    const out = computePriceLine({
      unitPrice: 100,
      unitWeightKg: 1,
      quantity: 1,
      quoteAt,
      rules: [high, low],
    });
    expect(out.appliedRuleIds).toEqual([1]);
    expect(out.finalPrice).toBe(80);
  });

  it('RemoteAreaSurcharge with min/max km requires distanceKm in range', () => {
    const r = rule(21, 'RemoteAreaSurcharge', {
      method: RuleTypeEnum.SURCHARGE,
      type_value: RuleTypeValueEnum.AMOUNT,
      value: 5,
      min_distance_km: 50,
      max_distance_km: 100,
    });
    expect(
      computePriceLine({
        unitPrice: 100,
        unitWeightKg: 1,
        quantity: 1,
        quoteAt,
        rules: [r],
      }).appliedRuleIds,
    ).toEqual([]);
    expect(
      computePriceLine({
        unitPrice: 100,
        unitWeightKg: 1,
        quantity: 1,
        quoteAt,
        distanceKm: 75,
        rules: [r],
      }).appliedRuleIds,
    ).toEqual([21]);
  });
});
