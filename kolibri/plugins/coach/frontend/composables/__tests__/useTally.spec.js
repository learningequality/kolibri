import { reactive, toRef } from 'vue';
import useTally, { validateTally } from '../useTally';

describe('useTally', () => {
  it('returns the four counts and their total', () => {
    const props = reactive({
      tally: { started: 2, completed: 3, notStarted: 4, helpNeeded: 1 },
    });
    const { started, completed, notStarted, helpNeeded, total } = useTally(toRef(props, 'tally'));

    expect(started.value).toBe(2);
    expect(completed.value).toBe(3);
    expect(notStarted.value).toBe(4);
    expect(helpNeeded.value).toBe(1);
    expect(total.value).toBe(10);
  });

  it('defaults helpNeeded to zero when omitted', () => {
    const props = reactive({ tally: { started: 2, completed: 3, notStarted: 4 } });
    const { helpNeeded, total } = useTally(toRef(props, 'tally'));

    expect(helpNeeded.value).toBe(0);
    expect(total.value).toBe(9);
  });

  it('returns zero for an empty tally', () => {
    const props = reactive({ tally: { started: 0, completed: 0, notStarted: 0 } });
    const { total } = useTally(toRef(props, 'tally'));

    expect(total.value).toBe(0);
  });

  it('updates the counts and total when tally is replaced', () => {
    const props = reactive({
      tally: { started: 2, completed: 3, notStarted: 4, helpNeeded: 1 },
    });
    const counts = useTally(toRef(props, 'tally'));
    expect(counts.total.value).toBe(10);

    props.tally = { started: 5, completed: 6, notStarted: 7 };

    expect(counts.started.value).toBe(5);
    expect(counts.completed.value).toBe(6);
    expect(counts.notStarted.value).toBe(7);
    expect(counts.helpNeeded.value).toBe(0);
    expect(counts.total.value).toBe(18);
  });
});

describe('tally prop validation', () => {
  it.each([undefined, 2])('accepts optional helpNeeded: %s', helpNeeded => {
    expect(validateTally({ started: 1, completed: 2, notStarted: 3, helpNeeded })).toBe(true);
  });

  it.each(['started', 'completed', 'notStarted'])('rejects a tally missing %s', field => {
    const tally = { started: 1, completed: 2, notStarted: 3 };
    delete tally[field];

    expect(validateTally(tally)).toBe(false);
  });
});
