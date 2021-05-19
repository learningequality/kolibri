import Html5AppRendererIndex from '../src/views/Html5AppRendererIndex';

const { methods } = Html5AppRendererIndex;

describe('recordProgress', () => {
  let context = {};

  beforeEach(() => {
    context = {
      $emit: jest.fn(),
      durationBasedProgress: 0.1,
      pollProgress: jest.fn(),
      hashi: {
        getProgress() {
          return 0.1;
        },
      },
    };
  });

  it('should be able to calculate progress using time-based tracking when hashiProgress is null', () => {
    context.hashi = null;
    methods.recordProgress.call(context);

    expect(context.$emit.mock.calls[0][0]).toBe('updateProgress');
    expect(context.$emit.mock.calls[0][1]).toBe(0.1);
  });
});
