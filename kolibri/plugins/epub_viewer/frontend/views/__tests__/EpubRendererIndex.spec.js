import EpubRendererIndex from '../EpubRendererIndex';

// alwan (used by the settings sidebar's nested ColorPicker) needs a canvas,
// which jsdom does not implement; stub it out so the module tree can load.
jest.mock('alwan', () => ({
  __esModule: true,
  default: class Alwan {
    on() {}
    destroy() {}
  },
}));

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

describe('relocatedHandler', () => {
  let context = {};
  const location = {
    atEnd: false,
    start: { percentage: 0.012, cfi: 'epubcfi(/6/2!/4/2)', location: 0 },
    end: { percentage: 0.02, location: 0 },
  };

  beforeEach(() => {
    context = {
      sliderValue: 1.2,
      relocationCount: 0,
      locations: ['epubcfi(/6/2!/4/2)'],
      updateCurrentSection: jest.fn(),
      storeVisitedPage: jest.fn(),
      finish: jest.fn(),
      updateProgress: jest.fn(),
      updateContentState: jest.fn(),
    };
  });

  it('should count every relocation, even one that leaves sliderValue unchanged', () => {
    methods.relocatedHandler.call(context, location);
    methods.relocatedHandler.call(context, location);

    expect(context.sliderValue).toBe(1.2);
    expect(context.relocationCount).toBe(2);
  });
});
