// Trial-tier daily menu: unlike dailyPlan()'s adaptive weak-signal rotation,
// free-tier users during their 7-day trial get a fixed, predetermined
// sequence (practice_modules.trial_sequence) -- 3 new modules per day. This
// returns only *that day's* newly-unlocked modules for the dashboard widget;
// the Library page separately shows the full cumulative unlocked set.

export type TrialModuleRow = {
  slug: string;
  category: string;
  trial_sequence: number | null;
};

export type PlannedTrialDrill = { category: string; slug: string };

export function trialModulePlan(
  modules: TrialModuleRow[],
  trialDay: number,
): PlannedTrialDrill[] {
  const lo = (trialDay - 1) * 3 + 1;
  const hi = trialDay * 3;
  return modules
    .filter(
      (m): m is TrialModuleRow & { trial_sequence: number } =>
        m.trial_sequence !== null &&
        m.trial_sequence >= lo &&
        m.trial_sequence <= hi,
    )
    .sort((a, b) => a.trial_sequence - b.trial_sequence)
    .map((m) => ({ category: m.category, slug: m.slug }));
}
