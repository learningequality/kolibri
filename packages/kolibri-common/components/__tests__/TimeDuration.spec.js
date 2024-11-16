import { render, screen } from '@testing-library/vue';
import TimeDuration from '../TimeDuration.vue';

const renderComponent = (props = {}) => {
  return render(TimeDuration, {
    props,
  });
};

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const testCases = [
  // Under 2 minutes, should show seconds
  { seconds: 0, expected: '0 seconds' },
  { seconds: 1, expected: '1 second' },
  { seconds: 59, expected: '59 seconds' },
  { seconds: MINUTE, expected: '60 seconds' },
  { seconds: 2 * MINUTE - 1, expected: '119 seconds' },

  // Under 1 hour, should show minutes (rounded down)
  { seconds: 2 * MINUTE, expected: '2 minutes' },
  { seconds: 30 * MINUTE, expected: '30 minutes' },
  { seconds: 30 * MINUTE + 1, expected: '30 minutes' },
  { seconds: 30 * MINUTE + 59, expected: '30 minutes' },
  { seconds: 59 * MINUTE, expected: '59 minutes' },

  // Under 1 day, should show hours (rounded down)
  { seconds: HOUR, expected: '1 hour' },
  { seconds: 2 * HOUR, expected: '2 hours' },
  { seconds: 23 * HOUR, expected: '23 hours' },
  { seconds: 23 * HOUR + 59 * MINUTE, expected: '23 hours' },
  { seconds: 23 * HOUR + 59 * MINUTE + 59, expected: '23 hours' },

  // Over 1 day, should show days (rounded down)
  { seconds: DAY, expected: '1 day' },
  { seconds: 2 * DAY, expected: '2 days' },
  { seconds: 6 * DAY, expected: '6 days' },
  { seconds: 6 * DAY + 23 * HOUR + 59 * MINUTE + 59, expected: '6 days' },
];

describe('TimeDuration', () => {
  it.each(testCases)('should render $seconds seconds as $expected', ({ seconds, expected }) => {
    renderComponent({ seconds });
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('should render empty string if seconds are not provided as props', () => {
    renderComponent();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
