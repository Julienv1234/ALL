import { describe, expect, it } from 'vitest';
import { elapsedMs, fmt, remainingMs, type Timer } from '../../src/lib/timer';

const base: Timer = { subjectId: 's', minutes: 25, startedAt: 1_000_000, pausedAt: null, pausedTotal: 0 };

describe('focus timer maths', () => {
  it('counts down from the start moment', () => {
    expect(remainingMs(base, base.startedAt)).toBe(25 * 60_000);
    expect(remainingMs(base, base.startedAt + 60_000)).toBe(24 * 60_000);
    expect(remainingMs(base, base.startedAt + 99 * 60_000)).toBe(0);
  });

  it('stands still while paused and leaves out paused time afterwards', () => {
    const paused = { ...base, pausedAt: base.startedAt + 5 * 60_000 };
    expect(elapsedMs(paused, base.startedAt + 30 * 60_000)).toBe(5 * 60_000);
    const resumed = { ...base, pausedTotal: 10 * 60_000 };
    expect(elapsedMs(resumed, base.startedAt + 15 * 60_000)).toBe(5 * 60_000);
  });

  it('formats as mm:ss and rounds up so 0:00 only shows at the very end', () => {
    expect(fmt(25 * 60_000)).toBe('25:00');
    expect(fmt(59_001)).toBe('01:00');
    expect(fmt(500)).toBe('00:01');
    expect(fmt(0)).toBe('00:00');
  });
});
