import EpubRendererIndex from '../src/views/EpubRendererIndex';

const { methods } = EpubRendererIndex;

describe('updateProgress', () => {
  let context = {};

  beforeEach(() => {
    context = {
      forceDurationBasedProgress: null,
      $emit: jest.fn(),
      durationBasedProgress: 0.1,
      visitedPages: { 1: 'true', 2: 'true', 3: 'true' },
      locations: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    };
  });

  it('should be able to calculate progress using "pages visitedPages/total" by default', () => {
    methods.updateProgress.call(context);

    expect(context.$emit.mock.calls[0][0]).toBe('updateProgress');
    expect(context.$emit.mock.calls[0][1]).toEqual(
      Object.keys(context.visitedPages).length / context.locations.length,
    );
    expect(context.$emit.mock.calls[0][1]).not.toBe(context.durationBasedProgress);
  });

  it('should have option of using time-based tracking for progress calculation when forceDurationBasedProgress is true', () => {
    context.forceDurationBasedProgress = true;
    methods.updateProgress.call(context);

    expect(context.$emit.mock.calls[0][0]).toBe('updateProgress');
    expect(context.$emit.mock.calls[0][1]).toBe(0.1);
    expect(context.$emit.mock.calls[0][1]).not.toEqual(
      Object.keys(context.visitedPages).length / context.locations.length,
    );
  });
});
