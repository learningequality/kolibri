import { render } from '@testing-library/vue';
import { computed } from 'vue';
import CustomInteraction from '../CustomInteraction.vue';

const PERSEUS_PATH = 'perseus/q.json';
const PERSEUS_JSON = '{"question":{"content":"delegated"}}';

describe('CustomInteraction', () => {
  it('delegates a perseus custom interaction to the Perseus renderer', () => {
    const capture = {};
    const Harness = {
      components: { CustomInteraction },
      template: `<CustomInteraction
        data-type="perseus"
        data-perseus-path="${PERSEUS_PATH}"
        response-identifier="RESPONSE"
      />`,
    };
    render(Harness, {
      provide: {
        perseusItems: computed(() => ({
          [PERSEUS_PATH]: {
            perseusItemString: PERSEUS_JSON,
            packageFiles: {},
            sourceId: `qti-perseus:${PERSEUS_PATH}`,
          },
        })),
        answerState: computed(() => ({})),
        responses: computed(() => ({})),
        interactive: computed(() => true),
        handlers: { interaction: jest.fn() },
      },
      // eslint-disable-next-line kolibri/tests-no-stubs
      stubs: {
        ContentViewer: {
          name: 'ContentViewer',
          props: ['itemData', 'interactive', 'answerState', 'preset'],
          created() {
            capture.itemData = this.itemData;
          },
          template: '<div data-testid="content-viewer" />',
        },
      },
    });

    expect(capture.itemData.perseusItemString).toBe(PERSEUS_JSON);
  });

  it('raises an error for an unsupported custom-interaction data-type', () => {
    // errorCaptured returning false halts propagation; the console spy keeps
    // Vue's own log of the expected error away from jest-fail-on-console.
    const captured = [];
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const Harness = {
      components: { CustomInteraction },
      errorCaptured(error) {
        captured.push(error);
        return false;
      },
      template: `<CustomInteraction data-type="unsupported" response-identifier="RESPONSE" />`,
    };

    render(Harness);
    errorSpy.mockRestore();

    expect(captured).toHaveLength(1);
    expect(captured[0].message).toContain(
      'Unsupported qti-custom-interaction data-type: unsupported',
    );
  });
});
