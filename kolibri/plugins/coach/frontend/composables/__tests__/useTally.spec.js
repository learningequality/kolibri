import { reactive, toRef } from 'vue';
import useTally, { tallyProp, validateTally } from '../useTally';

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

  it('updates when individual tally counts change', () => {
    const props = reactive({
      tally: { started: 2, completed: 3, notStarted: 4, helpNeeded: 1 },
    });
    const counts = useTally(toRef(props, 'tally'));
    expect(counts.total.value).toBe(10);

    props.tally.started = 5;
    props.tally.completed = 6;
    props.tally.notStarted = 7;
    props.tally.helpNeeded = 2;

    expect(counts.started.value).toBe(5);
    expect(counts.completed.value).toBe(6);
    expect(counts.notStarted.value).toBe(7);
    expect(counts.helpNeeded.value).toBe(2);
    expect(counts.total.value).toBe(20);
  });
});

describe('tally prop validation', () => {
  it('exports a required object prop using the shared validator', () => {
    expect(tallyProp).toEqual({ type: Object, required: true, validator: validateTally });
  });

  it.each([undefined, 0, 2, -1])('accepts optional integer helpNeeded: %s', helpNeeded => {
    expect(validateTally({ started: 1, completed: 2, notStarted: 3, helpNeeded })).toBe(true);
  });

  it('preserves acceptance of negative integer counts', () => {
    expect(validateTally({ started: -1, completed: -2, notStarted: -3 })).toBe(true);
  });

  describe.each(['started', 'completed', 'notStarted'])('%s', field => {
    it.each([undefined, null, '1', 1.5, NaN, Infinity, true])('rejects %s', value => {
      expect(validateTally({ started: 1, completed: 2, notStarted: 3, [field]: value })).toBe(
        false,
      );
    });
  });

  it.each([null, '1', 1.5, NaN, Infinity, true])(
    'rejects noninteger helpNeeded: %s',
    helpNeeded => {
      expect(validateTally({ started: 1, completed: 2, notStarted: 3, helpNeeded })).toBe(false);
    },
  );
});
