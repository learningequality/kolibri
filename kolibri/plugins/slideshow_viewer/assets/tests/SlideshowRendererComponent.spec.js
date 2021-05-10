import SlideshowRendererComponent from '../src/views/SlideshowRendererComponent';

const { methods } = SlideshowRendererComponent;

describe('updateProgress', () => {
  let context = {};

  beforeEach(() => {
    context = {
      forceTimeBasedProgress: null,
      $emit: jest.fn(),
      durationBasedProgress: 0.1,
      visitedSlides: [1, 2, 3],
      slides: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    };
  });

  it('should be able to calculate progress using "pages visited/total" by default', () => {
    methods.updateProgress.call(context);

    expect(context.$emit.mock.calls[0][0]).toBe('updateProgress');
    expect(context.$emit.mock.calls[0][1]).toEqual(
      context.visitedSlides.length / context.slides.length
    );
    expect(context.$emit.mock.calls[0][1]).not.toBe(context.durationBasedProgress);
  });

  it('should have option of using time-based tracking for progress calculation when forceTimeBasedProgress is true', () => {
    context.forceTimeBasedProgress = true;
    methods.updateProgress.call(context);

    expect(context.$emit.mock.calls[0][0]).toBe('updateProgress');
    expect(context.$emit.mock.calls[0][1]).toBe(0.1);
    expect(context.$emit.mock.calls[0][1]).not.toEqual(
      context.visitedSlides.length / context.slides.length
    );
  });
});
