import PdfRendererIndex from '../src/views/PdfRendererIndex';

const { methods } = PdfRendererIndex;

jest.mock('kolibri.urls');

describe('updateProgress', () => {
  let context = {};

  beforeEach(() => {
    context = {
      forceDurationBasedProgress: null,
      $emit: jest.fn(),
      durationBasedProgress: 0.1,
      savedVisitedPages: { 1: 'true', 2: 'true', 3: 'true' },
      totalPages: 9,
    };
  });

  it('should be able to calculate progress using "pages visited/total" by default', () => {
    methods.updateProgress.call(context);

    expect(context.$emit.mock.calls[0][0]).toBe('updateProgress');
    expect(context.$emit.mock.calls[0][1]).toEqual(
      Object.keys(context.savedVisitedPages).length / context.totalPages
    );
    expect(context.$emit.mock.calls[0][1]).not.toBe(context.durationBasedProgress);
  });

  it('should have option of using time-based tracking for progress calculation when forceDurationBasedProgress is true', () => {
    context.forceDurationBasedProgress = true;
    methods.updateProgress.call(context);

    expect(context.$emit.mock.calls[0][0]).toBe('updateProgress');
    expect(context.$emit.mock.calls[0][1]).toBe(0.1);
    expect(context.$emit.mock.calls[0][1]).not.toEqual(
      Object.keys(context.savedVisitedPages).length / context.totalPages
    );
  });
});
