import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import SparklineBar, { MIN_SEGMENT_WIDTH_PX } from '../SparklineBar.vue';

function renderSparkline(overrides = {}) {
  return render(SparklineBar, {
    props: {
      lowCount: 2,
      midCount: 3,
      highCount: 5,
      ...overrides,
    },
  });
}

describe('SparklineBar', () => {
  it('renders all three segments and keeps zero-count segments visible', () => {
    const { container } = renderSparkline({ lowCount: 0, midCount: 0, highCount: 0 });

    const segments = container.querySelectorAll('.segment');
    expect(segments).toHaveLength(3);
    expect(screen.getByText('0', { selector: '.segment-low .count-text' })).toBeInTheDocument();
    expect(screen.getByText('0', { selector: '.segment-mid .count-text' })).toBeInTheDocument();
    expect(screen.getByText('0', { selector: '.segment-high .count-text' })).toBeInTheDocument();
  });

  it('provides a visually hidden textual summary for screen readers', () => {
    renderSparkline({ lowCount: 1, midCount: 0, highCount: 4 });

    const hiddenSummary = screen.getByText(/1 low, 0 medium, 4 high/i);
    expect(hiddenSummary).toHaveClass('visuallyhidden');
    expect(hiddenSummary).not.toHaveAttribute('aria-hidden');
  });

  it('marks the visual bar and counts as aria-hidden to avoid double announcement', () => {
    const { container } = renderSparkline();
    const sparklineBar = container.querySelector('.sparkline-bar');
    const counts = container.querySelectorAll('.count-text');

    expect(sparklineBar).toHaveAttribute('aria-hidden', 'true');
    counts.forEach(count => {
      expect(count).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('displays proportional widths with a minimum offset applied to every segment', () => {
    const { container } = renderSparkline({ lowCount: 1, midCount: 2, highCount: 7 });
    const widths = Array.from(container.querySelectorAll('.segment')).map(
      segment => segment.style.width,
    );

    const offset = MIN_SEGMENT_WIDTH_PX * 3;
    expect(widths).toEqual([
      `calc(${MIN_SEGMENT_WIDTH_PX}px + 0.1 * (100% - ${offset}px))`,
      `calc(${MIN_SEGMENT_WIDTH_PX}px + 0.2 * (100% - ${offset}px))`,
      `calc(${MIN_SEGMENT_WIDTH_PX}px + 0.7 * (100% - ${offset}px))`,
    ]);
  });

  it('splits the bar evenly when there are no learners in the distribution', () => {
    const { container } = renderSparkline({ lowCount: 0, midCount: 0, highCount: 0 });
    const widths = Array.from(container.querySelectorAll('.segment')).map(
      segment => segment.style.width,
    );

    expect(widths).toEqual(['calc(33.3333%)', 'calc(33.3333%)', 'calc(33.3333%)']);
  });

  it('keeps counts non-negative through prop validation', () => {
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    renderSparkline({ lowCount: -1 });

    expect(consoleWarn).toHaveBeenCalled();
    consoleWarn.mockRestore();
  });
});
