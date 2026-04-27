import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import SparklineBar, { MIN_SEGMENT_WIDTH_PX } from '../SparklineBar.vue';

const { sparklineDistributionLabel$ } = coursesStrings;

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
    const COUNTS = { lowCount: 0, midCount: 0, highCount: 0 };
    const { container } = renderSparkline(COUNTS);

    const segments = container.querySelectorAll('.segment');
    expect(segments).toHaveLength(3);
    expect(
      screen.getByText(COUNTS.lowCount, { selector: '.segment-low .count-text' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(COUNTS.midCount, { selector: '.segment-mid .count-text' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(COUNTS.highCount, { selector: '.segment-high .count-text' }),
    ).toBeInTheDocument();
  });

  it('provides a visually hidden textual summary for screen readers', () => {
    renderSparkline({ lowCount: 1, midCount: 0, highCount: 4 });

    const hiddenSummary = screen.getByText(
      sparklineDistributionLabel$({ lowCount: 1, midCount: 0, highCount: 4 }),
    );
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

  it('sizes each segment proportionally to its count, with a constant minimum width', () => {
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

  it('gives a zero-count segment only the minimum width with no proportional addition', () => {
    const { container } = renderSparkline({ lowCount: 0, midCount: 3, highCount: 7 });
    const [lowWidth] = Array.from(container.querySelectorAll('.segment')).map(
      segment => segment.style.width,
    );
    const offset = MIN_SEGMENT_WIDTH_PX * 3;
    expect(lowWidth).toBe(`calc(${MIN_SEGMENT_WIDTH_PX}px + 0 * (100% - ${offset}px))`);
  });

  it('splits the bar evenly when there are no learners in the distribution', () => {
    const { container } = renderSparkline({ lowCount: 0, midCount: 0, highCount: 0 });
    const widths = Array.from(container.querySelectorAll('.segment')).map(
      segment => segment.style.width,
    );

    expect(widths).toEqual(['calc(33.3333%)', 'calc(33.3333%)', 'calc(33.3333%)']);
  });

  it('keeps counts non-negative through prop validation', () => {
    const { validator } = SparklineBar.props.lowCount;
    expect(validator(0)).toBe(true);
    expect(validator(5)).toBe(true);
    expect(validator(-1)).toBe(false);
  });
});
