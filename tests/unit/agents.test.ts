import { describe, expect, it } from 'vitest';
import { agentContext, runAgents, visibleTo } from '../../src/lib/agents';
import { emptyState, makeAgent, makeEvent, makeHabit, makeMemory, makeTask } from '../../src/lib/core';
import type { State } from '../../src/lib/types';

const today = new Date(2026, 10, 17, 9, 0);
const base = (): State => ({
  ...emptyState(),
  tasks: [makeTask('Wiskunde maken', 'School', '2026-11-17')],
  events: [makeEvent('Les Frans', '2026-11-17', '10:00')],
  memories: [makeMemory('Ik heb maandag vrij')],
  habits: [makeHabit('Lezen')],
});

describe('agents', () => {
  it('only see the areas they are allowed to read', () => {
    const a = makeAgent({ name: 'x', can: { tasks: 'read' } });
    const v = visibleTo(base(), a);
    expect(v.tasks).toHaveLength(1);
    expect(v.events).toHaveLength(0);
    expect(v.memories).toHaveLength(0);
    const ctx = agentContext(base(), a);
    expect(ctx.areas.map((x) => x.area)).toEqual(['tasks']);
    expect(ctx.areas[0].sample[0]).toBe('Wiskunde maken (2026-11-17)');
    expect(ctx.tokens).toBeGreaterThan(0);
  });

  it('a scheduled briefing agent makes one draft note a day, after its time, from what it may read', () => {
    const a = makeAgent({ name: 'Ochtend', template: 'briefing', schedule: '07:30', can: { agenda: 'read' } });
    const s = { ...base(), agents: [a] };
    expect(runAgents(s, new Date(2026, 10, 17, 7, 0), 'nl').ran).toBe(0);
    const out = runAgents(s, today, 'nl');
    expect(out.ran).toBe(1);
    const d = out.state.drafts[0];
    expect(d.kind).toBe('note');
    expect(d.source).toBe('agent:Ochtend');
    expect(d.body).toContain('Les Frans');
    expect(d.body).not.toContain('Wiskunde maken'); // no access to tasks
    expect(runAgents(out.state, new Date(2026, 10, 17, 12, 0), 'nl').ran).toBe(0);
    expect(runAgents(out.state, new Date(2026, 10, 18, 8, 0), 'nl').ran).toBe(1);
  });

  it('agents that need AI, without a schedule, or switched off do nothing yet', () => {
    const s = {
      ...base(),
      agents: [
        makeAgent({ name: 'Coach', template: 'coach', schedule: '07:00', can: { learn: 'read' } }),
        makeAgent({ name: 'Zonder tijd', template: 'briefing', schedule: '' }),
        makeAgent({ name: 'Uit', template: 'briefing', schedule: '07:00', enabled: false }),
      ],
    };
    expect(runAgents(s, today, 'nl').ran).toBe(0);
  });
});
