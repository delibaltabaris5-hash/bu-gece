import type { NightPlan, PlanFilter } from '@/types';

export interface PlanMatch {
  plans: NightPlan[];
  exact: boolean;
}

export function matchPlans(all: NightPlan[], filter: PlanFilter): PlanMatch {
  const exact = all.filter(
    (plan) =>
      plan.mood === filter.mood &&
      plan.budget === filter.budget &&
      plan.distance === filter.distance,
  );
  if (exact.length > 0) return { plans: exact, exact: true };

  const near = all.filter(
    (plan) => plan.budget === filter.budget && plan.distance === filter.distance,
  );
  if (near.length > 0) return { plans: near, exact: false };

  const byBudget = all.filter((plan) => plan.budget === filter.budget);
  if (byBudget.length > 0) return { plans: byBudget, exact: false };

  return { plans: all, exact: false };
}
