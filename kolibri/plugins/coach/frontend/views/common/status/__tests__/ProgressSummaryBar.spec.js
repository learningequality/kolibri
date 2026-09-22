import { render } from '@testing-library/vue';
import ProgressSummaryBar from '../ProgressSummaryBar.vue';

describe('ProgressSummaryBar', () => {
  it('renders bar widths from the tally counts', () => {
    const { container } = render(ProgressSummaryBar, {
      props: {
        tally: { started: 2, completed: 3, notStarted: 4, helpNeeded: 1 },
      },
    });

    const widths = Array.from(container.querySelectorAll('.bar')).map(bar => bar.style.width);

    // The segments render in help-needed, started, completed order.
    expect(widths).toEqual(['10%', '20%', '30%']);
  });
});
