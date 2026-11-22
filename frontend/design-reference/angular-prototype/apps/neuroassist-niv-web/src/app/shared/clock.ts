// =============================================================================
// clock.ts — prototype reference time.
//
// Never use `new Date()`/`Date.now()` (real wall-clock) to filter or display
// mock data — the mock timestamps are fixed at 2026-07-20..2026-07-27; if
// a component compares against the real date on which someone opens the prototype,
// "today's events" and "synced Xh ago" become incoherent as soon as the real date
// passes 2026-07-27 (see knowledges/data-model-driven-ui.md — mock never
// uses "today"). `now()` pins the simulation's "present" to the last day of the mock.
// =============================================================================

const NOW_ISO = '2026-07-27T18:00:00';

export function now(): Date {
  return new Date(NOW_ISO);
}

export function nowIso(): string {
  return NOW_ISO;
}
